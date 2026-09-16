import { useEffect, useRef, useState } from 'react';
import { chat } from '../ai/client';
import { buildSystemPrompt } from '../ai/prompt';
import { buildUserContext, type UserContext } from '../ai/context';
import { executeToolCall, needsConfirmation } from '../ai/execute';
import { VALIDATORS, validateWorkoutPlan, resolveToolName } from '../ai/validators';
import { TOOLS } from '../ai/tools';
import { getChatMessages, saveChatMessage, clearChatHistory } from '../db/queries';
import type { Message } from '../ai/types';
import { Sentry } from '../sentry';

/** แปล error ดิบให้ผู้ใช้เข้าใจสาเหตุจริง แทนข้อความเดียวที่ครอบทุกกรณี */
function chatErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === 'AI_TIMEOUT') return 'Numi ตอบช้าผิดปกติตอนนี้ ลองส่งข้อความอีกครั้งนะครับ';
  if (msg.includes('AI error 429')) return 'ตอนนี้มีคนใช้ Numi เยอะจนครบโควตาวันนี้แล้ว ลองใหม่พรุ่งนี้นะครับ';
  if (msg.includes('AI error')) return 'Numi เชื่อมต่อ AI ไม่สำเร็จตอนนี้ ลองใหม่อีกครั้งนะครับ';
  return 'ขออภัย เชื่อมต่อ AI ไม่ได้ ลองใหม่อีกครั้งนะครับ';
}

export interface PendingCard {
  id: string;
  tool: string;
  args: any;
  status: 'pending' | 'confirmed' | 'dismissed';
  photoUri?: string | null;
}

const MAX_TOOL_HOPS = 8;
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
      appendMessage({ role: 'assistant', content: chatErrorMessage(e) });
      if (__DEV__) console.error('[chat] sendMessage failed', e);
      Sentry.captureException(e);
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
    if (depth > MAX_TOOL_HOPS) {
      // Numi พยายามหลายรอบแล้วยังส่งข้อมูลไม่ผ่าน (เช่น validate แผนออกกำลังกายไม่ผ่านซ้ำๆ)
      // เดิมจะเงียบไปเฉยๆ ผู้ใช้เห็นแค่ typing indicator หายไปโดยไม่มีอะไรเกิดขึ้น
      appendMessage({
        role: 'assistant',
        content: 'ขอโทษครับ ตอนนี้ Numi สร้างคำตอบไม่สำเร็จ ลองอธิบายใหม่ให้เจาะจงขึ้น หรือลองอีกครั้งนะครับ',
      });
      Sentry.captureMessage('chat runTurn exceeded MAX_TOOL_HOPS', 'warning');
      return;
    }

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
      // เจอจริงว่าบางโมเดลเรียกชื่อ tool เพี้ยน (เช่น "ProposeWorkoutPlanDays") แล้วไม่ยอมกลับมา
      // เรียกถูกแม้บอกชื่อที่ถูกต้องไปแล้ว — เทียบชื่อแบบผ่อนปรนก่อน ไม่ต้องพึ่งให้โมเดลแก้ไขเอง
      const toolName = resolveToolName(call.function.name);
      if (!toolName) {
        const errMsg: Message = {
          role: 'tool',
          tool_call_id: call.id,
          content: `ไม่มี tool ชื่อ "${call.function.name}" เรียกได้เฉพาะชื่อนี้เท่านั้น: ${Object.keys(VALIDATORS).join(', ')} กรุณาเรียกใหม่ด้วยชื่อ tool ที่ถูกต้องเป๊ะ ๆ`,
        };
        appendMessage(errMsg);
        return runTurn([...history, reply, errMsg], ctx, depth + 1);
      }
      const validator = VALIDATORS[toolName];
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(call.function.arguments);
      } catch {
        parsedArgs = {};
      }
      // เจอจริงว่าโมเดลบางทีพยายามเรียก propose_workout_plan ทีละวัน (ส่งแค่ label/day_type/exercises
      // ของวันเดียวมาที่ระดับบนสุด) แทนที่จะห่อทุกวันไว้ใน days array ครั้งเดียวตามที่ schema ต้องการ
      // ปล่อยให้ zod ฟ้องเฉย ๆ ว่า title เป็น undefined ไม่ช่วยให้โมเดลรู้ว่าต้องแก้โครงสร้างตรงไหน
      // เลยวนซ้ำแบบเดิมไม่เลิก (เจอ 4 รอบติดในบทสนทนาจริงจนโควตาหมด) เลยดักเคสนี้แยกให้คำแนะนำตรงจุด
      if (
        toolName === 'propose_workout_plan' &&
        parsedArgs &&
        typeof parsedArgs === 'object' &&
        !('days' in parsedArgs) &&
        ('exercises' in parsedArgs || 'day_type' in parsedArgs)
      ) {
        const errMsg: Message = {
          role: 'tool',
          tool_call_id: call.id,
          content:
            'ข้อมูลไม่ถูกต้อง: คุณส่งมาแค่ข้อมูลของวันเดียว (มี label/day_type/exercises ที่ระดับบนสุด) แต่ propose_workout_plan ต้องการอาร์กิวเมนต์เป็น {title, rationale, days} โดย days คือ array ที่รวมทุกวันของแผนไว้ในการเรียกครั้งเดียว ห้ามเรียก tool นี้ทีละวัน กรุณารวมวันที่ส่งไปแล้วก่อนหน้านี้เข้ากับวันที่เหลือทั้งหมด ใส่เป็นสมาชิกของ days แล้วเพิ่ม title กับ rationale เข้าไปด้วย แล้วเรียกใหม่อีกครั้งเดียวให้ครบทุกวัน',
        };
        appendMessage(errMsg);
        return runTurn([...history, reply, errMsg], ctx, depth + 1);
      }
      const parsed = validator.safeParse(parsedArgs);
      if (!parsed.success) {
        const errMsg: Message = {
          role: 'tool',
          tool_call_id: call.id,
          content: `ข้อมูลไม่ถูกต้อง: ${parsed.error.message}. กรุณาส่งใหม่`,
        };
        appendMessage(errMsg);
        return runTurn([...history, reply, errMsg], ctx, depth + 1);
      }
      if (toolName === 'propose_workout_plan') {
        const planError = validateWorkoutPlan(parsed.data);
        if (planError) {
          const errMsg: Message = { role: 'tool', tool_call_id: call.id, content: `ข้อมูลไม่ถูกต้อง: ${planError}. กรุณาส่งใหม่` };
          appendMessage(errMsg);
          return runTurn([...history, reply, errMsg], ctx, depth + 1);
        }
      }
      let photoUri: string | null = null;
      if (toolName === 'add_meal') {
        photoUri = pendingPhotoUriRef.current;
        pendingPhotoUriRef.current = null;
      }
      setPendingCards((p) => [...p, { id: call.id, tool: toolName, args: parsed.data, status: 'pending', photoUri }]);
    }
  }

  async function confirmCard(cardId: string, editedArgs?: unknown) {
    const card = pendingCards.find((c) => c.id === cardId);
    if (!card) return;

    let result: string;
    try {
      result = await executeToolCall(card.tool, editedArgs ?? card.args, { photoUri: card.photoUri });
    } catch (e) {
      // เดิมไม่มี catch ตรงนี้เลย — ถ้าบันทึกไม่สำเร็จ (เช่น validate แผนที่แก้ไขแล้วไม่ผ่าน)
      // การ์ดจะค้างเป็น pending เงียบๆ โดยไม่มีอะไรบอกผู้ใช้เลยว่าเกิดอะไรขึ้น
      appendMessage({
        role: 'assistant',
        content: 'บันทึกไม่สำเร็จ ข้อมูลอาจไม่ครบหรือไม่ถูกต้อง ลองแก้ไขแล้วกดยืนยันอีกครั้งนะครับ',
      });
      if (__DEV__) console.error('[chat] executeToolCall failed', e);
      Sentry.captureException(e);
      return;
    }

    setPendingCards((p) => p.map((c) => (c.id === cardId ? { ...c, status: 'confirmed' } : c)));

    const toolMsg: Message = { role: 'tool', tool_call_id: cardId, content: result };
    const updated = [...messagesRef.current, toolMsg];
    appendMessage(toolMsg);
    setLoading(true);
    try {
      const ctx = await buildUserContext();
      await runTurn(updated, ctx);
    } catch (e) {
      // ข้อมูลบันทึกไปแล้ว (executeToolCall สำเร็จ) แค่ Numi ตอบต่อไม่ได้ — ข้อความต้องไม่ทำให้เข้าใจผิดว่าบันทึกไม่ติด
      appendMessage({
        role: 'assistant',
        content: 'บันทึกสำเร็จแล้ว แต่ Numi ตอบต่อไม่ได้ตอนนี้ ลองพิมพ์คุยต่อได้เลยนะครับ',
      });
      if (__DEV__) console.error('[chat] confirmCard follow-up failed', e);
      Sentry.captureException(e);
    } finally {
      setLoading(false);
    }
  }

  function dismissCard(cardId: string) {
    setPendingCards((p) => p.map((c) => (c.id === cardId ? { ...c, status: 'dismissed' } : c)));
    appendMessage({ role: 'tool', tool_call_id: cardId, content: 'ผู้ใช้ยกเลิกการบันทึกนี้' });
  }

  /**
   * ตอบคำถามแบบเลือกปุ่ม (ask_choice) — ต่างจาก confirmCard ตรงที่ไม่มีอะไรให้ executeToolCall บันทึก
   * คำตอบที่แตะเลือกคือคำพูดของผู้ใช้เอง เลยส่งกลับเป็นข้อความ user ธรรมดาต่อบทสนทนาไปเลย
   * ไม่ใช่ผลลัพธ์ tool call แบบ add_meal/propose_workout_plan
   */
  async function answerChoice(cardId: string, optionText: string) {
    setPendingCards((p) => p.map((c) => (c.id === cardId ? { ...c, status: 'confirmed' } : c)));
    await send(optionText);
  }

  async function clearHistory() {
    await clearChatHistory();
    setMessages([]);
    setPendingCards([]);
  }

  return { messages, pendingCards, loading, historyLoaded, send, sendImage, confirmCard, dismissCard, answerChoice, clearHistory };
}
