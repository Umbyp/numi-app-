import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { localDateString } from '../lib/nutrition';
import { type as textType } from '../lib/fonts';
import { radius } from '../lib/theme';

interface Props {
  workoutDates: Set<string>;
}

const DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

/** แถวสัปดาห์นี้ จ-อา — วันไหนออกกำลังกายแล้วติดสี วันนี้ที่ยังไม่ได้เล่นขอบเส้นประไว้เตือน */
export function WorkoutHistoryStrip({ workoutDates }: Props) {
  const c = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDow = (today.getDay() + 6) % 7; // 0 = จันทร์
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayDow);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <View style={styles.row}>
      {days.map((day, i) => {
        const isToday = i === todayDow;
        const done = workoutDates.has(localDateString(day));
        return (
          <View key={i} style={styles.col}>
            <View
              style={[
                styles.pill,
                done
                  ? { backgroundColor: c.brand }
                  : isToday
                    ? { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.brand, borderStyle: 'dashed' }
                    : { backgroundColor: c.surfaceAlt },
              ]}
            />
            <Text style={[textType.label, { color: isToday ? c.brand : c.faint, fontSize: 11 }]}>{DAY_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6 },
  pill: { width: 40, height: 32, borderRadius: radius.cardInner },
});
