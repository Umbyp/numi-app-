import { useCallback, useEffect, useState } from 'react';
import { chat, AiNotConfiguredError, AiRequestError } from '../ai/client';
import { buildUserContext } from '../ai/context';
import { buildSystemPrompt } from '../ai/prompt';
import { executeToolCall } from '../ai/execute';
import { TOOLS, needsConfirmation } from '../ai/tools';
import { VALIDATORS, describeIssues } from '../ai/validators';
import { HISTORY_LIMIT, MAX_TURN_DEPTH } from '../ai/config';
import {
  saveChatMessage,
  getRecentChatMessages,
  updateChatCardStatus,
  clearChatMessages,
} from '../db/queries';
import { useNumiStore } from '../store';
import type { Message, PendingCard, ToolCall } from '../ai/types';

export interface Bubble {
  key: string;
  kind: 'text' | 'card';
  role?: 'user' | 'assistant';
  content?: string;
  card?: PendingCard;
}

interface Card extends PendingCard {
  /** การ์ดที่โหลดกลับมาจากฐานข้อมูลจะไม่มีบทสนทนารองรับอยู่ในหน่วยความจำแล้ว */
  live: boolean;
}

export function useChat() {
  const refresh = useNumiStore((s) => s.refresh);

  const [messages, setMessages] = useState<Message[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // โหลดบทสนทนาเก่ามาแสดง แต่ไม่เอาเข้า messages ที่ส่งให้ AI
  // เพราะ tool_call กับ tool result ต้องจับคู่กันครบ ไม่งั้น API ปฏิเสธทั้งคำขอ
  useEffect(() => {
    (async () => {
      const rows = await getRecentChatMessages();
      const restoredBubbles: Bubble[] = [];
      const restoredCards: Card[] = [];

      for (const r of rows) {
        if (r.cardStatus && r.toolCallId) {
          const calls = (r.toolCalls ?? []) as ToolCall[];
          const call = calls[0];
          if (!call) continue;
          let args: unknown = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            continue;
          }
          const card: Card = {
            id: r.toolCallId,
            tool: call.function.name,
            args,
            status: r.cardStatus,
            live: false,
          };
          restoredCards.push(card);
          restoredBubbles.push({ key: r.id, kind: 'card', card });
          continue;
        }
        if (r.role === 'user' || r.role === 'assistant') {
          if (!r.content.trim()) continue;
          restoredBubbles.push({
            key: r.id,
            kind: 'text',
            role: r.role,
            content: r.content,
          });
        }
      }

      setBubbles(restoredBubbles);
      setCards(restoredCards);
    })();
  }, []);

  const pushText = useCallback((role: 'user' | 'assistant', content: string) => {
    setBubbles((b) => [
      ...b,
      { key: `${role}_${Date.now()}_${b.length}`, kind: 'text', role, content },
    ]);
  }, []);

  /**
   * หนึ่งรอบของบทสนทนา
   * read tool รันทันทีแล้ววนกลับไปให้ AI คิดต่อ ส่วน write tool ค้างไว้เป็นการ์ดรอผู้ใช้กด
   */
  const runTurn = useCallback(
    async (history: Message[], depth = 0): Promise<void> => {
      if (depth > MAX_TURN_DEPTH) return;

      const ctx = await buildUserContext();
      const reply = await chat({
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx) },
          ...history.slice(-HISTORY_LIMIT),
        ],
        tools: TOOLS,
      });

      const withReply = [...history, reply];
      setMessages(withReply);

      if (reply.content && reply.content.trim()) {
        pushText('assistant', reply.content);
        await saveChatMessage({ role: 'assistant', content: reply.content });
      }

      const calls = reply.tool_calls ?? [];
      if (calls.length === 0) return;

      const readCalls = calls.filter((c) => !needsConfirmation(c.function.name));
      const writeCalls = calls.filter((c) => needsConfirmation(c.function.name));

      const toolResults: Message[] = [];

      for (const call of readCalls) {
        let content: string;
        try {
          content = await executeToolCall(call.function.name, JSON.parse(call.function.arguments));
        } catch (e) {
          content = `เรียก ${call.function.name} ไม่สำเร็จ: ${(e as Error).message}`;
        }
        toolResults.push({ role: 'tool', tool_call_id: call.id, content });
      }

      for (const call of writeCalls) {
        const validator = VALIDATORS[call.function.name as keyof typeof VALIDATORS];
        let parsedArgs: unknown;
        try {
          parsedArgs = JSON.parse(call.function.arguments);
        } catch {
          toolResults.push({
            role: 'tool',
            tool_call_id: call.id,
            content: 'arguments ไม่ใช่ JSON ที่ถูกต้อง กรุณาส่งใหม่',
          });
          continue;
        }

        const result = validator?.safeParse(parsedArgs);
        if (!result?.success) {
          // ส่ง error กลับให้ AI แก้เอง ดีกว่าเงียบหายแล้วผู้ใช้งง
          const detail = result ? describeIssues(result.error) : 'ไม่รู้จัก tool นี้';
          toolResults.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `ข้อมูลไม่ผ่านการตรวจสอบ: ${detail} กรุณาส่งใหม่ให้ถูกต้อง`,
          });
          continue;
        }

        const card: Card = {
          id: call.id,
          tool: call.function.name,
          args: result.data,
          status: 'pending',
          live: true,
        };
        setCards((c) => [...c, card]);
        setBubbles((b) => [...b, { key: call.id, kind: 'card', card }]);
        await saveChatMessage({
          role: 'assistant',
          content: '',
          toolCalls: [call],
          toolCallId: call.id,
          cardStatus: 'pending',
        });
      }

      // มีผลจาก read tool หรือมี error ที่ต้องให้ AI แก้ ก็วนต่ออีกรอบ
      if (toolResults.length > 0) {
        const updated = [...withReply, ...toolResults];
        setMessages(updated);
        return runTurn(updated, depth + 1);
      }
    },
    [pushText]
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      pushText('user', trimmed);
      await saveChatMessage({ role: 'user', content: trimmed });

      const userMsg: Message = { role: 'user', content: trimmed };
      const next = [...messages, userMsg];
      setMessages(next);

      try {
        await runTurn(next);
      } catch (e) {
        if (e instanceof AiNotConfiguredError) {
          setError('ยังไม่ได้ตั้งค่า Worker สำหรับ AI — ดูวิธีตั้งค่าใน worker/README.md');
        } else if (e instanceof AiRequestError) {
          setError(
            e.status === 429
              ? 'ใช้โควตาของวันนี้ครบแล้ว ลองใหม่พรุ่งนี้'
              : `เชื่อมต่อ AI ไม่สำเร็จ (${e.status})`
          );
        } else {
          setError('เชื่อมต่อ AI ไม่สำเร็จ ลองใหม่อีกครั้ง');
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pushText, runTurn]
  );

  const updateCardArgs = useCallback((cardId: string, args: unknown) => {
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, args } : c)));
    setBubbles((bs) =>
      bs.map((b) =>
        b.kind === 'card' && b.card?.id === cardId
          ? { ...b, card: { ...(b.card as Card), args } }
          : b
      )
    );
  }, []);

  const setCardState = useCallback(
    (cardId: string, patch: Partial<Card>) => {
      setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
      setBubbles((bs) =>
        bs.map((b) =>
          b.kind === 'card' && b.card?.id === cardId
            ? { ...b, card: { ...(b.card as Card), ...patch } }
            : b
        )
      );
    },
    []
  );

  const confirmCard = useCallback(
    async (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.status !== 'pending') return;

      setLoading(true);
      setError(null);
      try {
        const result = await executeToolCall(card.tool, card.args);
        setCardState(cardId, { status: 'confirmed', result });
        await updateChatCardStatus(cardId, 'confirmed');
        await refresh();

        // การ์ดที่โหลดกลับมาจาก DB ไม่มี tool_call คู่กันในบทสนทนาแล้ว
        // ส่งผลกลับไปจะทำให้ API ปฏิเสธทั้งคำขอ จึงจบแค่บันทึกอย่างเดียว
        if (card.live) {
          const updated: Message[] = [
            ...messages,
            { role: 'tool', tool_call_id: cardId, content: result },
          ];
          setMessages(updated);
          await runTurn(updated);
        }
      } catch (e) {
        setError(`บันทึกไม่สำเร็จ: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    },
    [cards, messages, refresh, runTurn, setCardState]
  );

  const dismissCard = useCallback(
    async (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.status !== 'pending') return;
      setCardState(cardId, { status: 'dismissed' });
      await updateChatCardStatus(cardId, 'dismissed');
      if (card.live) {
        setMessages((m) => [
          ...m,
          { role: 'tool', tool_call_id: cardId, content: 'ผู้ใช้ยกเลิกการบันทึกนี้' },
        ]);
      }
    },
    [cards, setCardState]
  );

  const clear = useCallback(async () => {
    await clearChatMessages();
    setMessages([]);
    setBubbles([]);
    setCards([]);
    setError(null);
  }, []);

  return {
    bubbles,
    loading,
    error,
    send,
    confirmCard,
    dismissCard,
    updateCardArgs,
    clear,
  };
}
