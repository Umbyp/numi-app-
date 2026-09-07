export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility' | 'sport' | 'other';

export interface MetEntry {
  key: string;
  name: string;
  met: number;
  category: WorkoutCategory;
}

// ค่าอ้างอิงจาก Compendium of Physical Activities — คลาดเคลื่อน ±20-30% เป็นเรื่องปกติ
export const MET_TABLE: MetEntry[] = [
  { key: 'walk_slow', name: 'เดินช้า (3 km/h)', met: 2.5, category: 'cardio' },
  { key: 'walk_brisk', name: 'เดินเร็ว (5.5 km/h)', met: 4.3, category: 'cardio' },
  { key: 'run_8', name: 'วิ่ง (8 km/h)', met: 8.3, category: 'cardio' },
  { key: 'run_10', name: 'วิ่ง (10 km/h)', met: 9.8, category: 'cardio' },
  { key: 'run_12', name: 'วิ่ง (12 km/h)', met: 11.8, category: 'cardio' },
  { key: 'cycle_light', name: 'ปั่นจักรยานเบา', met: 4.0, category: 'cardio' },
  { key: 'cycle_moderate', name: 'ปั่นจักรยานปานกลาง', met: 8.0, category: 'cardio' },
  { key: 'swim_moderate', name: 'ว่ายน้ำปานกลาง', met: 5.8, category: 'cardio' },
  { key: 'hiit', name: 'HIIT', met: 8.0, category: 'cardio' },
  { key: 'weights_light', name: 'เวทเทรนนิ่งเบา', met: 3.5, category: 'strength' },
  { key: 'weights_heavy', name: 'เวทเทรนนิ่งหนัก', met: 6.0, category: 'strength' },
  { key: 'bodyweight', name: 'บอดี้เวท / คาลิสเธนิกส์', met: 3.8, category: 'strength' },
  { key: 'yoga', name: 'โยคะ', met: 2.5, category: 'flexibility' },
  { key: 'stretching', name: 'ยืดเหยียด', met: 2.3, category: 'flexibility' },
  { key: 'badminton', name: 'แบดมินตัน', met: 5.5, category: 'sport' },
  { key: 'football', name: 'ฟุตบอล', met: 7.0, category: 'sport' },
  { key: 'basketball', name: 'บาสเกตบอล', met: 6.5, category: 'sport' },
  { key: 'muaythai', name: 'มวยไทย', met: 9.0, category: 'sport' },
  { key: 'housework', name: 'ทำงานบ้าน', met: 3.0, category: 'other' },
];

export const WORKOUT_CATEGORIES: { key: WorkoutCategory; label: string }[] = [
  { key: 'cardio', label: 'คาร์ดิโอ' },
  { key: 'strength', label: 'เวท' },
  { key: 'flexibility', label: 'ยืดหยุ่น' },
  { key: 'sport', label: 'กีฬา' },
  { key: 'other', label: 'อื่น ๆ' },
];

export function metsByCategory(category: WorkoutCategory): MetEntry[] {
  return MET_TABLE.filter((m) => m.category === category);
}

export function getMetEntry(key: string): MetEntry | undefined {
  return MET_TABLE.find((m) => m.key === key);
}
