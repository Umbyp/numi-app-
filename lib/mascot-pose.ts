// ท่าของมาสคอตตามสถานะของวัน — pure function ล้วน เขียนเทสได้โดยไม่ต้องมี React
//
// ไฟล์รูป: assets/mascot-start.png, mascot-rest.png, mascot-goal.png
// ตอนนี้เป็นสำเนาของ mascot.png ไปก่อน เอาไฟล์จริงไปทับชื่อเดิมได้เลย ไม่ต้องแก้โค้ด
// (React Native ต้องใช้ require แบบ static จะเขียน path เป็นตัวแปรไม่ได้
//  จึงต้องมีไฟล์อยู่จริงตั้งแต่ตอน build)

export type MascotPose = 'idle' | 'start' | 'rest' | 'goal' | 'heart' | 'peace' | 'wave';

export interface DayState {
  /** บันทึกอาหารหรือออกกำลังกายอะไรไปแล้วหรือยังในวันนี้ */
  hasAnyLog: boolean;
  consumedKcal: number;
  targetKcal: number;
  /** กำลังพักระหว่างเซตอยู่ */
  resting?: boolean;
}

export interface MascotMood {
  pose: MascotPose;
  title: string;
  line: string;
  /** ควรเล่นแอนิเมชันฉลองไหม — จริงเฉพาะตอนเพิ่งเข้าเป้า */
  celebrate: boolean;
}

/**
 * เลือกท่าและข้อความจากสถานะ
 *
 * ตั้งใจไม่มีท่า "เสียใจ/ดุ" สำหรับกรณีกินเกินเป้า
 * ตามกติกาของโปรเจกต์ว่าห้ามใช้ภาษาตัดสินเรื่องอาหาร กินเกินเป้าจึงได้ท่าปกติ
 * กับข้อความที่บอกแค่ตัวเลข ไม่ตำหนิ ไม่สั่งให้แก้
 */
export function pickMood(s: DayState): MascotMood {
  if (s.resting) {
    return {
      pose: 'rest',
      title: 'พักสักนิด',
      line: 'ร่างกายต้องการการเติมพลังนะ',
      celebrate: false,
    };
  }

  if (!s.hasAnyLog) {
    return {
      pose: 'start',
      title: 'เริ่มทำเลย',
      line: 'เก็บแคลอรี่ไปด้วยกันนะ',
      celebrate: false,
    };
  }

  const remaining = Math.round(s.targetKcal - s.consumedKcal);
  const ratio = s.targetKcal > 0 ? s.consumedKcal / s.targetKcal : 0;

  // เข้าเป้าคือ 95-105% ของเป้าหมาย ไม่ใช่ "ถึงเป้าแล้วเลิก" ตอน 100% เป๊ะ
  // เพราะแทบไม่มีใครลงเป๊ะ และการเด้งฉลองตอน 100.0% เท่านั้นจะไม่เคยเกิดขึ้นจริง
  if (ratio >= 0.95 && ratio <= 1.05) {
    return {
      pose: 'goal',
      title: 'ถึงเป้าแล้ว',
      line: 'เก่งมากเลย ฮีโร่ของตัวเอง',
      celebrate: true,
    };
  }

  if (ratio > 1.05) {
    return {
      pose: 'idle',
      title: 'วันนี้เกินเป้าอยู่',
      line: `กินไป ${Math.round(s.consumedKcal).toLocaleString()} จากเป้า ${Math.round(s.targetKcal).toLocaleString()} kcal`,
      celebrate: false,
    };
  }

  return {
    pose: 'idle',
    title: `เหลืออีก ${remaining.toLocaleString()} kcal`,
    line: 'บันทึกต่อได้เลย เดี๋ยว Numi รวมให้',
    celebrate: false,
  };
}
