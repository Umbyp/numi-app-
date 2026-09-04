import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';

interface Props {
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

export function AmountStepper({ value, step = 10, onChange }: Props) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        onPress={() => onChange(Math.max(1, value - step))}
      >
        <Minus size={14} color={c.text} />
      </Pressable>
      <Text style={[styles.value, { color: c.text }]}>{Math.round(value)}g</Text>
      <Pressable
        style={[styles.btn, { backgroundColor: c.ghostBg }]}
        onPress={() => onChange(value + step)}
      >
        <Plus size={14} color={c.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 13, fontWeight: '600', width: 50, textAlign: 'center' },
});
