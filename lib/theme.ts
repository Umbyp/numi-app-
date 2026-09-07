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
    carb: '#2E7DF7',
    carbBg: 'rgba(46,125,247,0.12)',
    carbText: '#2E7DF7',
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
    carb: '#5C9BFF',
    carbBg: 'rgba(92,155,255,0.18)',
    carbText: '#7FB1FF',
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
  card: 26,
  fab: 30,
} as const;

// spacing scale 4 · 6 · 8 · 12 · 16 · 24 · 32
export const space = [4, 6, 8, 12, 16, 24, 32] as const;

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
