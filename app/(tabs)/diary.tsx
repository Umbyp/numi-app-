import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import {
  getMealEntriesForDate,
  getWorkoutsForDate,
  getWeightForDate,
  deleteMealEntry,
  repeatMealsFrom,
  type MealType,
} from '../../lib/db/queries';
import { localDateString } from '../../lib/nutrition';
import { addDays } from '../../lib/dates';
import { MEAL_TYPES, getMealTypeMeta } from '../../lib/meal-type';
import { MealTypeIcon } from '../../components/icons/meal-type-icons';
import { ActivityIcon, ScaleIcon } from '../../components/icons/nav-icons';
import { FoodVisual } from '../../components/food-visual';
import { FadeInView } from '../../components/fade-in';
import { DatePickerModal } from '../../components/date-picker-modal';
import { Mascot } from '../../components/mascot';
import { AnimatedNumber } from '../../components/animated-number';
import { MealTemplateSheet } from '../../components/meal-template-sheet';
import { type } from '../../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../../lib/theme';

const DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

/** สัปดาห์ (จันทร์-อาทิตย์) ที่ครอบคลุมวันที่ระบุ — ไม่ใช่สัปดาห์ปัจจุบันเสมอ เพราะต้องเลื่อนตามวันที่เลือกจากปฏิทินได้ */
function weekContaining(reference: Date): Date[] {
  const dow = (reference.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - dow);
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [yesterdayKcal, setYesterdayKcal] = useState<Partial<Record<MealType, number>>>({});
  const [sheet, setSheet] = useState<{ mode: 'pick' | 'save'; mealType: MealType; label: string } | null>(null);
  const week = useMemo(() => weekContaining(new Date(`${selectedDate}T00:00:00`)), [selectedDate]);

  const load = useCallback((date: string) => {
    getMealEntriesForDate(date).then(setEntries);
    // ดูว่าวันก่อนหน้ากินมื้อไหนไว้บ้าง จะได้เสนอปุ่มกินซ้ำเฉพาะมื้อที่มีของจริง
    getMealEntriesForDate(addDays(date, -1)).then((rows) => {
      const map: Partial<Record<MealType, number>> = {};
      for (const r of rows) {
        const k = r.mealType as MealType;
        map[k] = (map[k] ?? 0) + r.kcal;
      }
      setYesterdayKcal(map);
    });
    getWorkoutsForDate(date).then((rows) => setActivityKcal(rows.reduce((s, w) => s + w.kcalBurned, 0)));
    getWeightForDate(date).then((row) => setDayWeightKg(row?.weightKg ?? null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      load(selectedDate);
    }, [selectedDate, load])
  );

  async function handleRepeat(mealType: MealType) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await repeatMealsFrom(addDays(selectedDate, -1), mealType);
    load(selectedDate);
    refresh();
  }

  async function handleDeleteEntry(id: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  const allMealsLogged = MEAL_TYPES.every((meta) => grouped[meta.key].length > 0);
  const isToday = selectedDate === today;
  const selectedD = new Date(`${selectedDate}T00:00:00`);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={[type.greeting, { color: c.text, fontSize: 24 }]}>ไดอารี่</Text>
          <Pressable
            style={[styles.datePill, { backgroundColor: c.surface }, cardShadow(scheme)]}
            onPress={() => setPickerOpen(true)}
          >
            <Calendar size={14} color={c.brand} />
            <Text style={[type.row, { color: c.text, fontSize: 14 }]}>
              {selectedD.getDate()} {THAI_MONTHS_SHORT[selectedD.getMonth()]} {selectedD.getFullYear() + 543}
            </Text>
          </Pressable>
        </View>

        <DatePickerModal
          visible={pickerOpen}
          selectedDate={selectedDate}
          onSelect={(d) => {
            setSelectedDate(d);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />

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
                  <Text style={[type.row, { fontSize: 12, color: active ? c.onBrand : isFuture ? c.faint : c.subtext }]}>{DAY_LABELS[i]}</Text>
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
              รวม{' '}
              <AnimatedNumber value={totalKcal} style={[type.cardTitle, { color: c.text, fontSize: 12 }]} /> kcal
            </Text>
          </View>

          {MEAL_TYPES.map((meta) => {
            const list = grouped[meta.key];
            const kcal = list.reduce((s, e) => s + e.kcal, 0);
            return (
              <View
                key={meta.key}
                style={[styles.mealCard, { backgroundColor: c.surfaceAlt, borderLeftColor: c[meta.colorKey] }]}
              >
                <View style={styles.mealHeaderRow}>
                  <View style={[styles.mealIcon, { backgroundColor: c[meta.bgKey] }]}>
                    <MealTypeIcon type={meta.key} color={c[meta.colorKey]} size={13} />
                  </View>
                  <Text style={[type.cardTitle, { color: c.text, fontSize: 14, flex: 1 }]}>{meta.label}</Text>
                  {list.length > 0 && (
                    <Text style={[type.cardTitle, { color: c.text, fontSize: 14 }]}>
                      {Math.round(kcal)}
                      <Text style={[type.label, { color: c.faint, fontSize: 11 }]}> kcal</Text>
                    </Text>
                  )}
                  {/* ปุ่มเพิ่มอยู่ตลอดเมื่อเป็นวันนี้ ของเดิมโชว์เฉพาะตอนมื้อยังว่าง
                      พอมีอาหารแล้วปุ่มถูกแทนด้วยตัวเลข เลยเพิ่มรายการที่สองไม่ได้ */}
                  {isToday && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.addBtn,
                        { backgroundColor: c.brandTint },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => router.push({ pathname: '/add-food', params: { mealType: meta.key } })}
                    >
                      <Plus size={17} color={c.brand} strokeWidth={2.6} />
                    </Pressable>
                  )}
                </View>
                {list.length > 0 ? (
                  list.map((e) => (
                    <FadeInView key={e.id} style={styles.mealFoodRow}>
                      <FoodVisual name={e.name} photoUri={e.photoUri} size={28} />
                      <Text style={[type.row, { color: c.text, fontSize: 13, flex: 1 }]} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>
                        {e.loggedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[type.row, { color: c.subtext, fontSize: 12 }]}>{Math.round(e.kcal)}</Text>
                      {isToday && (
                        <Pressable style={styles.rowDeleteBtn} onPress={() => handleDeleteEntry(e.id)}>
                          <X size={15} color={c.faint} />
                        </Pressable>
                      )}
                    </FadeInView>
                  ))
                ) : isToday ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyRow,
                      { borderColor: c.line },
                      pressed && { backgroundColor: c.surface },
                    ]}
                    onPress={() => router.push({ pathname: '/add-food', params: { mealType: meta.key } })}
                  >
                    <Plus size={14} color={c.muted} />
                    <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>แตะเพื่อเพิ่มอาหาร</Text>
                  </Pressable>
                ) : (
                  <Text style={[type.label, { color: c.faint, fontSize: 12, paddingLeft: 35 }]}>ไม่ได้บันทึกไว้</Text>
                )}

                {isToday && (
                  <View style={styles.shortcutRow}>
                    {list.length === 0 && yesterdayKcal[meta.key] ? (
                      <Pressable
                        style={[styles.shortcutPill, { backgroundColor: c.surface }]}
                        onPress={() => handleRepeat(meta.key)}
                      >
                        <Text style={[type.badge, { color: c.subtext, fontSize: 11 }]}>
                          ↻ ซ้ำเมื่อวาน · {Math.round(yesterdayKcal[meta.key] as number)}
                        </Text>
                      </Pressable>
                    ) : null}
                    {list.length === 0 ? (
                      <Pressable
                        style={[styles.shortcutPill, { backgroundColor: c.surface }]}
                        onPress={() => setSheet({ mode: 'pick', mealType: meta.key, label: meta.label })}
                      >
                        <Text style={[type.badge, { color: c.subtext, fontSize: 11 }]}>มื้อชุด</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.shortcutPill, { backgroundColor: c.surface }]}
                        onPress={() => setSheet({ mode: 'save', mealType: meta.key, label: meta.label })}
                      >
                        <Text style={[type.badge, { color: c.subtext, fontSize: 11 }]}>เก็บเป็นมื้อชุด</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {allMealsLogged && isToday && (
            <View style={[styles.completeRow, { backgroundColor: c.brandTint }]}>
              <Mascot size={38} pose="goal" />
              <Text style={[type.row, { color: c.text, fontSize: 12.5, flex: 1 }]}>
                บันทึกครบทั้งสี่มื้อแล้ววันนี้
              </Text>
            </View>
          )}

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

      {sheet && (
        <MealTemplateSheet
          visible
          mode={sheet.mode}
          mealType={sheet.mealType}
          mealLabel={sheet.label}
          localDate={selectedDate}
          onClose={() => setSheet(null)}
          onDone={() => {
            load(selectedDate);
            refresh();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.pill },
  weekRow: { flexDirection: 'row', gap: 2 },
  dayCol: { flex: 1, height: 70, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center', gap: 5 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  mealCard: { borderRadius: radius.cardInner, padding: 12, gap: 9, borderLeftWidth: 3 },
  mealHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mealIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: MIN_TOUCH,
    borderRadius: radius.iconBox,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  mealFoodRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // เป้ากดตามเกณฑ์ขั้นต่ำ ของเดิมไอคอน 14px + hitSlop 8 ได้แค่ 30px
  rowDeleteBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  shortcutRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 35 },
  shortcutPill: { height: 26, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginVertical: 2 },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.cardInner,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: radius.cardInner, padding: 12, gap: 3 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
