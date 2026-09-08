import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, HeartPulse } from 'lucide-react-native';
import { WorkoutRow } from '../../components/workout-row';
import { useTheme } from '../../lib/hooks/use-theme';
import { useNumiStore, sumBurned } from '../../lib/store';
import { getWorkoutsSince, deleteWorkout } from '../../lib/db/queries';
import { addDays, localDateString, formatDayRelative } from '../../lib/dates';
import type { workouts as workoutsTable } from '../../lib/db/schema';

type Session = typeof workoutsTable.$inferSelect;

const RECENT_DAYS = 14;

export default function WorkoutScreen() {
  const c = useTheme();
  const router = useRouter();
  const { todayWorkouts, profile, refresh } = useNumiStore();
  const [recent, setRecent] = useState<Session[]>([]);

  const load = useCallback(async () => {
    const from = addDays(localDateString(), -(RECENT_DAYS - 1));
    setRecent(await getWorkoutsSince(from));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = localDateString();
  const burned = sumBurned(todayWorkouts);
  const minutes = todayWorkouts.reduce((s, w) => s + w.durationMin, 0);

  /** จัดกลุ่มเซสชันย้อนหลังตามวัน ข้ามวันนี้เพราะแสดงไว้ด้านบนแล้ว */
  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const w of recent) {
      if (w.localDate === today) continue;
      const list = map.get(w.localDate) ?? [];
      list.push(w);
      map.set(w.localDate, list);
    }
    return [...map.entries()];
  }, [recent, today]);

  const activeDays = new Set(recent.map((w) => w.localDate)).size;

  async function handleDelete(id: string) {
    await deleteWorkout(id);
    await refresh();
    await load();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.heading, { color: c.text }]}>ออกกำลังกาย</Text>

        <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: c.text }]}>{Math.round(burned)}</Text>
            <Text style={{ color: c.subtext, fontSize: 12 }}>kcal วันนี้</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: c.text }]}>{Math.round(minutes)}</Text>
            <Text style={{ color: c.subtext, fontSize: 12 }}>นาทีวันนี้</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: c.text }]}>{activeDays}</Text>
            <Text style={{ color: c.subtext, fontSize: 12 }}>วัน ใน {RECENT_DAYS} วัน</Text>
          </View>
        </View>

        {burned > 0 && (
          <Text style={{ color: c.subtext, fontSize: 12 }}>
            {profile?.addExerciseKcal
              ? 'แคลอรี่ที่เผาถูกบวกกลับเข้าเป้าหมายวันนี้แล้ว'
              : 'เป้าหมายวันนี้ยังไม่รวมแคลอรี่ที่เผา — เปลี่ยนได้ในหน้าโปรไฟล์'}
          </Text>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.action, { backgroundColor: c.primary }]}
            onPress={() => router.push('/log-cardio')}
          >
            <HeartPulse size={18} color="#fff" />
            <Text style={styles.actionText}>คาร์ดิโอ</Text>
          </Pressable>
          <Pressable
            style={[styles.action, { backgroundColor: c.card, borderColor: c.primary, borderWidth: 1 }]}
            onPress={() => router.push('/log-strength')}
          >
            <Dumbbell size={18} color={c.primary} />
            <Text style={[styles.actionText, { color: c.primary }]}>เวท</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>วันนี้</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {todayWorkouts.length === 0 ? (
            <Text style={{ color: c.subtext, fontSize: 13, paddingVertical: 8 }}>
              ยังไม่มีการออกกำลังกายวันนี้
            </Text>
          ) : (
            todayWorkouts.map((w) => (
              <WorkoutRow key={w.id} session={w} onDelete={handleDelete} />
            ))
          )}
        </View>

        {grouped.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>ก่อนหน้านี้</Text>
            {grouped.map(([date, list]) => (
              <View key={date} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.dayLabel, { color: c.subtext }]}>{formatDayRelative(date)}</Text>
                {list.map((w) => (
                  <WorkoutRow key={w.id} session={w} onDelete={handleDelete} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700' },
  summary: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, paddingVertical: 14 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  divider: { width: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  dayLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
