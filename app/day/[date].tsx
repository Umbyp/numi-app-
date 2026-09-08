import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CalorieRing } from '../../components/calorie-ring';
import { MacroBar } from '../../components/macro-bar';
import { MealRow } from '../../components/meal-row';
import { WorkoutRow } from '../../components/workout-row';
import { useTheme } from '../../lib/hooks/use-theme';
import { useNumiStore, sumTotals } from '../../lib/store';
import {
  getMealEntriesForDate,
  deleteMealEntry,
  getWorkoutsForDate,
  type MealType,
} from '../../lib/db/queries';
import { formatDayFull, localDateString } from '../../lib/dates';
import type {
  mealEntries as mealEntriesTable,
  workouts as workoutsTable,
} from '../../lib/db/schema';

type Entry = typeof mealEntriesTable.$inferSelect;
type Session = typeof workoutsTable.$inferSelect;

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'เช้า', emoji: '🌅' },
  { key: 'lunch', label: 'กลางวัน', emoji: '☀️' },
  { key: 'dinner', label: 'เย็น', emoji: '🌙' },
  { key: 'snack', label: 'ของว่าง', emoji: '🍪' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DayDetailScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ date: string }>();
  const date = typeof params.date === 'string' ? params.date : '';
  const valid = DATE_RE.test(date);

  const { goals, refresh } = useNumiStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = useCallback(async () => {
    if (!valid) return;
    const [meals, workouts] = await Promise.all([
      getMealEntriesForDate(date),
      getWorkoutsForDate(date),
    ]);
    setEntries(meals);
    setSessions(workouts);
  }, [date, valid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = useMemo(() => sumTotals(entries), [entries]);
  const grouped = useMemo(() => {
    const map: Record<MealType, Entry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) map[e.mealType as MealType].push(e);
    return map;
  }, [entries]);

  async function handleDelete(id: string) {
    await deleteMealEntry(id);
    await load();
    // หน้า Today อ่านยอดของวันนี้จาก store จึงต้องรีเฟรชเมื่อลบของวันนี้
    if (date === localDateString()) await refresh();
  }

  if (!valid) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg }]}>
        <Stack.Screen options={{ title: 'ไม่พบวัน' }} />
        <Text style={{ color: c.subtext }}>วันที่ไม่ถูกต้อง</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: formatDayFull(date) }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.ringWrap}>
          <CalorieRing consumed={totals.kcal} target={goals?.kcalTarget ?? 2000} size={150} />
        </View>

        <View style={[styles.macroCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <MacroBar label="P" color={c.protein} currentG={totals.proteinG} targetG={goals?.proteinG ?? 0} />
          <MacroBar label="C" color={c.carb} currentG={totals.carbG} targetG={goals?.carbG ?? 0} />
          <MacroBar label="F" color={c.fat} currentG={totals.fatG} targetG={goals?.fatG ?? 0} />
        </View>

        {sessions.length > 0 && (
          <View style={[styles.mealSection, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.mealHead}>
              <Text style={[styles.mealTitle, { color: c.text }]}>🏃 ออกกำลังกาย</Text>
              <Text style={{ color: c.subtext, fontSize: 13 }}>
                {Math.round(sessions.reduce((s, w) => s + w.kcalBurned, 0))} kcal
              </Text>
            </View>
            {sessions.map((w) => (
              <WorkoutRow key={w.id} session={w} />
            ))}
          </View>
        )}

        {entries.length === 0 && sessions.length === 0 && (
          <Text style={{ color: c.subtext, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            วันนี้ไม่มีรายการที่บันทึกไว้
          </Text>
        )}

        {MEAL_TYPES.map(({ key, label, emoji }) => {
          const rows = grouped[key];
          if (rows.length === 0) return null;
          const kcal = rows.reduce((s, e) => s + e.kcal, 0);
          return (
            <View
              key={key}
              style={[styles.mealSection, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <View style={styles.mealHead}>
                <Text style={[styles.mealTitle, { color: c.text }]}>
                  {emoji} {label}
                </Text>
                <Text style={{ color: c.subtext, fontSize: 13 }}>{Math.round(kcal)} kcal</Text>
              </View>
              {rows.map((e) => (
                <MealRow key={e.id} entry={e} onDelete={handleDelete} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  ringWrap: { alignItems: 'center', marginTop: 4 },
  macroCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  mealSection: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  mealHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealTitle: { fontSize: 15, fontWeight: '600' },
});
