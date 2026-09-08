import { WORKER_URL, APP_TOKEN, DEFAULT_MODEL, FALLBACK_MODELS, isAiConfigured } from './config';
import type { Message } from './types';

export class AiNotConfiguredError extends Error {
  constructor() {
    super('ยังไม่ได้ตั้งค่า Worker สำหรับ AI');
    this.name = 'AiNotConfiguredError';
  }
}

export class AiRequestError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'AiRequestError';
    this.status = status;
  }
}

interface ChatOptions {
  messages: Message[];
  tools?: unknown;
  model?: string;
  signal?: AbortSignal;
}

/** ยิงไปที่ Worker ของเราเอง ไม่ได้ยิงตรงไป OpenRouter */
export async function chat(opts: ChatOptions): Promise<Message> {
  if (!isAiConfigured()) throw new AiNotConfiguredError();

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-token': APP_TOKEN,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      models: FALLBACK_MODELS,
      route: 'fallback',
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tools ? 'auto' : undefined,
      max_tokens: 2000,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiRequestError(res.status, text.slice(0, 300));
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  if (!message) {
    throw new AiRequestError(200, 'คำตอบจาก AI ไม่มีข้อความกลับมา');
  }
  return message as Message;
}
