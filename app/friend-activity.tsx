import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getErrorMessage } from '../lib/errors';
import { type as textType } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';
import { Squish } from '../components/squish';
import { EmptyState } from '../components/empty-state';
import {
  listFriendActivity,
  getFriendWeightTrend,
  giveKudos,
  type FriendWorkout,
  type FriendWeightTrend,
} from '../lib/social/friends';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const TREND_LABEL: Record<FriendWeightTrend['trend'], string> = {
  down: 'แนวโน้มลดลง',
  up: 'แนวโน้มเพิ่มขึ้น',
  flat: 'แนวโน้มคงที่',
};

export default function FriendActivityScreen() {
  const c = useTheme();
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const [workouts, setWorkouts] = useState<FriendWorkout[]>([]);
  const [trend, setTrend] = useState<FriendWeightTrend | null>(null);
  const [given, setGiven] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!friendId) return;
    setLoading(true);
    Promise.all([listFriendActivity(friendId), getFriendWeightTrend(friendId)])
      .then(([w, t]) => {
        setWorkouts(w);
        setTrend(t);
      })
      .catch((e) => Alert.alert('โหลดข้อมูลไม่สำเร็จ', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [friendId]);

  useFocusEffect(load);

  async function handleKudos(workoutId: string) {
    if (!friendId) return;
    try {
      await giveKudos(workoutId, friendId);
      setGiven((prev) => new Set(prev).add(workoutId));
    } catch (e) {
      Alert.alert('ให้กำลังใจไม่สำเร็จ', getErrorMessage(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
        ListHeaderComponent={
          trend ? (
            <View style={[styles.trendCard, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>{TREND_LABEL[trend.trend]}</Text>
              {trend.weightKg != null && (
                <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>{trend.weightKg.toFixed(1)} กก.</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? <EmptyState title="ยังไม่มีกิจกรรมให้เห็น" description="เพื่อนคนนี้ยังไม่ได้บันทึกกิจกรรม หรือยังไม่ได้เปิดแชร์" /> : null
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.localDate}T00:00:00`);
          const alreadyGiven = given.has(item.id);
          return (
            <View style={styles.row}>
              <View style={[styles.iconDot, { backgroundColor: c.dinnerBg }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>{item.name}</Text>
                <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>
                  {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543} · {item.durationMin} นาที
                </Text>
              </View>
              <Text style={[textType.cardTitle, { color: c.dinner, fontSize: 15 }]}>-{Math.round(item.kcalBurned)}</Text>
              <Squish
                scaleTo={0.9}
                disabled={alreadyGiven}
                onPress={() => handleKudos(item.id)}
                style={styles.kudosBtn}
              >
                <Heart size={17} color={alreadyGiven ? c.brand : c.faint} fill={alreadyGiven ? c.brand : 'none'} />
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
  trendCard: { borderRadius: radius.cardInner, padding: 14, marginBottom: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconDot: { width: 10, height: 10, borderRadius: radius.badge / 2 },
  kudosBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
