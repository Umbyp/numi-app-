export interface Env {
  OPENROUTER_KEY: string;
  APP_TOKEN: string;
  RATE_LIMIT: KVNamespace;
  // ตั้งด้วย: npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  // (JWT role=service_role เซ็นด้วย GOTRUE_JWT_SECRET ตัวเดียวกับ backend — ห้าม commit/แชร์ ใครถือคนนี้ bypass RLS ได้หมด)
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const ALLOWED_MODELS = new Set(['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5']);

const DAILY_REQUEST_CAP = 300;

const GOTRUE_URL = 'https://numi-api.enablebrain.com/auth/v1';
// anon key — public โดยดีไซน์ (ฝังในแอปอยู่แล้ว) ใช้แค่เป็น apikey header ตอนเรียก GoTrue
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxODkzNDU2MDAwLCJleHAiOjIyMDg4MTYwMDB9.f758jL6eM-2s_IGEwKluVaesZq_joft3i2TsUCiG2eI';

async function handleDeleteAccount(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'missing bearer token' }, { status: 401 });
  }

  // ให้ GoTrue เป็นคนตรวจ token ให้เอง (แทนที่จะ verify JWT เอง) — ได้ user id ที่ token นี้เป็นเจ้าของจริงมาด้วย
  const whoRes = await fetch(`${GOTRUE_URL}/user`, {
    headers: { Authorization: authHeader, apikey: ANON_KEY },
  });
  if (!whoRes.ok) {
    return Response.json({ error: 'invalid session' }, { status: 401 });
  }
  const who = (await whoRes.json()) as { id: string };

  // ลบด้วย service_role — ตารางอื่น (profiles, community_foods, ฯลฯ) อ้าง auth.users แบบ ON DELETE CASCADE
  // อยู่แล้ว เลยลบแถวเดียวตรงนี้พอ ข้อมูลที่เหลือหายตามหมด
  const delRes = await fetch(`${GOTRUE_URL}/admin/users/${who.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (!delRes.ok) {
    return Response.json({ error: 'delete failed' }, { status: 502 });
  }
  return Response.json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 1. ตรวจ token — กันคนสุ่มเจอ URL แล้วยิงฟรี (ไม่ใช่ security ระดับสูง แค่กันของหลุดโดยไม่ตั้งใจ)
    if (req.headers.get('x-app-token') !== env.APP_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    if (url.pathname === '/delete-account') {
      return handleDeleteAccount(req, env);
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
