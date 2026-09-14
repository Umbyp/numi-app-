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
  /** ใช้ปุ่มเล็ก 26pt แทน 44pt เต็ม — สำรองไว้สำหรับที่แคบมาก ปกติไม่ต้องส่ง */
  compact?: boolean;
}

export function AmountStepper({ value, step = 10, unit = 'g', min = 1, onChange, compact = false }: Props) {
  const c = useTheme();
  const btnSize = compact ? 26 : MIN_TOUCH;
  const iconSize = compact ? 14 : 20;
  return (
    <View style={styles.row}>
      <Squish
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: radius.iconBox, backgroundColor: c.surfaceAlt }]}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={iconSize} color={c.subtext} />
      </Squish>
      <Text style={[styles.value, { color: c.text, fontSize: compact ? 13 : 18 }]}>
        {Math.round(value)}
        {unit}
      </Text>
      <Squish
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: radius.iconBox, backgroundColor: c.brandTint }]}
        onPress={() => onChange(value + step)}
      >
        <Plus size={iconSize} color={c.brand} />
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fontFamily(800), width: 56, textAlign: 'center' },
});
