import { useEffect, useRef, useState } from 'react';
import { chat } from '../ai/client';
import { buildSystemPrompt } from '../ai/prompt';
import { buildUserContext, type UserContext } from '../ai/context';
import { executeToolCall, needsConfirmation } from '../ai/execute';
import { VALIDATORS } from '../ai/validators';
import { TOOLS } from '../ai/tools';
import { getChatMessages, saveChatMessage, clearChatHistory } from '../db/queries';
import type { Message } from '../ai/types';

export interface PendingCard {
  id: string;
  tool: string;
  args: any;
  status: 'pending' | 'confirmed' | 'dismissed';
  photoUri?: string | null;
}

const MAX_TOOL_HOPS = 5;
const VISION_PROMPT =
  'ดูรูปนี้แล้วบอกว่ามีอาหารอะไรบ้าง ประมาณปริมาณเป็นกรัมจากสิ่งที่เห็นในรูป แล้วค้น search_food ก่อนเสนอ add_meal เสมอ';

/** แปลงแถวจาก DB กลับเป็น Message — content อาจเป็น JSON string ของ array (ข้อความรูป) หรือ string ธรรมดา */
function rowToMessage(row: { role: string; content: string; toolCalls: unknown; toolCallId: string | null }): Message {
  let content: Message['content'] = row.content;
  try {
    const parsed = JSON.parse(row.content);
    if (Array.isArray(parsed)) content = parsed;
  } catch {
    // ไม่ใช่ JSON ก็ปล่อยเป็น string เดิม
  }
  return {
    role: row.role as Message['role'],
    content,
    tool_calls: (row.toolCalls as Message['tool_calls']) ?? undefined,
    tool_call_id: row.toolCallId ?? undefined,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  // จำรูปล่าสุดที่ส่งให้ AI ดู ไว้แนบกับ add_meal การ์ดที่เกิดขึ้นทันทีหลังจากนั้น (ถ้ามี)
  const pendingPhotoUriRef = useRef<string | null>(null);

  useEffect(() => {
    getChatMessages(100).then((rows) => {
      setMessages(rows.map(rowToMessage));
      setHistoryLoaded(true);
    });
  }, []);

  function persist(msg: Message) {
    saveChatMessage({
      role: msg.role as 'user' | 'assistant' | 'tool',
      content: msg.content,
      toolCalls: msg.tool_calls,
      toolCallId: msg.tool_call_id,
    }).catch(() => {});
  }

  function appendMessage(msg: Message) {
    setMessages((m) => [...m, msg]);
    persist(msg);
  }

  async function sendMessage(userMsg: Message) {
    const next = [...messagesRef.current, userMsg];
    appendMessage(userMsg);
    setLoading(true);
    try {
      const ctx = await buildUserContext();
      await runTurn(next, ctx);
    } catch (e) {
      appendMessage({ role: 'assistant', content: 'ขออภัย เชื่อมต่อ AI ไม่ได้ ลองใหม่อีกครั้งนะครับ' });
    } finally {
      setLoading(false);
    }
  }

  async function send(text: string) {
    await sendMessage({ role: 'user', content: text });
  }

  /** ส่งรูปอาหารให้ AI ดู (vision) — base64DataUrl คือ "data:image/jpeg;base64,...." ที่ย่อ/บีบอัดมาแล้ว */
  async function sendImage(base64DataUrl: string, caption?: string) {
    pendingPhotoUriRef.current = base64DataUrl;
    await sendMessage({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64DataUrl } },
        { type: 'text', text: caption?.trim() ? caption.trim() : VISION_PROMPT },
      ],
    });
  }

  async function runTurn(history: Message[], ctx: UserContext, depth = 0) {
    if (depth > MAX_TOOL_HOPS) return;

    const reply = await chat({
      messages: [{ role: 'system', content: buildSystemPrompt(ctx) }, ...history.slice(-15)],
      tools: TOOLS,
    });

    appendMessage(reply);
    if (!reply.tool_calls?.length) return;

    const readCalls = reply.tool_calls.filter((c) => !needsConfirmation(c.function.name));
    const writeCalls = reply.tool_calls.filter((c) => needsConfirmation(c.function.name));

    if (readCalls.length) {
      const results: Message[] = await Promise.all(
        readCalls.map(async (c) => ({
          role: 'tool' as const,
          tool_call_id: c.id,
          content: await executeToolCall(c.function.name, JSON.parse(c.function.arguments)),
        }))
      );
      const updated = [...history, reply, ...results];
      for (const r of results) appendMessage(r);
      return runTurn(updated, ctx, depth + 1);
    }

    for (const call of writeCalls) {
      const validator = VALIDATORS[call.function.name as keyof typeof VALIDATORS];
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(call.function.arguments);
      } catch {
        parsedArgs = {};
      }
      const parsed = validator?.safeParse(parsedArgs);
      if (!parsed?.success) {
        const errMsg: Message = {
          role: 'tool',
          tool_call_id: call.id,
          content: `ข้อมูลไม่ถูกต้อง: ${parsed?.error.message}. กรุณาส่งใหม่`,
        };
        appendMessage(errMsg);
        return runTurn([...history, reply, errMsg], ctx, depth + 1);
      }
      let photoUri: string | null = null;
      if (call.function.name === 'add_meal') {
        photoUri = pendingPhotoUriRef.current;
        pendingPhotoUriRef.current = null;
      }
      setPendingCards((p) => [...p, { id: call.id, tool: call.function.name, args: parsed.data, status: 'pending', photoUri }]);
    }
  }

  async function confirmCard(cardId: string, editedArgs?: unknown) {
    const card = pendingCards.find((c) => c.id === cardId);
    if (!card) return;

    const result = await executeToolCall(card.tool, editedArgs ?? card.args, { photoUri: card.photoUri });
    setPendingCards((p) => p.map((c) => (c.id === cardId ? { ...c, status: 'confirmed' } : c)));

    const toolMsg: Message = { role: 'tool', tool_call_id: cardId, content: result };
    const updated = [...messagesRef.current, toolMsg];
    appendMessage(toolMsg);
    setLoading(true);
    try {
      const ctx = await buildUserContext();
      await runTurn(updated, ctx);
    } finally {
      setLoading(false);
    }
  }

  function dismissCard(cardId: string) {
    setPendingCards((p) => p.map((c) => (c.id === cardId ? { ...c, status: 'dismissed' } : c)));
    appendMessage({ role: 'tool', tool_call_id: cardId, content: 'ผู้ใช้ยกเลิกการบันทึกนี้' });
  }

  async function clearHistory() {
    await clearChatHistory();
    setMessages([]);
    setPendingCards([]);
  }

  return { messages, pendingCards, loading, historyLoaded, send, sendImage, confirmCard, dismissCard, clearHistory };
}
