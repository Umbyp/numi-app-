import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getWorkoutPlans, deleteWorkoutPlan } from '../lib/db/queries';
import { type } from '../lib/fonts';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function WorkoutPlanScreen() {
  const c = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <FlatList
        data={plans}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
        ListEmptyComponent={
          <Text style={[type.label, { color: c.subtext, textAlign: 'center', marginTop: 24 }]}>
            ยังไม่มีแผนออกกำลังกาย ลองขอให้ Numi ในแชทออกแบบให้ดูสิ
          </Text>
        }
        renderItem={({ item }) => {
          const d = new Date(item.createdAt);
          const exerciseCount = item.days.reduce((s, day) => s + day.exercises.length, 0);
          return (
            <View style={styles.row}>
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => router.push({ pathname: '/workout-plan-detail', params: { id: item.id } })}
              >
                <Text style={[type.row, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                  {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543} · {item.days.length} วัน · {exerciseCount} ท่า
                </Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={() => handleDelete(item.id)}>
                <X size={16} color={c.faint} />
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
