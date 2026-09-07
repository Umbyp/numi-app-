import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getWorkoutHistory, deleteWorkout } from '../lib/db/queries';
import { type } from '../lib/fonts';
import { radius } from '../lib/theme';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ActivityHistoryScreen() {
  const c = useTheme();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWorkoutHistory>>>([]);

  const load = useCallback(() => {
    getWorkoutHistory(365).then(setHistory);
  }, []);

  useFocusEffect(load);

  async function handleDelete(id: string) {
    await deleteWorkout(id);
    load();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <FlatList
        data={history}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
        ListEmptyComponent={
          <Text style={[type.label, { color: c.subtext, textAlign: 'center', marginTop: 24 }]}>ยังไม่มีประวัติการออกกำลังกาย</Text>
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.localDate}T00:00:00`);
          return (
            <View style={styles.row}>
              <View style={[styles.iconDot, { backgroundColor: c.dinnerBg }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>{item.name}</Text>
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                  {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543} · {item.durationMin} นาที
                </Text>
              </View>
              <Text style={[type.cardTitle, { color: c.dinner, fontSize: 15 }]}>-{Math.round(item.kcalBurned)}</Text>
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
  iconDot: { width: 10, height: 10, borderRadius: radius.badge / 2 },
});
