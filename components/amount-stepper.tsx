import { View, Text, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { fontFamily } from '../lib/fonts';
import { Squish } from './squish';

interface Props {
  value: number;
  step?: number;
  unit?: string;
  min?: number;
  onChange: (value: number) => void;
}

export function AmountStepper({ value, step = 10, unit = 'g', min = 1, onChange }: Props) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Squish
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={14} color={c.text} />
      </Squish>
      <Text style={[styles.value, { color: c.text }]}>{Math.round(value)}{unit}</Text>
      <Squish
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        onPress={() => onChange(value + step)}
      >
        <Plus size={14} color={c.text} />
      </Squish>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fontFamily(700), fontSize: 13, width: 50, textAlign: 'center' },
});
