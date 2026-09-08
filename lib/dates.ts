// ตัวช่วยเรื่องวันที่ทั้งหมด — ทำงานบนสตริง YYYY-MM-DD ตาม local_date ที่เก็บใน DB
// ไม่แตะ Date object ในการบวกลบวัน เพราะ timezone ทำให้เพี้ยนได้ง่าย

import { localDateString } from './nutrition';

export { localDateString };

const TH_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const TH_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/** บวก/ลบวันบนสตริง YYYY-MM-DD โดยใช้ UTC ล้วน จึงไม่ขยับตาม timezone เครื่อง */
export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** ไล่วันจากเก่าไปใหม่ ปิดท้ายด้วย end — ใช้เป็นแกน X ของกราฟ */
export function dateAxis(days: number, end = localDateString()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

/** "8 ก.ย." */
export function formatDayShort(localDate: string): string {
  const [, m, d] = localDate.split('-').map(Number);
  return `${d} ${TH_MONTHS_SHORT[m - 1]}`;
}

/** "จ. 8 ก.ย. 2026" */
export function formatDayFull(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const wd = TH_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd} ${d} ${TH_MONTHS_SHORT[m - 1]} ${y}`;
}

/** วันนี้ / เมื่อวาน ถ้าเข้าเงื่อนไข ไม่งั้นคืนวันที่ปกติ */
export function formatDayRelative(localDate: string, today = localDateString()): string {
  if (localDate === today) return 'วันนี้';
  if (localDate === addDays(today, -1)) return 'เมื่อวาน';
  return formatDayFull(localDate);
}
