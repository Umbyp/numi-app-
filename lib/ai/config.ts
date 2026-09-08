// ค่าตั้งของการต่อ AI — อ่านจาก EXPO_PUBLIC_* ซึ่ง Expo ฝังลง bundle ตอน build
//
// APP_TOKEN อยู่ใน bundle จริง แต่สิ่งที่หลุดคือ token ของ Worker ตัวเอง
// ไม่ใช่ API key ของ OpenRouter ถ้าหลุดก็แค่ rotate ใหม่ และ Worker มี rate limit คุมอยู่
// ห้ามเอา OPENROUTER key มาไว้ฝั่งแอปเด็ดขาด

export const WORKER_URL = process.env.EXPO_PUBLIC_NUMI_WORKER_URL ?? '';
export const APP_TOKEN = process.env.EXPO_PUBLIC_NUMI_APP_TOKEN ?? '';

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
export const FALLBACK_MODELS = ['anthropic/claude-sonnet-4.5', 'google/gemini-2.5-flash'];

/** ส่งประวัติย้อนหลังแค่เท่านี้ กัน token บานปลาย */
export const HISTORY_LIMIT = 15;

/** กัน AI วนเรียก read tool ไม่รู้จบ */
export const MAX_TURN_DEPTH = 5;

export function isAiConfigured(): boolean {
  return WORKER_URL.length > 0 && APP_TOKEN.length > 0;
}
