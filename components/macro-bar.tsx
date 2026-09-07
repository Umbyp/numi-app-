import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { type } from '../lib/fonts';
import type { ThemeColors } from '../lib/theme';

interface Props {
  label: string;
  colorKey: 'protein' | 'carb' | 'fat';
  bgKey?: keyof ThemeColors;
  currentG: number;
  targetG: number;
  /** ตัดไอคอนสีจางออก เหลือแค่ label + ตัวเลข + แถบ — ใช้ในการ์ด Dashboard ที่มีพื้นที่จำกัด */
  compact?: boolean;
}

/** วิดเจ็ตย่อยต่อ macro — ไอคอนสีจาง (ยกเว้นโหมด compact) + label + ปริมาณ/เป้า + แถบบาง */
export function MacroBar({ label, colorKey, bgKey, currentG, targetG, compact }: Props) {
  const c = useTheme();
  const color = c[colorKey];
  const pct = targetG > 0 ? Math.min(1, currentG / targetG) : 0;

  if (compact) {
    return (
      <View style={styles.col}>
        <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
          {label} {Math.round(currentG)}/{Math.round(targetG)}g
        </Text>
        <View style={[styles.track, { backgroundColor: c.line }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.col}>
      <View style={[styles.swatch, { backgroundColor: bgKey ? c[bgKey] : c.surfaceAlt }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={[type.label, { color: c.muted }]}>{label}</Text>
      <Text style={[type.badge, styles.value, { color: c.text }]}>
        {Math.round(currentG)}g<Text style={{ color: c.faint }}> /{Math.round(targetG)}g</Text>
      </Text>
      <View style={[styles.track, { backgroundColor: c.line }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4 },
  swatch: { width: 21, height: 21, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  value: { fontSize: 12 },
  track: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
