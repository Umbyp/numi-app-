import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { localDateString } from '../lib/nutrition';

interface Props {
  workoutDates: Set<string>;
  weeks?: number;
}

/** ฮีทแมปแบบย่อ (แนว GitHub contributions) — คอลัมน์ = สัปดาห์ (เก่า→ใหม่), แถว = จ-อา จบที่สัปดาห์นี้ */
export function WorkoutHistoryStrip({ workoutDates, weeks = 8 }: Props) {
  const c = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDow = (today.getDay() + 6) % 7; // 0 = จันทร์
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + (6 - todayDow)); // อาทิตย์ของสัปดาห์นี้

  const totalDays = weeks * 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - totalDays + 1);

  const columns: Date[][] = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + w * 7 + d);
      return day;
    })
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.grid}>
        {columns.map((col, wi) => (
          <View key={wi} style={styles.col}>
            {col.map((day, di) => {
              const isFuture = day > today;
              const active = !isFuture && workoutDates.has(localDateString(day));
              return (
                <View
                  key={di}
                  style={[
                    styles.cell,
                    { backgroundColor: isFuture ? 'transparent' : active ? c.brand : c.surfaceAlt },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 4 },
  col: { gap: 4 },
  cell: { width: 12, height: 12, borderRadius: 3 },
});
