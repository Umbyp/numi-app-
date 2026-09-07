export interface Env {
  OPENROUTER_KEY: string;
  APP_TOKEN: string;
  RATE_LIMIT: KVNamespace;
}

const ALLOWED_MODELS = new Set(['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5']);

const DAILY_REQUEST_CAP = 300;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 1. ตรวจ token — กันคนสุ่มเจอ URL แล้วยิงฟรี (ไม่ใช่ security ระดับสูง แค่กันของหลุดโดยไม่ตั้งใจ)
    if (req.headers.get('x-app-token') !== env.APP_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. rate limit รายวัน กันโค้ดยิง loop ทำบิลบาน
    const today = new Date().toISOString().slice(0, 10);
    const key = `req:${today}`;
    const count = parseInt((await env.RATE_LIMIT.get(key)) ?? '0', 10);
    if (count >= DAILY_REQUEST_CAP) {
      return Response.json({ error: 'ใช้ครบโควตาวันนี้แล้ว ลองใหม่พรุ่งนี้' }, { status: 429 });
    }
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 172800 });

    // 3. ตรวจ payload
    const body = (await req.json()) as any;
    if (!ALLOWED_MODELS.has(body.model)) {
      return Response.json({ error: 'model not allowed' }, { status: 400 });
    }
    body.max_tokens = Math.min(body.max_tokens ?? 2000, 4000);

    // 4. ส่งต่อไป OpenRouter — key จริงไม่เคยออกจากฝั่งนี้
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
