import type { ThemeColors } from './theme';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealTypeMeta {
  key: MealType;
  label: string;
  colorKey: keyof ThemeColors;
  textKey: keyof ThemeColors;
  bgKey: keyof ThemeColors;
  /** [startMinutes, endMinutes) นับจากเที่ยงคืน ใช้กับ detectMealType — snack ไม่มีช่วง (else-case) */
  window: [number, number] | null;
}

export const MEAL_TYPES: MealTypeMeta[] = [
  { key: 'breakfast', label: 'เช้า', colorKey: 'fat', textKey: 'fatText', bgKey: 'fatBg', window: [4 * 60, 10.5 * 60] },
  { key: 'lunch', label: 'กลางวัน', colorKey: 'brand', textKey: 'brand', bgKey: 'brandTint', window: [10.5 * 60, 15 * 60] },
  { key: 'dinner', label: 'เย็น', colorKey: 'dinner', textKey: 'dinner', bgKey: 'dinnerBg', window: [16.5 * 60, 22 * 60] },
  { key: 'snack', label: 'ว่าง', colorKey: 'muted', textKey: 'subtext', bgKey: 'surfaceAlt', window: null },
];

export function getMealTypeMeta(key: MealType): MealTypeMeta {
  return MEAL_TYPES.find((m) => m.key === key) ?? MEAL_TYPES[3];
}

/** เดามื้ออาหารจากเวลาปัจจุบัน ตามช่วงเวลาที่คนไทยกินจริง ผู้ใช้แก้เองได้เสมอ */
export function detectMealType(date = new Date()): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  for (const meta of MEAL_TYPES) {
    if (meta.window && minutes >= meta.window[0] && minutes < meta.window[1]) {
      return meta.key;
    }
  }
  return 'snack';
}
