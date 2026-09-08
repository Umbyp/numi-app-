// ชนิดข้อมูลของ chat ตามรูปแบบ OpenAI-compatible ที่ OpenRouter ใช้

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Message {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type CardStatus = 'pending' | 'confirmed' | 'dismissed';

export interface PendingCard {
  /** ใช้ tool_call_id เป็น id เพื่อส่งผลกลับเข้าบทสนทนาได้ถูกคู่ */
  id: string;
  tool: string;
  args: unknown;
  status: CardStatus;
  /** ข้อความผลลัพธ์หลังกดยืนยัน ใช้แสดงบนการ์ดที่บันทึกแล้ว */
  result?: string;
}
