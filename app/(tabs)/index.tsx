import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalorieRing } from '../../components/calorie-ring';
import { MacroBar } from '../../components/macro-bar';
import { MealRow } from '../../components/meal-row';
import { useTheme } from '../../lib/hooks/use-theme';
import { useNumiStore, sumTotals } from '../../lib/store';
import { deleteMealEntry } from '../../lib/db/queries';
import type { MealType } from '../../lib/db/queries';

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'เช้า', emoji: '🌅' },
  { key: 'lunch', label: 'กลางวัน', emoji: '☀️' },
  { key: 'dinner', label: 'เย็น', emoji: '🌙' },
  { key: 'snack', label: 'ของว่าง', emoji: '🍪' },
];

export default function TodayScreen() {
  const c = useTheme();
  const router = useRouter();
  const { profile, todayEntries, goals, refresh } = useNumiStore();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const totals = useMemo(() => sumTotals(todayEntries), [todayEntries]);
  const grouped = useMemo(() => {
    const map: Record<MealType, typeof todayEntries> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const e of todayEntries) map[e.mealType as MealType].push(e);
    return map;
  }, [todayEntries]);

  async function handleDelete(id: string) {
    await deleteMealEntry(id);
    refresh();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.heading, { color: c.text }]}>วันนี้</Text>

        {!profile && (
          <Pressable
            style={[styles.setupBanner, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => router.push('/profile')}
          >
            <Text style={{ color: c.text, fontWeight: '600' }}>ตั้งเป้าหมายแคลอรี่ก่อนเริ่มใช้งาน</Text>
            <Text style={{ color: c.subtext, fontSize: 13, marginTop: 2 }}>
              กรอกน้ำหนัก ส่วนสูง อายุ เพื่อคำนวณเป้าหมายที่เหมาะกับคุณ
            </Text>
          </Pressable>
        )}

        <View style={styles.ringWrap}>
          <CalorieRing consumed={totals.kcal} target={goals?.kcalTarget ?? 2000} />
        </View>

        <View style={[styles.macroCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <MacroBar label="P" color={c.protein} currentG={totals.proteinG} targetG={goals?.proteinG ?? 0} />
          <MacroBar label="C" color={c.carb} currentG={totals.carbG} targetG={goals?.carbG ?? 0} />
          <MacroBar label="F" color={c.fat} currentG={totals.fatG} targetG={goals?.fatG ?? 0} />
        </View>

        {MEAL_TYPES.map(({ key, label, emoji }) => {
          const entries = grouped[key];
          const kcal = entries.reduce((s, e) => s + e.kcal, 0);
          return (
            <View key={key} style={[styles.mealSection, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.mealHeader}>
                <Text style={[styles.mealTitle, { color: c.text }]}>
                  {emoji} {label}
                </Text>
                <Text style={{ color: c.subtext, fontSize: 13 }}>
                  {entries.length > 0 ? `${Math.round(kcal)} kcal` : ''}
                </Text>
              </View>
              {entries.length === 0 ? (
                <Pressable onPress={() => router.push({ pathname: '/add-food', params: { mealType: key } })}>
                  <Text style={[styles.addLink, { color: c.primary }]}>+ เพิ่มรายการ</Text>
                </Pressable>
              ) : (
                entries.map((entry) => (
                  <MealRow key={entry.id} entry={entry} onDelete={handleDelete} />
                ))
              )}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => router.push('/add-food')}
      >
        <Plus color="#fff" size={26} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  setupBanner: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 14 },
  ringWrap: { alignItems: 'center', marginVertical: 8 },
  macroCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 16 },
  mealSection: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealTitle: { fontSize: 15, fontWeight: '600' },
  addLink: { fontSize: 14, fontWeight: '500', paddingVertical: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
