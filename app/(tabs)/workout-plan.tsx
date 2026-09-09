import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { getWorkoutPlans, deleteWorkoutPlan, getWorkoutHistory, getWorkoutPlanCompletionsInRange } from '../../lib/db/queries';
import type { WorkoutPlanDay } from '../../lib/db/schema';
import { DayTypeIcon, dayTypeTint } from '../../components/icons/workout-icons';
import { WorkoutHistoryStrip } from '../../components/workout-history-strip';
import { EmptyState } from '../../components/empty-state';
import { localDateString } from '../../lib/nutrition';
import { calcStreak, calcWeekCompletionCount, calcMuscleBalance } from '../../lib/workout-stats';
import { MUSCLE_GROUPS } from '../../lib/met';
import { type } from '../../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../../lib/theme';
import { Squish } from '../../components/squish';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** วันที่ในสัปดาห์นี้ (จันทร์-อาทิตย์) แบบ YYYY-MM-DD ใช้คำนวณสถิติรายสัปดาห์ */
function thisWeekDates(): string[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = จันทร์
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateString(d);
  });
}

/** เอาไว้เลือกสี/ไอคอนหน้าปกของแผน — ใช้ประเภทวันที่ปรากฏบ่อยสุด */
function dominantDayType(days: { dayType: WorkoutPlanDay['dayType'] }[]): WorkoutPlanDay['dayType'] {
  const counts = new Map<WorkoutPlanDay['dayType'], number>();
  for (const d of days) counts.set(d.dayType, (counts.get(d.dayType) ?? 0) + 1);
  let best: WorkoutPlanDay['dayType'] = 'both';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

export default function WorkoutPlanScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getWorkoutPlans>>>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [muscleBalance, setMuscleBalance] = useState<ReturnType<typeof calcMuscleBalance>>({});

  const load = useCallback(async () => {
    const [plansData, historyRows] = await Promise.all([getWorkoutPlans(), getWorkoutHistory(60)]);
    setPlans(plansData);
    setWorkoutDates(new Set(historyRows.map((r) => r.localDate)));

    const week = thisWeekDates();
    const completions = await getWorkoutPlanCompletionsInRange(week[0], week[6]);
    setMuscleBalance(calcMuscleBalance(completions, plansData));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const streak = useMemo(() => calcStreak(workoutDates), [workoutDates]);
  const weekCount = useMemo(() => calcWeekCompletionCount(workoutDates, thisWeekDates()), [workoutDates]);

  /** ถามก่อนลบ — ปุ่มอยู่ติดพื้นที่กดเข้าดูรายละเอียด กดพลาดแล้วแผนทั้งแผนหายกู้ไม่ได้ */
  function handleDelete(id: string, title: string) {
    Alert.alert('ลบแผนนี้', `ลบ "${title}" ทิ้ง? ประวัติที่เคยทำตามแผนจะยังอยู่`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkoutPlan(id);
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <FlatList
        data={plans}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={[type.greeting, { color: c.text, fontSize: 24, marginBottom: 8 }]}>แผนออกกำลังกาย</Text>
            <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>ต่อเนื่อง</Text>
                  <Text style={[type.cardTitle, { color: c.text, fontSize: 20 }]}>{streak} วัน</Text>
                </View>
                <View>
                  <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>สัปดาห์นี้</Text>
                  <Text style={[type.cardTitle, { color: c.text, fontSize: 20 }]}>{weekCount}/7 วัน</Text>
                </View>
              </View>

              <WorkoutHistoryStrip workoutDates={workoutDates} />

              <View style={{ gap: 6 }}>
                <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4 }]}>สมดุลกล้ามเนื้อสัปดาห์นี้</Text>
                <View style={styles.muscleRow}>
                  {MUSCLE_GROUPS.map((m) => {
                    const n = muscleBalance[m.key] ?? 0;
                    return (
                      <View
                        key={m.key}
                        style={[styles.muscleBadge, { backgroundColor: n > 0 ? c.brandTint : c.surfaceAlt }]}
                      >
                        <Text style={[type.badge, { color: n > 0 ? c.brand : c.faint }]}>
                          {m.label}
                          {n > 0 ? ` ×${n}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="ยังไม่มีแผนออกกำลังกาย"
            description="บอก Numi ว่าอยากเล่นกี่วันต่อสัปดาห์ มีอุปกรณ์อะไร แล้วให้มันจัดตารางให้"
            actionLabel="ให้ Numi จัดแผนให้"
            onAction={() => router.push('/chat')}
          />
        }
        renderItem={({ item }) => {
          const d = new Date(item.createdAt);
          const exerciseCount = item.days.reduce((s, day) => s + day.exercises.length, 0);
          const tint = dayTypeTint(dominantDayType(item.days), c);
          return (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.row}>
                <Squish scaleTo={0.98}
                  style={styles.rowMain}
                  onPress={() => router.push({ pathname: '/workout-plan-detail', params: { id: item.id } })}
                >
                  <View style={[styles.iconBox, { backgroundColor: tint.bg }]}>
                    <DayTypeIcon dayType={dominantDayType(item.days)} size={19} color={tint.icon} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.row, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                      {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543} · {item.days.length} วัน · {exerciseCount} ท่า
                    </Text>
                  </View>
                </Squish>
                <Squish
                  style={[styles.deleteBtn, { backgroundColor: c.surfaceAlt }]}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Trash2 size={15} color={c.faint} />
                </Squish>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 18, gap: 10 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 60, paddingHorizontal: 32 },
  statsCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 24 },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleBadge: { borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3 },
});
