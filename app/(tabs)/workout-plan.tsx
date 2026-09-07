import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { getWorkoutPlans, deleteWorkoutPlan } from '../../lib/db/queries';
import type { WorkoutPlanDay } from '../../lib/db/schema';
import { DayTypeIcon, dayTypeTint } from '../../components/icons/workout-icons';
import { Mascot } from '../../components/mascot';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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

  const load = useCallback(() => {
    getWorkoutPlans().then(setPlans);
  }, []);

  useFocusEffect(load);

  async function handleDelete(id: string) {
    await deleteWorkoutPlan(id);
    load();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <FlatList
        data={plans}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[type.greeting, { color: c.text, fontSize: 24, marginBottom: 8 }]}>แผนออกกำลังกาย</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Mascot size={56} />
            <Text style={[type.cardTitle, { color: c.text, textAlign: 'center' }]}>ยังไม่มีแผนออกกำลังกาย</Text>
            <Text style={[type.label, { color: c.subtext, textAlign: 'center' }]}>
              ลองขอให้ Numi ในแชทออกแบบให้เหมาะกับตัวคุณดูสิ
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const d = new Date(item.createdAt);
          const exerciseCount = item.days.reduce((s, day) => s + day.exercises.length, 0);
          const tint = dayTypeTint(dominantDayType(item.days), c);
          return (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.row}>
                <Pressable
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
                </Pressable>
                <Pressable hitSlop={10} style={[styles.deleteBtn, { backgroundColor: c.surfaceAlt }]} onPress={() => handleDelete(item.id)}>
                  <X size={15} color={c.faint} />
                </Pressable>
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
  deleteBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 60, paddingHorizontal: 32 },
});
