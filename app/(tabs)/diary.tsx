import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, X } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import { getMealEntriesForDate, getWorkoutsForDate, getWeightForDate, deleteMealEntry, type MealType } from '../../lib/db/queries';
import { localDateString } from '../../lib/nutrition';
import { MEAL_TYPES, getMealTypeMeta } from '../../lib/meal-type';
import { MealTypeIcon } from '../../components/icons/meal-type-icons';
import { ActivityIcon, ScaleIcon } from '../../components/icons/nav-icons';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';

const DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

function currentWeekDates(): Date[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function DiaryScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { refresh } = useNumiStore();
  const today = localDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getMealEntriesForDate>>>([]);
  const [activityKcal, setActivityKcal] = useState(0);
  const [dayWeightKg, setDayWeightKg] = useState<number | null>(null);
  const week = useMemo(currentWeekDates, []);

  const load = useCallback((date: string) => {
    getMealEntriesForDate(date).then(setEntries);
    getWorkoutsForDate(date).then((rows) => setActivityKcal(rows.reduce((s, w) => s + w.kcalBurned, 0)));
    getWeightForDate(date).then((row) => setDayWeightKg(row?.weightKg ?? null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      load(selectedDate);
    }, [selectedDate, load])
  );

  async function handleDeleteEntry(id: string) {
    await deleteMealEntry(id);
    load(selectedDate);
    refresh();
  }

  const grouped = useMemo(() => {
    const map: Record<MealType, typeof entries> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) map[e.mealType as MealType].push(e);
    return map;
  }, [entries]);

  const totalKcal = entries.reduce((s, e) => s + e.kcal, 0);
  const isToday = selectedDate === today;
  const selectedD = new Date(`${selectedDate}T00:00:00`);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={[type.greeting, { color: c.text, fontSize: 24 }]}>ไดอารี่</Text>
          <View style={[styles.datePill, { backgroundColor: c.surface }, cardShadow(scheme)]}>
            <Calendar size={14} color={c.brand} />
            <Text style={[type.row, { color: c.text, fontSize: 14 }]}>
              {selectedD.getDate()} {THAI_MONTHS_SHORT[selectedD.getMonth()]} {selectedD.getFullYear() + 543}
            </Text>
          </View>
        </View>

        <View style={styles.weekRow}>
          {week.map((d, i) => {
            const ds = localDateString(d);
            const active = ds === selectedDate;
            const isFuture = d > new Date();
            return (
              <Pressable
                key={ds}
                style={[styles.dayCol, active && { backgroundColor: c.surface }, active && cardShadow(scheme)]}
                onPress={() => !isFuture && setSelectedDate(ds)}
                disabled={isFuture}
              >
                <View style={[styles.dayCircle, active ? { backgroundColor: c.brand } : { borderWidth: 2.5, borderColor: c.line }]}>
                  <Text style={[type.row, { fontSize: 12, color: active ? '#fff' : isFuture ? c.faint : c.subtext }]}>{DAY_LABELS[i]}</Text>
                </View>
                <Text style={[type.row, { fontSize: 13, color: active ? c.brand : isFuture ? c.faint : c.subtext }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>มื้อวันนี้</Text>
            <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>
              รวม <Text style={[type.cardTitle, { color: c.text, fontSize: 12 }]}>{Math.round(totalKcal)}</Text> kcal
            </Text>
          </View>

          {MEAL_TYPES.map((meta) => {
            const list = grouped[meta.key];
            const kcal = list.reduce((s, e) => s + e.kcal, 0);
            return (
              <View key={meta.key} style={[styles.mealCard, { backgroundColor: c.surfaceAlt }]}>
                <View style={styles.mealHeaderRow}>
                  <View style={[styles.mealIcon, { backgroundColor: c[meta.bgKey] }]}>
                    <MealTypeIcon type={meta.key} color={c[meta.colorKey]} size={13} />
                  </View>
                  <Text style={[type.cardTitle, { color: c.text, fontSize: 14, flex: 1 }]}>{meta.label}</Text>
                  {list.length > 0 ? (
                    <Text style={[type.cardTitle, { color: c.text, fontSize: 14 }]}>{Math.round(kcal)}</Text>
                  ) : isToday ? (
                    <Pressable
                      style={[styles.addPill, { backgroundColor: c.brandTint }]}
                      onPress={() => router.push({ pathname: '/add-food', params: { mealType: meta.key } })}
                    >
                      <Text style={[type.badge, { color: c.brand, fontSize: 12 }]}>+ เพิ่ม</Text>
                    </Pressable>
                  ) : null}
                </View>
                {list.length > 0 ? (
                  list.map((e) => (
                    <View key={e.id} style={styles.mealFoodRow}>
                      <Text style={[type.row, { color: c.text, fontSize: 13, flex: 1 }]} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>
                        {e.loggedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[type.row, { color: c.subtext, fontSize: 12 }]}>{Math.round(e.kcal)}</Text>
                      {isToday && (
                        <Pressable hitSlop={8} onPress={() => handleDeleteEntry(e.id)}>
                          <X size={14} color={c.faint} />
                        </Pressable>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[type.label, { color: c.faint, fontSize: 12, paddingLeft: 35 }]}>ยังไม่ได้บันทึก</Text>
                )}
              </View>
            );
          })}

          <View style={[styles.divider, { backgroundColor: c.line }]} />

          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.statLabelRow}>
                <ActivityIcon color={c.dinner} size={16} />
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>กิจกรรม</Text>
              </View>
              <Text style={[type.cardTitle, { color: c.dinner, fontSize: 18 }]}>{Math.round(activityKcal)}</Text>
              {isToday && (
                <Pressable onPress={() => router.push('/log-workout')}>
                  <Text style={[type.label, { color: c.brand, fontSize: 11 }]}>+ บันทึก</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.statCard, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.statLabelRow}>
                <ScaleIcon color={c.brand} size={16} />
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>น้ำหนัก กก.</Text>
              </View>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 18 }]}>{dayWeightKg?.toFixed(1) ?? '—'}</Text>
              {isToday && (
                <Pressable onPress={() => router.push('/account-edit')}>
                  <Text style={[type.label, { color: c.brand, fontSize: 11 }]}>+ ชั่งวันนี้</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.pill },
  weekRow: { flexDirection: 'row', gap: 2 },
  dayCol: { flex: 1, height: 70, borderRadius: radius.card - 6, alignItems: 'center', justifyContent: 'center', gap: 5 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mealCard: { borderRadius: radius.card - 6, padding: 12, gap: 9 },
  mealHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mealIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  addPill: { height: 28, paddingHorizontal: 11, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealFoodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 35 },
  divider: { height: 1, marginVertical: 2 },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: radius.card - 6, padding: 12, gap: 3 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
