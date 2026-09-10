import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

// numi-api.enablebrain.com ทำ path routing เอง (แทน Kong): /auth/v1/* -> GoTrue, /rest/v1/* -> PostgREST
// ตรงกับ path ที่ supabase-js เรียกพอดี จึงต่อ backend self-host ตัวนี้ได้เหมือนต่อ Supabase ปกติ
const SUPABASE_URL = 'https://numi-api.enablebrain.com';

// anon key เป็น public key ตามธรรมเนียมของ Supabase (ฝัง client ได้ปกติ) — RLS เป็นตัวกันสิทธิ์จริง
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxODkzNDU2MDAwLCJleHAiOjIyMDg4MTYwMDB9.f758jL6eM-2s_IGEwKluVaesZq_joft3i2TsUCiG2eI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // AsyncStorage เฉพาะ native — บนเว็บปล่อยให้ supabase-js ใช้ window.localStorage ของมันเอง
    // (AsyncStorage เวอร์ชันเว็บ ทำให้ GoTrueClient พังตอน signUp ด้วย "Cannot read properties of
    // undefined (reading 'storage')" ทดสอบแล้วบน Expo SDK 57 + supabase-js — ไม่รู้ root cause แน่ชัด
    // แต่สลับมาใช้ localStorage ของ browser บนเว็บแก้ได้จริง)
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // false เพราะฝั่ง native จับ session จาก URL ของตัวเอง (ดู signInWithGoogle) ไม่ใช่จาก
    // window.location — เว็บใช้ redirect ปกติของ browser ซึ่ง supabase-js จัดการเองอยู่แล้วตอนโหลดหน้า
    detectSessionInUrl: false,
  },
});

/**
 * Google Sign-In ผ่าน GoTrue OAuth — ต้องตั้งค่าฝั่งเซิร์ฟเวอร์ก่อนถึงจะใช้งานได้จริง
 * (GOTRUE_EXTERNAL_GOOGLE_ENABLED/CLIENT_ID/SECRET ใน ~/NaselerProject/numi/docker-compose.yml
 * บน server + Client ID/Secret จาก Google Cloud Console — ดูรายละเอียดใน docs/sync-design.md)
 *
 * native: เปิด system browser ด้วย expo-web-browser แล้วจับ redirect กลับผ่าน custom scheme
 * (numi://auth-callback ตาม app.json scheme) ไม่ใช้ detectSessionInUrl เพราะนั่นใช้ได้แค่เว็บ
 */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('ไม่ได้ URL สำหรับเปิด Google OAuth');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') return { cancelled: true };
    throw new Error('เปิดหน้า Google Sign-In ไม่สำเร็จ');
  }

  const fragment = result.url.split('#')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    const errorDescription = params.get('error_description');
    throw new Error(errorDescription || 'ไม่ได้ token กลับมาจาก Google');
  }
  const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (setSessionError) throw setSessionError;
  return { cancelled: false };
}
