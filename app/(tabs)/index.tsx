import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalorieRing } from '../../components/calorie-ring';
import { MacroBar } from '../../components/macro-bar';
import { GoalIcon, FoodIcon, ActivityIcon } from '../../components/icons/nav-icons';
import { DayTypeIcon, dayTypeTint } from '../../components/icons/workout-icons';
import { Mascot } from '../../components/mascot';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore, sumTotals } from '../../lib/store';
import { getWorkoutsForDate, getWorkoutPlans, getWorkoutPlanCompletions } from '../../lib/db/queries';
import type { WorkoutPlanDay } from '../../lib/db/schema';
import { localDateString, calcBMI, bmiCategory } from '../../lib/nutrition';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function thaiDate(d = new Date()): string {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function DashboardScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { profile, latestWeightKg, todayEntries, goals, refresh } = useNumiStore();
  const [activityKcal, setActivityKcal] = useState(0);
  const [suggestedWorkout, setSuggestedWorkout] = useState<{
    planId: string;
    planTitle: string;
    day: WorkoutPlanDay;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getWorkoutsForDate(localDateString()).then((rows) => {
        setActivityKcal(rows.reduce((s, w) => s + w.kcalBurned, 0));
      });
      getWorkoutPlans().then(async (plans) => {
        if (plans.length === 0) {
          setSuggestedWorkout(null);
          return;
        }
        const plan = plans[0];
        const completions = await getWorkoutPlanCompletions(plan.id);
        const dayIndex = completions.length % plan.days.length;
        setSuggestedWorkout({ planId: plan.id, planTitle: plan.title, day: plan.days[dayIndex] });
      });
    }, [])
  );

  const totals = useMemo(() => sumTotals(todayEntries), [todayEntries]);
  const targetKcal = goals?.kcalTarget ?? 2000;

  const bmi = profile && latestWeightKg ? calcBMI(latestWeightKg, profile.heightCm) : null;

  function goToBasicInfo() {
    router.push({ pathname: '/account-edit', params: { step: 'basic' } });
  }

  const cardStyle = [styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>{thaiDate()}</Text>
            <Text style={[type.greeting, { color: c.text, fontSize: 24 }]}>แดชบอร์ด</Text>
          </View>
          <Mascot size={44} />
        </View>

        {!profile && (
          <Pressable
            style={[styles.setupBanner, { backgroundColor: c.surface, borderColor: c.line }]}
            onPress={() => router.push('/account-edit')}
          >
            <Text style={[type.row, { color: c.text }]}>ตั้งเป้าหมายแคลอรี่ก่อนเริ่มใช้งาน</Text>
            <Text style={[type.label, { color: c.subtext, marginTop: 2 }]}>
              กรอกน้ำหนัก ส่วนสูง อายุ เพื่อคำนวณเป้าหมายที่เหมาะกับคุณ
            </Text>
          </Pressable>
        )}

        <View style={cardStyle}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>แคลอรี่</Text>
              <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>ที่ควรได้รับ = เป้าหมาย − อาหาร + กิจกรรม</Text>
            </View>
          </View>

          <View style={styles.ringRow}>
            <CalorieRing consumedKcal={totals.kcal} targetKcal={targetKcal} activityKcal={activityKcal} />

            <View style={styles.statCol}>
              <StatRow icon={<GoalIcon color={c.brand} size={17} />} bg={c.brandTint} label="เป้าหมาย" value={Math.round(targetKcal)} c={c} />
              <StatRow icon={<FoodIcon color={c.fatText} size={17} />} bg={c.fatBg} label="อาหาร" value={Math.round(totals.kcal)} c={c} />
              <StatRow icon={<ActivityIcon color={c.dinner} size={17} />} bg={c.dinnerBg} label="กิจกรรม" value={Math.round(activityKcal)} c={c} />
            </View>
          </View>

          <View style={styles.macroRow}>
            <MacroBar label="โปรตีน" colorKey="protein" currentG={totals.proteinG} targetG={goals?.proteinG ?? 0} compact />
            <MacroBar label="คาร์บ" colorKey="carb" currentG={totals.carbG} targetG={goals?.carbG ?? 0} compact />
            <MacroBar label="ไขมัน" colorKey="fat" currentG={totals.fatG} targetG={goals?.fatG ?? 0} compact />
          </View>
        </View>

        {suggestedWorkout && (
          <Pressable
            style={cardStyle}
            onPress={() => router.push({ pathname: '/workout-plan-detail', params: { id: suggestedWorkout.planId } })}
          >
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                  วันนี้ตามแผน "{suggestedWorkout.planTitle}"
                </Text>
                <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]} numberOfLines={1}>
                  {suggestedWorkout.day.label}
                </Text>
              </View>
              {(() => {
                const tint = dayTypeTint(suggestedWorkout.day.dayType, c);
                return (
                  <View style={[styles.workoutBadge, { backgroundColor: tint.bg }]}>
                    <DayTypeIcon dayType={suggestedWorkout.day.dayType} size={16} color={tint.icon} />
                  </View>
                );
              })()}
            </View>
            <Text style={[type.row, { color: c.brand, fontSize: 13 }]}>ไปเล่นเลย →</Text>
          </Pressable>
        )}

        {profile && (
          <View style={cardStyle}>
            <HealthRow
              label="ดัชนีมวลกาย"
              value={bmi ? `BMI ${bmi.toFixed(1)}` : '—'}
              badge={bmi ? bmiCategory(bmi) : undefined}
              c={c}
              last={false}
              onPress={goToBasicInfo}
            />
            <HealthRow
              label="เผาผลาญพื้นฐาน"
              value={`BMR ${Math.round(goals?.bmr ?? 0).toLocaleString()} kcal`}
              c={c}
              last={false}
              onPress={goToBasicInfo}
            />
            <HealthRow
              label="ใช้ทั้งหมดต่อวัน"
              value={`TDEE ${Math.round(goals?.tdee ?? 0).toLocaleString()} kcal`}
              c={c}
              last
              onPress={goToBasicInfo}
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({
  icon,
  bg,
  label,
  value,
  c,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ minWidth: 0 }}>
        <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
        <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>{value.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function HealthRow({
  label,
  value,
  badge,
  c,
  last,
  onPress,
}: {
  label: string;
  value: string;
  badge?: string;
  c: ReturnType<typeof useTheme>;
  last: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.healthRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[type.row, { color: c.text, fontSize: 13 }]}>{label}</Text>
        <View style={styles.healthValueRow}>
          <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>{value}</Text>
          {badge && (
            <View style={[styles.healthBadge, { backgroundColor: c.brandTint }]}>
              <Text style={[type.badge, { color: c.brand }]}>{badge}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={{ color: c.faint, fontSize: 17 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setupBanner: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 14 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statCol: { flex: 1, gap: 12, minWidth: 0 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  workoutBadge: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  macroRow: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52 },
  healthValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthBadge: { borderRadius: radius.badge, paddingHorizontal: 7, paddingVertical: 1 },
});
