import type { Message } from './types';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL;
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN;

const MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'anthropic/claude-haiku-4.5';

export async function chat(opts: {
  messages: Message[];
  tools?: readonly unknown[];
  signal?: AbortSignal;
}): Promise<Message> {
  if (!WORKER_URL || !APP_TOKEN) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า EXPO_PUBLIC_WORKER_URL / EXPO_PUBLIC_APP_TOKEN — ดู worker/README.md เพื่อ deploy Worker ก่อน'
    );
  }

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-token': APP_TOKEN,
    },
    body: JSON.stringify({
      model: MODEL,
      models: [MODEL, FALLBACK_MODEL],
      route: 'fallback',
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tools ? 'auto' : undefined,
      max_tokens: 2000,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new Error(`AI error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices[0].message;
}
