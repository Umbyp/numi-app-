// ตาราง MET — ค่ามาจาก Compendium of Physical Activities (2011)
// MET 1 = พลังงานที่ใช้ตอนนั่งเฉย ๆ ค่า 8 แปลว่าใช้พลังงานมากกว่านั่งเฉย 8 เท่า
// สูตรแปลงเป็นแคลอรี่อยู่ใน lib/nutrition.ts (calcKcalBurned)

export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility' | 'sport' | 'other';

export interface MetActivity {
  id: string;
  name: string;
  met: number;
  category: WorkoutCategory;
  /** กิจกรรมที่วัดระยะทางได้ จะเปิดช่องกรอกกิโลเมตรให้ */
  tracksDistance?: boolean;
}

export const MET_ACTIVITIES: MetActivity[] = [
  // --- คาร์ดิโอ ---
  { id: 'walk_slow', name: 'เดิน (4 กม./ชม.)', met: 3.0, category: 'cardio', tracksDistance: true },
  { id: 'walk_brisk', name: 'เดินเร็ว (6 กม./ชม.)', met: 5.0, category: 'cardio', tracksDistance: true },
  { id: 'stairs', name: 'เดินขึ้นบันได', met: 8.8, category: 'cardio' },
  { id: 'jog', name: 'วิ่งเหยาะ (8 กม./ชม.)', met: 8.3, category: 'cardio', tracksDistance: true },
  { id: 'run_10', name: 'วิ่ง (10 กม./ชม.)', met: 9.8, category: 'cardio', tracksDistance: true },
  { id: 'run_12', name: 'วิ่งเร็ว (12 กม./ชม.)', met: 11.8, category: 'cardio', tracksDistance: true },
  { id: 'cycle_easy', name: 'ปั่นจักรยาน สบาย ๆ', met: 4.0, category: 'cardio', tracksDistance: true },
  { id: 'cycle_mod', name: 'ปั่นจักรยาน (19-22 กม./ชม.)', met: 8.0, category: 'cardio', tracksDistance: true },
  { id: 'swim', name: 'ว่ายน้ำ ทั่วไป', met: 5.8, category: 'cardio', tracksDistance: true },
  { id: 'swim_fast', name: 'ว่ายน้ำ ฟรีสไตล์เร็ว', met: 9.8, category: 'cardio', tracksDistance: true },
  { id: 'rope', name: 'กระโดดเชือก', met: 11.0, category: 'cardio' },
  { id: 'elliptical', name: 'เครื่องเดินวงรี', met: 5.0, category: 'cardio' },
  { id: 'rowing', name: 'เครื่องพายเรือ ปานกลาง', met: 7.0, category: 'cardio', tracksDistance: true },
  { id: 'aerobic', name: 'เต้นแอโรบิก', met: 6.5, category: 'cardio' },
  { id: 'hiit', name: 'HIIT', met: 8.0, category: 'cardio' },
  { id: 'hike', name: 'เดินป่า', met: 6.0, category: 'cardio', tracksDistance: true },

  // --- เวท ---
  { id: 'weights_light', name: 'เวท เบา-ปานกลาง', met: 3.5, category: 'strength' },
  { id: 'weights_hard', name: 'เวท หนัก', met: 6.0, category: 'strength' },
  { id: 'bodyweight', name: 'บอดี้เวท', met: 3.8, category: 'strength' },

  // --- ยืดหยุ่น ---
  { id: 'yoga', name: 'โยคะ', met: 2.5, category: 'flexibility' },
  { id: 'pilates', name: 'พิลาทิส', met: 3.0, category: 'flexibility' },
  { id: 'stretch', name: 'ยืดกล้ามเนื้อ', met: 2.3, category: 'flexibility' },

  // --- กีฬา ---
  { id: 'badminton', name: 'แบดมินตัน', met: 5.5, category: 'sport' },
  { id: 'football', name: 'ฟุตบอล', met: 7.0, category: 'sport' },
  { id: 'basketball', name: 'บาสเกตบอล', met: 6.5, category: 'sport' },
  { id: 'tennis', name: 'เทนนิส', met: 7.3, category: 'sport' },
  { id: 'pingpong', name: 'ปิงปอง', met: 4.0, category: 'sport' },
  { id: 'boxing_bag', name: 'ชกกระสอบ', met: 5.5, category: 'sport' },
  { id: 'boxing_spar', name: 'มวย ซ้อมคู่', met: 7.8, category: 'sport' },
  { id: 'muaythai', name: 'มวยไทย ซ้อมทั่วไป', met: 6.5, category: 'sport' },

  { id: 'other', name: 'อื่น ๆ', met: 4.0, category: 'other' },
];

export const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  cardio: 'คาร์ดิโอ',
  strength: 'เวท',
  flexibility: 'ยืดหยุ่น',
  sport: 'กีฬา',
  other: 'อื่น ๆ',
};

export function findActivity(id: string): MetActivity | undefined {
  return MET_ACTIVITIES.find((a) => a.id === id);
}
