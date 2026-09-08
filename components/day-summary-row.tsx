import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { formatDayRelative } from '../lib/dates';

interface Props {
  localDate: string;
  kcal: number;
  target: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  entryCount: number;
  onPress: () => void;
}

/** หนึ่งแถว = หนึ่งวันในประวัติ กดเพื่อดูรายการอาหารของวันนั้น */
export function DaySummaryRow({
  localDate,
  kcal,
  target,
  proteinG,
  carbG,
  fatG,
  entryCount,
  onPress,
}: Props) {
  const c = useTheme();
  const pct = target > 0 ? Math.min(1, kcal / target) : 0;
  // เกินเป้าใช้เทา ไม่ใช้แดง — สีแดงทำให้รู้สึกผิดแล้วเลี่ยงการบันทึก
  const barColor = target > 0 && kcal > target ? c.ringOver : c.ringActive;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: c.border },
        pressed && { backgroundColor: c.ghostBg },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.topLine}>
          <Text style={[styles.date, { color: c.text }]}>{formatDayRelative(localDate)}</Text>
          <Text style={[styles.kcal, { color: c.text }]}>
            {Math.round(kcal).toLocaleString()}
            {target > 0 && (
              <Text style={{ color: c.subtext, fontWeight: '400' }}> / {target.toLocaleString()}</Text>
            )}
            <Text style={{ color: c.subtext, fontWeight: '400' }}> kcal</Text>
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: c.ghostBg }]}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
        </View>

        <Text style={[styles.macros, { color: c.subtext }]}>
          P {Math.round(proteinG)} · C {Math.round(carbG)} · F {Math.round(fatG)} g · {entryCount} รายการ
        </Text>
      </View>
      <ChevronRight size={16} color={c.subtext} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  date: { fontSize: 14, fontWeight: '600' },
  kcal: { fontSize: 14, fontWeight: '600' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 7 },
  fill: { height: '100%', borderRadius: 3 },
  macros: { fontSize: 11.5, marginTop: 5 },
});
