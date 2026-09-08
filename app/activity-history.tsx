import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getWorkoutHistory, deleteWorkout, getStrengthSessions } from '../lib/db/queries';
import { buildRecords, type ExerciseRecord, type SessionLike } from '../lib/strength';
import { type } from '../lib/fonts';
import { radius } from '../lib/theme';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ActivityHistoryScreen() {
  const c = useTheme();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWorkoutHistory>>>([]);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);

  const load = useCallback(() => {
    getWorkoutHistory(365).then(setHistory);
    getStrengthSessions().then((rows) => {
      const asLike: SessionLike[] = rows.map((r) => ({
        id: r.id,
        localDate: r.localDate,
        sets: r.sets ?? null,
      }));
      setRecords(buildRecords(asLike));
    });
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
        ListHeaderComponent={
          records.length === 0 ? null : (
            <View style={styles.records}>
              <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>สถิติส่วนตัว</Text>
              {records.slice(0, 6).map((r) => (
                <View key={r.exercise} style={[styles.recordRow, { backgroundColor: c.surfaceAlt }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.row, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
                      {r.exercise}
                    </Text>
                    <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                      หนักสุด {r.bestWeightKg} kg · {r.sessionCount} ครั้ง
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[type.cardTitle, { color: c.brand, fontSize: 15 }]}>
                      {r.best1RM.toFixed(1)}
                    </Text>
                    <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>1RM ประมาณ</Text>
                  </View>
                </View>
              ))}
              <Text style={[type.label, { color: c.faint, fontSize: 10.5 }]}>
                1RM คำนวณด้วยสูตร Epley จากเซตที่ดีที่สุด เป็นค่าประมาณ ไม่ใช่ค่าที่วัดจริง
              </Text>
            </View>
          )
        }
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
  records: { gap: 6, paddingBottom: 14 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
