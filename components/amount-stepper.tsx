import { View, Text, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { fontFamily } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';
import { Squish } from './squish';

interface Props {
  value: number;
  step?: number;
  unit?: string;
  min?: number;
  onChange: (value: number) => void;
  /** ปุ่มเล็ก 26pt แทน 28pt ปกติ — ใช้ในแถวที่แคบมาก เช่นรายการออกกำลังกายในแผน */
  compact?: boolean;
  /** ตัวควบคุมหลักในหน้ากรอกปริมาณ (add-food) — ปุ่ม 44x44 เต็ม แทนที่ปุ่มกลมเล็กที่ใช้แทรกในแถวการ์ดคำสั่ง */
  large?: boolean;
}

/** ปุ่มปกติ (ใช้ในแถวแน่น ๆ ของการ์ดคำสั่ง) เล็กแค่ 28px แต่ hitSlop ชดเชยให้เป้ากดจริงถึง 44 ตามเกณฑ์ */
export function AmountStepper({ value, step = 10, unit = 'g', min = 1, onChange, compact = false, large = false }: Props) {
  const c = useTheme();

  if (large) {
    return (
      <View style={styles.rowLarge}>
        <Squish
          style={[styles.btnLarge, { backgroundColor: c.surfaceAlt }]}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Minus size={20} color={c.subtext} />
        </Squish>
        <Text style={[styles.valueLarge, { color: c.text }]}>{Math.round(value)}</Text>
        <Squish
          style={[styles.btnLarge, { backgroundColor: c.brandTint }]}
          onPress={() => onChange(value + step)}
        >
          <Plus size={20} color={c.brand} />
        </Squish>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.row}>
        <Squish
          style={[styles.btnCompact, { backgroundColor: c.surfaceAlt }]}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Minus size={14} color={c.subtext} />
        </Squish>
        <Text style={[styles.value, { color: c.text, fontSize: 13 }]}>
          {Math.round(value)}
          {unit}
        </Text>
        <Squish
          style={[styles.btnCompact, { backgroundColor: c.brandTint }]}
          onPress={() => onChange(value + step)}
        >
          <Plus size={14} color={c.brand} />
        </Squish>
      </View>
    );
  }

  const hitSlop = Math.max(0, (MIN_TOUCH - 28) / 2);
  return (
    <View style={styles.row}>
      <Squish
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        hitSlop={hitSlop}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={16} color={c.subtext} />
      </Squish>
      <Text style={[styles.value, { color: c.text, fontSize: 13 }]}>
        {Math.round(value)}
        {unit}
      </Text>
      <Squish
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        hitSlop={hitSlop}
        onPress={() => onChange(value + step)}
      >
        <Plus size={16} color={c.brand} />
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnCompact: { width: 26, height: 26, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fontFamily(700), fontSize: 13, width: 50, textAlign: 'center' },
  rowLarge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnLarge: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  valueLarge: { fontFamily: fontFamily(800), fontSize: 19, minWidth: 56, textAlign: 'center' },
});
