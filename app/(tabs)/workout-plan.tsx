import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import {
  getWorkoutPlans,
  deleteWorkoutPlan,
  getWorkoutHistory,
  getWorkoutPlanCompletions,
  getWorkoutPlanCompletionsInRange,
} from '../../lib/db/queries';
import type { WorkoutPlanDay } from '../../lib/db/schema';
import { DayTypeIcon, dayTypeTint } from '../../components/icons/workout-icons';
import { WorkoutHistoryStrip } from '../../components/workout-history-strip';
import { Mascot } from '../../components/mascot';
import { EmptyState } from '../../components/empty-state';
import { localDateString, calcKcalBurned } from '../../lib/nutrition';
import { useNumiStore } from '../../lib/store';
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
  const latestWeightKg = useNumiStore((s) => s.latestWeightKg);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getWorkoutPlans>>>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [muscleBalance, setMuscleBalance] = useState<ReturnType<typeof calcMuscleBalance>>({});
  const [suggested, setSuggested] = useState<{ planId: string; planTitle: string; day: WorkoutPlanDay } | null>(null);
  /** ปิดการ์ดวันนี้ไว้ชั่วคราวเฉพาะรอบเปิดแอปนี้ ไม่ได้บันทึกลง DB ว่า "ข้าม" จริง */
  const [dismissedToday, setDismissedToday] = useState(false);

  const load = useCallback(async () => {
    const [plansData, historyRows] = await Promise.all([getWorkoutPlans(), getWorkoutHistory(60)]);
    setPlans(plansData);
    setWorkoutDates(new Set(historyRows.map((r) => r.localDate)));

    const week = thisWeekDates();
    const completions = await getWorkoutPlanCompletionsInRange(week[0], week[6]);
    setMuscleBalance(calcMuscleBalance(completions, plansData));

    if (plansData.length === 0) {
      setSuggested(null);
    } else {
      const plan = plansData[0];
      const planCompletions = await getWorkoutPlanCompletions(plan.id);
      const dayIndex = planCompletions.length % plan.days.length;
      setSuggested({ planId: plan.id, planTitle: plan.title, day: plan.days[dayIndex] });
    }
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
            <Text style={[type.greeting, { color: c.text, fontSize: 22, marginBottom: 8 }]}>แผนออกกำลังกาย</Text>

            {suggested && !dismissedToday && (
              <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <View style={styles.heroRow}>
                  <Mascot pose="start" size={64} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.label, { color: c.muted, fontSize: 11.5 }]} numberOfLines={1}>
                      วันนี้ตามแผน "{suggested.planTitle}"
                    </Text>
                    <Text style={[type.cardTitle, { color: c.text, fontSize: 19 }]} numberOfLines={1}>
                      {suggested.day.label}
                    </Text>
                    <Text style={[type.label, { color: c.subtext, fontSize: 12 }]}>
                      {suggested.day.exercises.length} ท่า ·{' '}
                      {suggested.day.exercises.reduce((s, e) => s + e.durationMin, 0)} นาที · ราว{' '}
                      {Math.round(
                        suggested.day.exercises.reduce(
                          (s, e) => s + calcKcalBurned(e.met, latestWeightKg ?? 70, e.durationMin),
                          0
                        )
                      )}{' '}
                      kcal
                    </Text>
                  </View>
                </View>
                <Squish
                  scaleTo={0.97}
                  style={[styles.heroPrimaryBtn, { backgroundColor: c.brand }]}
                  onPress={() => router.push({ pathname: '/workout-plan-detail', params: { id: suggested.planId } })}
                >
                  <Text style={[type.row, { color: '#fff', fontSize: 16 }]}>เริ่มเล่นวันนี้</Text>
                </Squish>
                <View style={styles.heroSecondaryRow}>
                  <Squish
                    style={[styles.heroSecondaryBtn, { backgroundColor: c.surfaceAlt }]}
                    onPress={() => router.push('/log-workout')}
                  >
                    <Text style={[type.row, { color: c.text, fontSize: 13.5 }]}>บันทึกเองแบบเร็ว</Text>
                  </Squish>
                  <Squish
                    style={[styles.heroSecondaryBtn, { backgroundColor: c.surfaceAlt }]}
                    onPress={() => setDismissedToday(true)}
                  >
                    <Text style={[type.row, { color: c.text, fontSize: 13.5 }]}>ข้ามวันนี้</Text>
                  </Squish>
                </View>
              </View>
            )}

            <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>เล่นต่อเนื่อง</Text>
                  <Text style={[type.metric, { color: c.text, fontSize: 24 }]}>{streak} วัน</Text>
                </View>
                <View>
                  <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>สัปดาห์นี้</Text>
                  <Text style={[type.metric, { color: c.text, fontSize: 24 }]}>{weekCount}/7 วัน</Text>
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
                        <Text style={[type.row, { fontSize: 11.5, color: n > 0 ? c.brand : c.faint }]}>
                          {m.label}
                          {n > 0 ? ` ×${n}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {plans.length > 0 && (
              <View style={styles.plansHeaderRow}>
                <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4 }]}>แผนของฉัน</Text>
                <Squish onPress={() => router.push('/chat')} hitSlop={8}>
                  <Text style={[type.row, { color: c.brand, fontSize: 12.5 }]}>+ ให้ Numi จัดแผนใหม่</Text>
                </Squish>
              </View>
            )}
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
  heroCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 17, gap: 13, marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroPrimaryBtn: { height: 54, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  heroSecondaryRow: { flexDirection: 'row', gap: 8 },
  heroSecondaryBtn: { flex: 1, height: 44, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  statsCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 24 },
  plansHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleBadge: { height: 30, borderRadius: 15, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
});
