import type { Message } from './types';
import { getClientId } from './client-id';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL;
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN;

const MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'anthropic/claude-haiku-4.5';

// กัน request ค้างไม่รู้จบตอนเน็ตมีปัญหา — ไม่งั้น UI จะโชว์ typing indicator ค้างตลอดไป
const REQUEST_TIMEOUT_MS = 30000;

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());
  // เผื่ออ่าน client id ไม่สำเร็จ (เช่น AsyncStorage มีปัญหา) ก็ยังส่ง request ได้ แค่ไปตกโควตารวม
  const clientId = await getClientId().catch(() => 'anon-unknown');

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-token': APP_TOKEN,
        'x-client-id': clientId,
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
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`AI error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.choices[0].message;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('AI_TIMEOUT');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
