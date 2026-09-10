import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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
    // ไม่มีหน้าเว็บ callback ต้อง detect จาก URL — แอปนี้ใช้ email+password ล้วน
    detectSessionInUrl: false,
  },
});
