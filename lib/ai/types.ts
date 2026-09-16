export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface Message {
  role: Role;
  /** ปกติเป็น string ธรรมดา — เป็น array ตอนแนบรูป (vision) เท่านั้น — เป็น null ได้เวลาโมเดลตอบด้วย tool_calls ล้วน ไม่มีข้อความ */
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** ดึงส่วนข้อความล้วนจาก content ไม่ว่าจะเป็น string, array แบบ multimodal, หรือ null */
export function textOf(content: Message['content']): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

export function imageOf(content: Message['content']): string | null {
  if (content == null || typeof content === 'string') return null;
  const part = content.find((p): p is { type: 'image_url'; image_url: { url: string } } => p.type === 'image_url');
  return part?.image_url.url ?? null;
}

/**
 * เผื่อโมเดลไม่เชื่อฟังกฎ "ห้ามใช้ Markdown" ใน system prompt (เกิดขึ้นได้เสมอ) —
 * ลบสัญลักษณ์ markdown ทั่วไปทิ้งก่อนแสดงผล เพราะ ChatBubble render เป็นข้อความธรรมดา
 * ไม่มี markdown renderer ถ้าไม่ทำแบบนี้ผู้ใช้จะเห็น ** และ * ลอย ๆ อ่านไม่รู้เรื่อง
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*[*+-][ \t]+/gm, '- ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}
