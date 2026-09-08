import type { TextStyle } from 'react-native';

export type FontWeight = 400 | 500 | 600 | 700 | 800;

const FAMILY: Record<FontWeight, string> = {
  400: 'NotoSansThai_400Regular',
  500: 'NotoSansThai_500Medium',
  600: 'NotoSansThai_600SemiBold',
  700: 'NotoSansThai_700Bold',
  800: 'NotoSansThai_800ExtraBold',
};

/**
 * ชื่อ font family ตาม weight ที่โหลดจริง — RN ต้องอ้างชื่อ family ต่อ weight ตรง ๆ
 * ใช้ fontWeight ตัวเลขคู่กับ family เดียวจะเรนเดอร์ผิด weight บน custom font
 */
export function fontFamily(weight: FontWeight): string {
  return FAMILY[weight];
}

export const FONT_WEIGHTS = Object.values(FAMILY);

// พรีเซ็ตตาม type scale ของ Numi Design System
// หมายเหตุ: ตั้งใจไม่ใส่ lineHeight ตายตัว — ค่าที่คัดลอกมาจากไฟล์ดีไซน์ (เช่น "metric 38/42")
// คำนวณมาสำหรับเว็บซึ่งไม่ clip ตาม vertical metrics ของฟอนต์ แต่ Noto Sans Thai มี ascent/descent
// สูงมาก (ต้องเผื่อที่ให้สระ/วรรณยุกต์ไทย) ยิ่งหลายจุดในแอปยังเซ็ต fontSize ทับ preset โดยไม่ปรับ
// lineHeight ตาม ยิ่งเสี่ยง clip ตัวเลข/ตัวอักษรน้ำหนัก ExtraBold จนดู "แหว่ง" — ปล่อยให้ RN คำนวณ
// line height จาก metrics ของฟอนต์เองปลอดภัยที่สุด ไม่ว่า fontSize ปลายทางจะถูกเปลี่ยนเป็นเท่าไหร่
export const type = {
  metric: { fontFamily: fontFamily(800), fontSize: 38, letterSpacing: -0.5 } satisfies TextStyle,
  ringCenter: { fontFamily: fontFamily(800), fontSize: 26, letterSpacing: -0.3 } satisfies TextStyle,
  greeting: { fontFamily: fontFamily(800), fontSize: 21, letterSpacing: -0.2 } satisfies TextStyle,
  cardTitle: { fontFamily: fontFamily(800), fontSize: 17, letterSpacing: -0.1 } satisfies TextStyle,
  row: { fontFamily: fontFamily(700), fontSize: 14 } satisfies TextStyle,
  label: { fontFamily: fontFamily(600), fontSize: 12 } satisfies TextStyle,
  badge: { fontFamily: fontFamily(700), fontSize: 10 } satisfies TextStyle,
  body: { fontFamily: fontFamily(500), fontSize: 15 } satisfies TextStyle,
};
