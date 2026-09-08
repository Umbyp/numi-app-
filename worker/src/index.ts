/**
 * Numi Worker — proxy ไป OpenRouter
 *
 * หน้าที่มีแค่สองอย่าง: ซ่อน API key และกันบิลบานปลาย
 * ไม่มี business logic อะไรทั้งสิ้น logic อยู่ในแอปหมด
 *
 * เหตุผลที่ต้องมีทั้งที่เป็นแอปใช้คนเดียว: JS bundle ของ React Native แตกออกมาอ่านได้
 * ถ้าฝัง key ไว้ในแอปแล้วเผลอ push ขึ้น GitHub บอตจะเจอภายในไม่กี่นาที
 */

export interface Env {
  OPENROUTER_KEY: string;
  APP_TOKEN: string;
  RATE_LIMIT: KVNamespace;
}

const ALLOWED_MODELS = new Set([
  'anthropic/claude-sonnet-4.5',
  'google/gemini-2.5-flash',
]);

const DAILY_REQUEST_CAP = 300;
const MAX_TOKENS_CAP = 4000;
const MAX_BODY_BYTES = 1_000_000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** เทียบแบบใช้เวลาคงที่ กันการเดา token ทีละตัวอักษรจากเวลาที่ตอบกลับ */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405);
    }

    const token = req.headers.get('x-app-token') ?? '';
    if (!env.APP_TOKEN || !safeEqual(token, env.APP_TOKEN)) {
      return json({ error: 'unauthorized' }, 401);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: 'payload too large' }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'invalid json' }, 400);
    }

    // ตรวจโมเดลทั้งตัวหลักและตัว fallback กันการยิงโมเดลแพงที่ไม่ได้ตั้งใจ
    const requested = [body.model, ...((body.models as string[]) ?? [])].filter(
      (m): m is string => typeof m === 'string'
    );
    if (requested.length === 0 || requested.some((m) => !ALLOWED_MODELS.has(m))) {
      return json({ error: 'model not allowed' }, 400);
    }

    // โควตารายวัน กันโค้ดที่เขียนผิดยิงเป็น loop จนบิลบาน
    const today = new Date().toISOString().slice(0, 10);
    const key = `req:${today}`;
    const used = parseInt((await env.RATE_LIMIT.get(key)) ?? '0', 10);
    if (used >= DAILY_REQUEST_CAP) {
      return json({ error: 'ใช้ครบโควตาของวันนี้แล้ว ลองใหม่พรุ่งนี้' }, 429);
    }
    await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 172_800 });

    const maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : 2000;
    body.max_tokens = Math.min(maxTokens, MAX_TOKENS_CAP);

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://numi.local',
        'X-Title': 'Numi',
      },
      body: JSON.stringify(body),
    });

    if (body.stream) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
