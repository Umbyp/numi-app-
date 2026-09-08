import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pencil, Plus, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import {
  getWorkoutPlan,
  getWorkoutPlanCompletions,
  addWorkout,
  addWorkoutPlanCompletion,
  updateWorkoutPlan,
} from '../lib/db/queries';
import type { WorkoutPlanDay, WorkoutPlanExercise } from '../lib/db/schema';
import { calcKcalBurned, localDateString } from '../lib/nutrition';
import { WORKOUT_CATEGORIES, metsByCategory, MUSCLE_GROUPS, muscleGroupLabel, type WorkoutCategory, type MuscleGroup } from '../lib/met';
import { AmountStepper } from '../components/amount-stepper';
import { Mascot } from '../components/mascot';
import { RestTimerModal } from '../components/rest-timer-modal';
import { PlanExerciseCard } from '../components/plan-exercise-card';
import { CategoryIcon, categoryTint, DayTypeIcon, dayTypeTint } from '../components/icons/workout-icons';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const DAY_TYPE_OPTIONS: { key: WorkoutPlanDay['dayType']; label: string }[] = [
  { key: 'cardio', label: 'คาร์ดิโอ' },
  { key: 'strength', label: 'เวท' },
  { key: 'both', label: 'ทั้งคู่' },
];
const DAY_TYPE_LABEL: Record<WorkoutPlanDay['dayType'], string> = {
  cardio: 'วันคาร์ดิโอ',
  strength: 'วันเวท',
  both: 'คาร์ดิโอ + เวท',
};

/** หมวดที่ปรากฏบ่อยสุดในวันนั้น ใช้เป็น category ของ workout รวมที่บันทึกตอนกดทำ */
function dominantCategory(categories: WorkoutCategory[]): WorkoutCategory {
  const counts = new Map<WorkoutCategory, number>();
  for (const cat of categories) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  let best: WorkoutCategory = 'other';
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }
  return best;
}

export default function WorkoutPlanDetailScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const params = useLocalSearchParams<{ id: string }>();
  const { latestWeightKg, refresh } = useNumiStore();
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getWorkoutPlan>>>(null);
  const [completions, setCompletions] = useState<Awaited<ReturnType<typeof getWorkoutPlanCompletions>>>([]);
  const [completingDay, setCompletingDay] = useState<number | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [editDays, setEditDays] = useState<WorkoutPlanDay[]>([]);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [pickerCategory, setPickerCategory] = useState<WorkoutCategory>('cardio');
  const [saving, setSaving] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  /** ความคืบหน้าของเซตในรอบนี้ คีย์เป็น "วันที่:ท่าที่" เก็บในหน่วยความจำพอ ไม่ต้องลง DB */
  const [setProgress, setSetProgress] = useState<Record<string, boolean[]>>({});

  function setsOf(dayIdx: number, exIdx: number, ex: WorkoutPlanExercise): boolean[] {
    const key = `${dayIdx}:${exIdx}`;
    const count = ex.sets && ex.sets > 0 ? ex.sets : 1;
    const current = setProgress[key];
    return current && current.length === count ? current : new Array(count).fill(false);
  }

  function toggleSet(dayIdx: number, exIdx: number, ex: WorkoutPlanExercise, setIdx: number) {
    const key = `${dayIdx}:${exIdx}`;
    const current = setsOf(dayIdx, exIdx, ex);
    const next = current.map((v, i) => (i === setIdx ? !v : v));
    setSetProgress((p) => ({ ...p, [key]: next }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  /** เริ่มรอบใหม่ ล้างเฉพาะวันที่เพิ่งทำเสร็จ วันอื่นยังคาไว้ */
  function clearDayProgress(dayIdx: number) {
    setSetProgress((p) => {
      const next: Record<string, boolean[]> = {};
      for (const [k, v] of Object.entries(p)) {
        if (!k.startsWith(`${dayIdx}:`)) next[k] = v;
      }
      return next;
    });
  }

  /** เปิดโหมดแก้ไข — ตัวแก้ไขแสดงทุกวันอยู่แล้ว จึงไม่ต้องส่งว่ามาจากวันไหน */
  function openEditor() {
    if (!plan) return;
    setEditTitle(plan.title);
    setEditRationale(plan.rationale);
    setEditDays(plan.days);
    setEditing(true);
  }

  const load = useCallback(() => {
    if (!params.id) return;
    getWorkoutPlan(params.id).then(setPlan);
    getWorkoutPlanCompletions(params.id).then(setCompletions);
  }, [params.id]);

  useFocusEffect(load);

  async function handleCompleteDay(dayIndex: number) {
    if (!plan) return;
    const day = plan.days[dayIndex];
    const weightKg = latestWeightKg ?? 70;
    const durationMin = day.exercises.reduce((s, e) => s + e.durationMin, 0);
    const kcalBurned = day.exercises.reduce((s, e) => s + calcKcalBurned(e.met, weightKg, e.durationMin), 0);
    const category = dominantCategory(day.exercises.map((e) => e.category));

    setCompletingDay(dayIndex);
    try {
      const workoutId = await addWorkout({
        name: `${plan.title} · ${day.label}`,
        category,
        durationMin,
        kcalBurned,
      });
      await addWorkoutPlanCompletion({
        planId: plan.id,
        dayIndex,
        localDate: localDateString(),
        workoutId,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      clearDayProgress(dayIndex);
      await refresh();
      load();
    } finally {
      setCompletingDay(null);
    }
  }

  function startEditing() {
    if (!plan) return;
    setEditTitle(plan.title);
    setEditRationale(plan.rationale);
    setEditDays(plan.days);
    setAddingToDay(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setAddingToDay(null);
  }

  async function saveEditing() {
    if (!plan) return;
    setSaving(true);
    try {
      await updateWorkoutPlan(plan.id, { title: editTitle, rationale: editRationale, days: editDays });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditing(false);
      setAddingToDay(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  function updateDay(dayIdx: number, patch: Partial<WorkoutPlanDay>) {
    setEditDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, ...patch } : d)));
  }

  function updateExercise(dayIdx: number, exIdx: number, patch: Partial<WorkoutPlanExercise>) {
    setEditDays((prev) =>
      prev.map((d, i) =>
        i !== dayIdx ? d : { ...d, exercises: d.exercises.map((e, j) => (j === exIdx ? { ...e, ...patch } : e)) }
      )
    );
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    setEditDays((prev) =>
      prev.map((d, i) => (i !== dayIdx ? d : { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) }))
    );
  }

  function addExercise(dayIdx: number, opt: { name: string; met: number }) {
    const isStrength = pickerCategory === 'strength';
    const entry: WorkoutPlanExercise = {
      name: opt.name,
      category: pickerCategory,
      met: opt.met,
      durationMin: isStrength ? 10 : 20,
      ...(isStrength ? { sets: 3, reps: '10-12', restSec: 60 } : {}),
    };
    setEditDays((prev) => prev.map((d, i) => (i !== dayIdx ? d : { ...d, exercises: [...d.exercises, entry] })));
    setAddingToDay(null);
  }

  function addDay() {
    setEditDays((prev) => [...prev, { label: `วันที่ ${prev.length + 1}`, dayType: 'both', exercises: [] }]);
  }

  function removeDay(dayIdx: number) {
    setEditDays((prev) => prev.filter((_, i) => i !== dayIdx));
  }

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
        <View style={styles.emptyState}>
          <Mascot size={56} />
          <Text style={[textType.label, { color: c.subtext, textAlign: 'center' }]}>ไม่พบแผนนี้</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cardStyle = [styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)];
  const inputStyle = [styles.input, { color: c.text, backgroundColor: c.surfaceAlt }];

  if (editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TextInput style={[inputStyle, { fontFamily: fontFamily(700), fontSize: 16 }]} value={editTitle} onChangeText={setEditTitle} />
          <TextInput
            style={[inputStyle, { fontFamily: fontFamily(500), fontSize: 13, minHeight: 60 }]}
            value={editRationale}
            onChangeText={setEditRationale}
            multiline
          />

          {editDays.map((day, dayIdx) => (
            <View key={dayIdx} style={cardStyle}>
              <View style={styles.dayEditHeader}>
                <TextInput
                  style={[inputStyle, { flex: 1, fontFamily: fontFamily(700), fontSize: 14 }]}
                  value={day.label}
                  onChangeText={(v) => updateDay(dayIdx, { label: v })}
                />
                <Pressable hitSlop={10} onPress={() => removeDay(dayIdx)}>
                  <X size={18} color={c.faint} />
                </Pressable>
              </View>

              <View style={styles.chipRow}>
                {DAY_TYPE_OPTIONS.map((opt) => {
                  const active = opt.key === day.dayType;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateDay(dayIdx, { dayType: opt.key })}
                      style={[styles.chip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
                    >
                      <DayTypeIcon dayType={opt.key} size={13} color={active ? '#fff' : c.subtext} />
                      <Text style={[textType.row, { fontSize: 12, color: active ? '#fff' : c.text }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={inputStyle}
                value={day.warmup ?? ''}
                onChangeText={(v) => updateDay(dayIdx, { warmup: v })}
                placeholder="ก่อนเล่น (warm-up)"
                placeholderTextColor={c.faint}
              />
              <TextInput
                style={inputStyle}
                value={day.duringNote ?? ''}
                onChangeText={(v) => updateDay(dayIdx, { duringNote: v })}
                placeholder="ระหว่างเล่น"
                placeholderTextColor={c.faint}
              />
              <TextInput
                style={inputStyle}
                value={day.cooldown ?? ''}
                onChangeText={(v) => updateDay(dayIdx, { cooldown: v })}
                placeholder="หลังเล่น (cool-down)"
                placeholderTextColor={c.faint}
              />

              {day.exercises.map((ex, exIdx) => {
                const exTint = categoryTint(ex.category, c);
                return (
                <View key={exIdx} style={[styles.exerciseEditCard, { borderColor: c.line }]}>
                  <View style={styles.exerciseEditHeader}>
                    <View style={[styles.smallIconBox, { backgroundColor: exTint.bg }]}>
                      <CategoryIcon category={ex.category} size={15} color={exTint.icon} />
                    </View>
                    <Text style={[textType.row, { color: c.text, fontSize: 13, flex: 1 }]} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Pressable hitSlop={10} onPress={() => removeExercise(dayIdx, exIdx)}>
                      <X size={16} color={c.muted} />
                    </Pressable>
                  </View>
                  <View style={styles.stepperRow}>
                    <AmountStepper value={ex.durationMin} step={5} min={5} unit=" นาที" onChange={(v) => updateExercise(dayIdx, exIdx, { durationMin: v })} />
                    {ex.category === 'strength' && (
                      <>
                        <AmountStepper value={ex.sets ?? 3} step={1} min={1} unit=" เซต" onChange={(v) => updateExercise(dayIdx, exIdx, { sets: v })} />
                        <AmountStepper value={ex.restSec ?? 60} step={15} min={0} unit=" วิ" onChange={(v) => updateExercise(dayIdx, exIdx, { restSec: v })} />
                      </>
                    )}
                  </View>
                  {ex.category === 'strength' && (
                    <TextInput
                      style={inputStyle}
                      value={ex.reps ?? ''}
                      onChangeText={(v) => updateExercise(dayIdx, exIdx, { reps: v })}
                      placeholder='จำนวนครั้งต่อเซต เช่น "10-12"'
                      placeholderTextColor={c.faint}
                    />
                  )}
                  <View style={styles.chipRow}>
                    {MUSCLE_GROUPS.map((m) => {
                      const active = m.key === ex.muscleGroup;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => updateExercise(dayIdx, exIdx, { muscleGroup: active ? undefined : m.key })}
                          style={[styles.muscleChip, { backgroundColor: active ? exTint.bg : c.surfaceAlt }]}
                        >
                          <Text style={[textType.badge, { color: active ? exTint.icon : c.faint }]}>{m.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                );
              })}

              {addingToDay === dayIdx ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.chipRow}>
                    {WORKOUT_CATEGORIES.map((cat) => {
                      const active = cat.key === pickerCategory;
                      return (
                        <Pressable
                          key={cat.key}
                          onPress={() => setPickerCategory(cat.key)}
                          style={[styles.chip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
                        >
                          <CategoryIcon category={cat.key} size={13} color={active ? '#fff' : c.subtext} />
                          <Text style={[textType.row, { fontSize: 12, color: active ? '#fff' : c.text }]}>{cat.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {metsByCategory(pickerCategory).map((opt) => {
                    const pTint = categoryTint(pickerCategory, c);
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => addExercise(dayIdx, opt)}
                        style={[styles.exerciseOption, { backgroundColor: c.surfaceAlt }]}
                      >
                        <View style={[styles.smallIconBox, { backgroundColor: pTint.bg }]}>
                          <CategoryIcon category={pickerCategory} size={15} color={pTint.icon} />
                        </View>
                        <Text style={[textType.row, { fontSize: 13, color: c.text, flex: 1 }]}>{opt.name}</Text>
                        <Text style={[textType.label, { fontSize: 11, color: c.faint }]}>MET {opt.met}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => setAddingToDay(null)}>
                    <Text style={[textType.row, { color: c.subtext, fontSize: 12, textAlign: 'center' }]}>ปิด</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={[styles.addRow, { backgroundColor: c.surfaceAlt }]} onPress={() => { setAddingToDay(dayIdx); setPickerCategory('cardio'); }}>
                  <Plus size={14} color={c.brand} />
                  <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>เพิ่มท่า</Text>
                </Pressable>
              )}
            </View>
          ))}

          <Pressable style={[styles.addRow, { backgroundColor: c.surfaceAlt }]} onPress={addDay}>
            <Plus size={14} color={c.brand} />
            <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>เพิ่มวัน</Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable style={[styles.ghostBtn, { backgroundColor: c.surfaceAlt }]} onPress={cancelEditing}>
              <Text style={[textType.row, { color: c.subtext, fontSize: 14 }]}>ยกเลิก</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]} disabled={saving} onPress={saveEditing}>
              <Text style={[textType.row, { color: '#fff', fontSize: 14 }]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[textType.cardTitle, { color: c.text, fontSize: 20 }]}>{plan.title}</Text>
            <Text style={[textType.label, { color: c.subtext, fontSize: 13, lineHeight: 20 }]}>{plan.rationale}</Text>
          </View>
          <Pressable style={[styles.editPill, { backgroundColor: c.brandTint }]} onPress={startEditing}>
            <Pencil size={14} color={c.brand} />
            <Text style={[textType.row, { color: c.brand, fontSize: 12 }]}>แก้ไข</Text>
          </Pressable>
        </View>

        {plan.days.map((day, dayIdx) => {
          const dayCompletions = completions
            .filter((comp) => comp.dayIndex === dayIdx)
            .map((comp) => {
              const d = new Date(`${comp.localDate}T00:00:00`);
              return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
            });

          const dTint = dayTypeTint(day.dayType, c);
          return (
            <View key={dayIdx} style={[...cardStyle, { borderLeftWidth: 4, borderLeftColor: dTint.icon }]}>
              <View style={styles.dayHeaderRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>{day.label}</Text>
                  <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>
                    {day.exercises.length} ท่า · {day.exercises.reduce((s, e) => s + e.durationMin, 0)} นาที · ราว{' '}
                    {Math.round(
                      day.exercises.reduce(
                        (s, e) => s + calcKcalBurned(e.met, latestWeightKg ?? 70, e.durationMin),
                        0
                      )
                    )}{' '}
                    kcal
                  </Text>
                </View>
                <View style={[styles.dayTypeBadge, { backgroundColor: dTint.bg }]}>
                  <DayTypeIcon dayType={day.dayType} size={12} color={dTint.icon} />
                  <Text style={[textType.badge, { color: dTint.icon }]}>{DAY_TYPE_LABEL[day.dayType]}</Text>
                </View>
              </View>
              {day.warmup && <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>ก่อนเล่น: {day.warmup}</Text>}
              {day.duringNote && <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>ระหว่างเล่น: {day.duringNote}</Text>}
              {day.cooldown && <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>หลังเล่น: {day.cooldown}</Text>}

              {day.exercises.map((ex, exIdx) => (
                <PlanExerciseCard
                  key={exIdx}
                  exercise={ex}
                  done={setsOf(dayIdx, exIdx, ex)}
                  onToggleSet={(setIdx) => toggleSet(dayIdx, exIdx, ex, setIdx)}
                  onRest={(sec) => setTimerSeconds(sec)}
                  onEdit={openEditor}
                />
              ))}

              {(() => {
                const totalSets = day.exercises.reduce(
                  (sum, ex, exIdx) => sum + setsOf(dayIdx, exIdx, ex).length,
                  0
                );
                const doneSets = day.exercises.reduce(
                  (sum, ex, exIdx) => sum + setsOf(dayIdx, exIdx, ex).filter(Boolean).length,
                  0
                );
                const pct = totalSets > 0 ? doneSets / totalSets : 0;
                return (
                  <>
                    {totalSets > 0 && (
                      <View style={styles.progressWrap}>
                        <View style={[styles.progressTrack, { backgroundColor: c.line }]}>
                          <View
                            style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: dTint.icon }]}
                          />
                        </View>
                        <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>
                          {doneSets}/{totalSets} เซต
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={[styles.doneBtn, { backgroundColor: c.brand }, completingDay === dayIdx && { opacity: 0.6 }]}
                      disabled={completingDay === dayIdx}
                      onPress={() => handleCompleteDay(dayIdx)}
                    >
                      <Text style={[textType.row, { color: '#fff', fontSize: 13 }]}>
                        {doneSets > 0 && doneSets < totalSets ? `บันทึกวันนี้ (${doneSets}/${totalSets} เซต) ✓` : 'ทำวันนี้ ✓'}
                      </Text>
                    </Pressable>
                  </>
                );
              })()}

              {dayCompletions.length > 0 && (
                <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>ทำแล้ว: {dayCompletions.join(', ')}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
      <RestTimerModal visible={timerSeconds != null} seconds={timerSeconds ?? 0} onClose={() => setTimerSeconds(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 14 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 12, height: 32 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  smallIconBox: { width: 32, height: 32, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { borderRadius: radius.iconBox, paddingVertical: 11, alignItems: 'center', marginTop: 4 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  dayEditHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  muscleChip: { height: 26, paddingHorizontal: 9, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center' },
  exerciseEditCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.cardInner, padding: 10, gap: 8 },
  exerciseEditHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  exerciseOption: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 10, borderRadius: radius.iconBox },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.iconBox },
  actions: { flexDirection: 'row', gap: 10 },
  ghostBtn: { flex: 1, borderRadius: radius.iconBox, paddingVertical: 13, alignItems: 'center' },
  primaryBtn: { flex: 1, borderRadius: radius.iconBox, paddingVertical: 13, alignItems: 'center' },
});
