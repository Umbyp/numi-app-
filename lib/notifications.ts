import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * แจ้งเตือนในเครื่อง (local notification) ไม่ใช่ push จากเซิร์ฟเวอร์
 * จึงไม่ต้องมี backend ไม่ต้องมี project id และใช้ได้ใน Expo Go ทั้ง iOS และ Android
 *
 * ทั้งหมดเป็นตัวเลือกที่ปิดได้ และปิดไว้เป็นค่าเริ่มต้น
 * การเตือนซ้ำ ๆ เรื่องอาหารกดดันบางคนมากกว่าช่วย จึงไม่ควรเปิดให้เองโดยไม่ถาม
 */

export const CHANNEL_ID = 'numi-reminders';

export type ReminderKey = 'dinner' | 'weighIn';

export interface ReminderDef {
  key: ReminderKey;
  label: string;
  description: string;
  /** ตัวเลือกเวลาแบบชั่วโมงเต็ม/ครึ่ง ให้เลือก ไม่ต้องพึ่ง time picker ที่เป็น native dependency */
  timeOptions: { hour: number; minute: number }[];
  defaultTime: { hour: number; minute: number };
  title: string;
  body: string;
}

export const REMINDERS: ReminderDef[] = [
  {
    key: 'dinner',
    label: 'เตือนบันทึกมื้อเย็น',
    description: 'เตือนตอนเย็นว่ายังไม่ได้บันทึกอะไร',
    timeOptions: [
      { hour: 18, minute: 30 },
      { hour: 19, minute: 30 },
      { hour: 20, minute: 30 },
      { hour: 21, minute: 30 },
    ],
    defaultTime: { hour: 19, minute: 30 },
    title: 'บันทึกมื้อเย็นหรือยัง',
    body: 'เปิด Numi แล้วจดสิ่งที่กินวันนี้ไว้',
  },
  {
    key: 'weighIn',
    label: 'เตือนชั่งน้ำหนักตอนเช้า',
    description: 'ชั่งเวลาเดิมทุกวันทำให้เทรนด์อ่านง่ายกว่า',
    timeOptions: [
      { hour: 6, minute: 30 },
      { hour: 7, minute: 0 },
      { hour: 8, minute: 0 },
      { hour: 9, minute: 0 },
    ],
    defaultTime: { hour: 7, minute: 0 },
    title: 'ชั่งน้ำหนักตอนเช้า',
    body: 'ชั่งเวลาเดิมทุกวันจะเห็นเทรนด์ชัดกว่า',
  },
];

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getReminder(key: ReminderKey): ReminderDef {
  const found = REMINDERS.find((r) => r.key === key);
  if (!found) throw new Error(`ไม่รู้จักการเตือน: ${key}`);
  return found;
}

/** แสดงแบนเนอร์แม้แอปเปิดอยู่ ไม่งั้นเตือนตอนใช้แอปอยู่จะเงียบหาย */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android 8 ขึ้นไปต้องมี channel ก่อน ไม่งั้นแจ้งเตือนจะไม่ขึ้นเลย */
export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'การเตือนของ Numi',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

/** ยกเลิกของเดิมก่อนตั้งใหม่เสมอ กันการตั้งซ้อนจนเด้งหลายรอบ */
export async function cancelReminder(key: ReminderKey) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.reminder === key)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function scheduleReminder(key: ReminderKey, hour: number, minute: number) {
  const def = getReminder(key);
  await cancelReminder(key);
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: def.title,
      body: def.body,
      data: { reminder: key },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelAllReminders() {
  await Promise.all(REMINDERS.map((r) => cancelReminder(r.key)));
}
