import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../auth/client';

const DEVICE_ID_KEY = 'numi_device_id';

function randomId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * ตัวระบุที่ส่งให้ Worker ไว้จำกัดโควตาแชท AI "ต่อคน" แทนที่จะเป็นโควตารวมทั้งแอป
 * ล็อกอินอยู่ใช้ user id จริง ยังไม่ล็อกอินก็สุ่ม device id ครั้งเดียวแล้วเก็บไว้ในเครื่อง
 */
export async function getClientId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return `user:${session.user.id}`;

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return `device:${existing}`;

  const id = randomId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return `device:${id}`;
}
