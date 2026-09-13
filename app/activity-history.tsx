import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { getWorkoutHistory, deleteWorkout, getStrengthSessions } from '../lib/db/queries';
import { buildRecords, type ExerciseRecord, type SessionLike } from '../lib/strength';
import { type } from '../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../lib/theme';
import { ActivityIcon } from '../components/icons/nav-icons';
import { EmptyState } from '../components/empty-state';
import { Squish } from '../components/squish';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ActivityHistoryScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
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

  function handleDelete(id: string, name: string) {
    Alert.alert('ลบรายการนี้', `ลบ "${name}" ออกจากประวัติ? แคลอรี่ของวันนั้นจะถูกคำนวณใหม่`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(id);
          load();
        },
      },
    ]);
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
            <View style={[styles.recordsCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4 }]}>สถิติส่วนตัว</Text>
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
                    <Text style={[type.cardTitle, { color: c.brand, fontSize: 16 }]}>
                      {r.best1RM.toFixed(1)}
                    </Text>
                    <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>1RM ประมาณ</Text>
                  </View>
                </View>
              ))}
              <Text style={[type.label, { color: c.faint, fontSize: 10.5, lineHeight: 15 }]}>
                1RM คำนวณด้วยสูตร Epley จากเซตที่ดีที่สุด เป็นค่าประมาณ ไม่ใช่ค่าที่วัดจริง
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="ยังไม่มีประวัติการออกกำลังกาย"
            description="บันทึกครั้งแรกแล้วหน้านี้จะเริ่มเก็บสถิติ 1RM กับน้ำหนักสูงสุดของแต่ละท่าให้"
            actionLabel="บันทึกการออกกำลังกาย"
            onAction={() => router.push('/log-workout')}
          />
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.localDate}T00:00:00`);
          return (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: c.dinnerBg }]}>
                <ActivityIcon color={c.dinner} size={18} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.row, { color: c.text, fontSize: 14.5 }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
                  {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543} · {item.durationMin} นาที
                </Text>
              </View>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{Math.round(item.kcalBurned)}</Text>
              <Squish style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
                <Trash2 size={15} color={c.faint} />
              </Squish>
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
  iconBox: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  recordsCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 8, marginBottom: 14 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.cardInner,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
});
