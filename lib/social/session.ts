import { supabase } from '../auth/client';

/** ทุกโมดูลใต้ lib/social/* ต้องมี session จริงถึงจะเรียก Supabase ตรง ๆ ได้ (RLS อ้าง auth.uid()) */
export async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('ต้องล็อกอินก่อนใช้ฟีเจอร์นี้');
  return session.user.id;
}
