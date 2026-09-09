import { Platform } from 'react-native';

// Token สีจาก Numi Design System — ห้าม hardcode สีในคอมโพเนนต์ เพราะแอปนี้ถูกเปิดตอนกลางคืนบ่อย
export const colors = {
  light: {
    bg: '#E4EFFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F9FC',
    text: '#16233D',
    subtext: '#5C6C85',
    muted: '#8593A8',
    faint: '#A6B1C2',
    line: '#EDF1F7',
    border: '#EDF1F7',
    brand: '#2E7DF7',
    brandTint: '#EAF2FE',
    protein: '#F2545B',
    proteinBg: 'rgba(242,84,91,0.12)',
    proteinText: '#CE454C',
    // คาร์บต้องไม่ใช่สีเดียวกับ brand ไม่งั้นแถบข้อมูลกับปุ่มที่กดได้จะแยกไม่ออก
    carb: '#12A594',
    carbBg: 'rgba(18,165,148,0.12)',
    carbText: '#0E8577',
    fat: '#F5B93C',
    fatBg: 'rgba(245,185,60,0.18)',
    fatText: '#B3801F',
    dinner: '#6B4FCF',
    dinnerBg: '#EDE9FB',
    danger: '#F2545B',
    dangerBg: '#FDEEEF',
    // legacy aliases used by components not yet migrated
    card: '#FFFFFF',
    primary: '#2E7DF7',
    ringTrack: '#EDF1F7',
    ringActive: '#2E7DF7',
    ringOver: '#8593A8',
    ghostBg: '#F7F9FC',
  },
  dark: {
    bg: '#0D1421',
    surface: '#18223A',
    surfaceAlt: '#1D2740',
    text: '#E9EFF9',
    subtext: '#A4B3C9',
    muted: '#7E8EA8',
    faint: '#5F6E88',
    line: '#232F4B',
    border: '#232F4B',
    brand: '#5C9BFF',
    brandTint: '#18223A',
    protein: '#FF6B72',
    proteinBg: 'rgba(255,107,114,0.18)',
    proteinText: '#FF8B91',
    carb: '#2DD4BF',
    carbBg: 'rgba(45,212,191,0.18)',
    carbText: '#5EEAD4',
    fat: '#FFC85C',
    fatBg: 'rgba(255,200,92,0.18)',
    fatText: '#FFD180',
    dinner: '#A08CF0',
    dinnerBg: '#2A2545',
    danger: '#FF6B72',
    dangerBg: '#3A2530',
    // legacy aliases used by components not yet migrated
    card: '#18223A',
    primary: '#5C9BFF',
    ringTrack: '#232F4B',
    ringActive: '#5C9BFF',
    ringOver: '#7E8EA8',
    ghostBg: '#1D2740',
  },
} as const;

export type ThemeColors = typeof colors.light;
export type Scheme = 'light' | 'dark';

// radius scale: badge 9 · pill 16/18 · row 18 · icon box 13/14 · card 26 · FAB 30 · phone/screen 44
export const radius = {
  badge: 9,
  pill: 18,
  row: 18,
  iconBox: 14,
  /** การ์ดที่ซ้อนอยู่ในการ์ด — เดิมกระจายเป็น radius.card - 6 / - 8 คิดเลขหน้างานจนไม่ตรงกันข้ามหน้า */
  cardInner: 18,
  card: 26,
  fab: 30,
} as const;

/** เป้ากดขั้นต่ำตามเกณฑ์ iOS (44) และ Android (48) — ใช้กับปุ่มไอคอนทุกตัว */
export const MIN_TOUCH = 44;

// spacing scale 4 · 6 · 8 · 12 · 16 · 24 · 32
export const space = [4, 6, 8, 12, 16, 24, 32] as const;

/**
 * Token ของจังหวะการเคลื่อนไหว — ครึ่งที่หายไปของ design system
 *
 * ก่อนมีไฟล์นี้ ทุก animation คิดเลขเอง: fade-in ใช้ 220ms, calorie-ring 600ms,
 * mascot-greeting 260ms, แก้วน้ำ 520ms — ไม่มีใครคุยกัน แอปจึงรู้สึกเหมือน
 * หลายแอปเย็บติดกัน ความน่ารักในระบบดีไซน์มาจากจังหวะที่สม่ำเสมอ ไม่ใช่การเด้งเยอะ
 *
 * ใช้กับ useNativeDriver ได้ทั้งหมด เพราะเป็นแค่ตัวเลข ไม่ผูกกับ property
 */
export const motion = {
  duration: {
    /** ตอบสนองนิ้วทันที — เกินนี้คนจะรู้สึกว่าปุ่มหน่วง */
    press: 90,
    /** เปลี่ยนสถานะเล็ก ๆ เช่นสลับแท็บ ติ๊กถูก */
    quick: 180,
    /** ค่ากลางที่ควรใช้เป็นค่าเริ่มต้นถ้าไม่มีเหตุผลอื่น */
    base: 260,
    /** ของที่ต้องให้ตาไล่ทัน เช่นระดับน้ำในแก้ว วงแหวนแคลอรี่ */
    slow: 520,
    /** จังหวะเต้นช้า ๆ ของของที่ยังไม่พร้อม เช่น skeleton หรือลมหายใจ */
    breath: 750,
    /** ลูปพื้นหลังที่ไม่ได้เรียกร้องความสนใจ เช่นคลื่นน้ำ */
    ambient: 3200,
  },
  spring: {
    /** ยุบตอนนิ้วแตะ — ไวและไม่เด้ง ถ้าเด้งตรงนี้จะรู้สึกว่าปุ่มลื่นหลุดมือ */
    press: { friction: 9, tension: 320 },
    /** เด้งกลับตอนปล่อยนิ้ว — เด้งเกินนิดหน่อยคือสิ่งที่ทำให้รู้สึกมีชีวิต */
    pop: { friction: 5.5, tension: 260 },
    /** ฉลองตอนถึงเป้า — เด้งแรงและนานกว่าปกติ ใช้ให้น้อยจะได้ยังพิเศษอยู่ */
    celebrate: { friction: 4, tension: 90 },
  },
  /** หน่วงต่อชิ้นตอนไล่ไอเทมในลิสต์ให้โผล่ทีละอัน */
  stagger: 40,
} as const;

/**
 * เงาแบบ light mode เท่านั้น — dark mode ไม่ใช้เงา ใช้ surface สว่างกว่า bg + ขอบ 1px แทน
 * (ดู c.border ใน component แทนตอน scheme = dark)
 */
export function cardShadow(scheme: Scheme, tintColor = '#16233D') {
  if (scheme === 'dark') return {};
  return Platform.select({
    ios: {
      shadowColor: tintColor,
      shadowOpacity: 0.13,
      shadowRadius: 17,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 6 },
    default: {},
  });
}

export function pillShadow(scheme: Scheme, tintColor = '#16233D') {
  if (scheme === 'dark') return {};
  return Platform.select({
    ios: {
      shadowColor: tintColor,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function fabShadow(scheme: Scheme, brandColor: string) {
  if (scheme === 'dark') {
    return Platform.select({
      ios: {
        shadowColor: brandColor,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
      default: {},
    });
  }
  return Platform.select({
    ios: {
      shadowColor: brandColor,
      shadowOpacity: 0.42,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 8 },
    default: {},
  });
}
