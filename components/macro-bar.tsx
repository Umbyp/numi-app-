import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';

interface Props {
  label: string;
  color: string;
  currentG: number;
  targetG: number;
}

export function MacroBar({ label, color, currentG, targetG }: Props) {
  const c = useTheme();
  const pct = targetG > 0 ? Math.min(1, currentG / targetG) : 0;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.subtext }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: c.ghostBg }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.value, { color: c.text }]}>
        {Math.round(currentG)}/{Math.round(targetG)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 8 },
  label: { width: 14, fontSize: 13, fontWeight: '600' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { fontSize: 12, width: 78, textAlign: 'right' },
});
