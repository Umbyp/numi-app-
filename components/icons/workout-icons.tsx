import type { ComponentType } from 'react';
import { Dumbbell, HeartPulse, Wind, Trophy, Sparkles, Zap } from 'lucide-react-native';
import type { WorkoutCategory } from '../../lib/met';
import type { useTheme } from '../../lib/hooks/use-theme';

type ThemeColors = ReturnType<typeof useTheme>;

type IconComp = ComponentType<{ color: string; size?: number }>;
type DayType = 'cardio' | 'strength' | 'both';

const CATEGORY_ICONS: Record<WorkoutCategory, IconComp> = {
  cardio: HeartPulse,
  strength: Dumbbell,
  flexibility: Wind,
  sport: Trophy,
  other: Sparkles,
};

const DAY_TYPE_ICONS: Record<DayType, IconComp> = { cardio: HeartPulse, strength: Dumbbell, both: Zap };

/** สีประจำหมวด — คาร์ดิโอใช้ dinner (สีกิจกรรมเดิมของแอป) เวทใช้ brand ที่เหลือใช้กลาง ๆ ไม่ผูกความหมายเกินจำเป็น */
export function categoryTint(category: WorkoutCategory, c: ThemeColors): { icon: string; bg: string } {
  if (category === 'cardio') return { icon: c.dinner, bg: c.dinnerBg };
  if (category === 'strength') return { icon: c.brand, bg: c.brandTint };
  return { icon: c.subtext, bg: c.surfaceAlt };
}

export function dayTypeTint(dayType: DayType, c: ThemeColors): { icon: string; bg: string } {
  if (dayType === 'cardio') return { icon: c.dinner, bg: c.dinnerBg };
  if (dayType === 'strength') return { icon: c.brand, bg: c.brandTint };
  return { icon: c.subtext, bg: c.surfaceAlt };
}

export function CategoryIcon({ category, size = 16, color }: { category: WorkoutCategory; size?: number; color: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={size} color={color} />;
}

export function DayTypeIcon({ dayType, size = 14, color }: { dayType: DayType; size?: number; color: string }) {
  const Icon = DAY_TYPE_ICONS[dayType];
  return <Icon size={size} color={color} />;
}
