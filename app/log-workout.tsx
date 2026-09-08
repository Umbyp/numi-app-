import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Timer } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import {
  addWorkout,
  getStrengthSessions,
  getLastSetsForExercise,
  getRecentExerciseNames,
} from '../lib/db/queries';
import { calcKcalBurned } from '../lib/nutrition';
import { WORKOUT_CATEGORIES, metsByCategory, type WorkoutCategory } from '../lib/met';
import { AmountStepper } from '../components/amount-stepper';
import { RestTimerModal } from '../components/rest-timer-modal';
import { type as textType } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import {
  bestSetBy1RM,
  exerciseVolume,
  findNewRecords,
  is1RMReliable,
  RECORD_LABELS,
  RELIABLE_REPS,
  type SessionLike,
} from '../lib/strength';
import type { ExerciseSet } from '../lib/db/schema';

interface DraftSet {
  kg: string;
  reps: string;
}

interface DraftExercise {
  exercise: string;
  sets: DraftSet[];
  /** สรุปเซ็ตของครั้งก่อน ไว้เทียบว่าคราวนี้ทำได้มากกว่าเดิมไหม */
  lastHint?: string;
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function shortDate(localDate: string): string {
  const d = new Date(`${localDate}T00:00:00`);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
}

export default function LogWorkoutScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { latestWeightKg, refresh } = useNumiStore();

  const [category, setCategory] = useState<WorkoutCategory>('cardio');
  const options = useMemo(() => metsByCategory(category), [category]);
  const [metKey, setMetKey] = useState(options[0]?.key ?? '');
  const [durationMin, setDurationMin] = useState(30);
  const [saving, setSaving] = useState(false);

  // สมุดบันทึกเซ็ต ใช้เฉพาะหมวดเวท
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [newName, setNewName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [restVisible, setRestVisible] = useState(false);

  const isStrength = category === 'strength';

  useEffect(() => {
    if (isStrength && suggestions.length === 0) {
      getRecentExerciseNames().then(setSuggestions);
    }
  }, [isStrength, suggestions.length]);

  const selected = options.find((m) => m.key === metKey) ?? options[0];
  const weightKg = latestWeightKg ?? 70;
  const kcalBurned = selected ? calcKcalBurned(selected.met, weightKg, durationMin) : 0;

  function pickCategory(cat: WorkoutCategory) {
    setCategory(cat);
    const first = metsByCategory(cat)[0];
    setMetKey(first?.key ?? '');
  }

  const addExercise = useCallback(async (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    // เติมเซ็ตของครั้งก่อนให้เลย คนเล่นเวทส่วนใหญ่ทำน้ำหนักเดิมหรือเพิ่มทีละนิด
    const last = await getLastSetsForExercise(name);
    setExercises((prev) => [
      ...prev,
      {
        exercise: name,
        sets: last
          ? last.sets.map((s) => ({ kg: String(s.kg), reps: String(s.reps) }))
          : [{ kg: '', reps: '' }],
        lastHint: last
          ? `ครั้งก่อน ${shortDate(last.localDate)} · ${last.sets.map((s) => `${s.kg}×${s.reps}`).join(', ')}`
          : undefined,
      },
    ]);
    setNewName('');
  }, []);

  function updateSet(exIdx: number, setIdx: number, patch: Partial<DraftSet>) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
      )
    );
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { kg: last?.kg ?? '', reps: last?.reps ?? '' }] };
      })
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => (i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }))
    );
  }

  /** เก็บเฉพาะเซ็ตที่กรอกครบและเป็นค่าที่เป็นไปได้ */
  const cleaned = useMemo<ExerciseSet[]>(
    () =>
      exercises
        .map((ex) => ({
          exercise: ex.exercise,
          sets: ex.sets
            .map((s) => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps, 10) }))
            .filter((s) => Number.isFinite(s.kg) && s.kg >= 0 && Number.isFinite(s.reps) && s.reps > 0),
        }))
        .filter((ex) => ex.sets.length > 0),
    [exercises]
  );

  const totalVolume = cleaned.reduce((sum, ex) => sum + exerciseVolume(ex.sets), 0);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      // ต้องอ่านประวัติก่อนบันทึก ไม่งั้นเซสชันนี้จะกลายเป็นคู่เทียบของตัวเอง
      let records: ReturnType<typeof findNewRecords> = [];
      if (isStrength && cleaned.length > 0) {
        const history = await getStrengthSessions();
        const asLike: SessionLike[] = history.map((h) => ({
          id: h.id,
          localDate: h.localDate,
          sets: h.sets ?? null,
        }));
        records = findNewRecords(cleaned, asLike);
      }

      await addWorkout({
        name: selected.name,
        category,
        met: selected.met,
        durationMin,
        kcalBurned,
        sets: isStrength && cleaned.length > 0 ? cleaned : null,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refresh();

      if (records.length > 0) {
        const lines = records.map((r) => {
          const value = r.kind === 'volume' ? Math.round(r.value).toLocaleString() : r.value.toFixed(1);
          const from =
            r.previous > 0
              ? ` (เดิม ${r.kind === 'volume' ? Math.round(r.previous).toLocaleString() : r.previous.toFixed(1)})`
              : ' (ครั้งแรก)';
          return `${r.exercise} · ${RECORD_LABELS[r.kind]} ${value} kg${from}`;
        });
        Alert.alert('สถิติใหม่', lines.join('\n'), [{ text: 'เยี่ยม', onPress: () => router.back() }]);
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !exercises.some((ex) => ex.exercise.toLowerCase() === s.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.chipRow}>
          {WORKOUT_CATEGORIES.map((cat) => {
            const active = cat.key === category;
            return (
              <Pressable
                key={cat.key}
                onPress={() => pickCategory(cat.key)}
                style={[styles.catChip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
              >
                <Text style={[textType.row, { fontSize: 13, color: active ? c.onBrand : c.text }]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.exerciseList}>
          {options.map((opt) => {
            const active = opt.key === metKey;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setMetKey(opt.key)}
                style={[styles.exerciseRow, { backgroundColor: active ? c.brandTint : c.surfaceAlt }]}
              >
                <Text style={[textType.row, { fontSize: 14, color: active ? c.brand : c.text, flex: 1 }]}>{opt.name}</Text>
                <Text style={[textType.label, { fontSize: 11, color: c.faint }]}>MET {opt.met}</Text>
              </Pressable>
            );
          })}
        </View>

        {isStrength && (
          <View style={[styles.setsCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            <View style={styles.setsHead}>
              <Text style={[textType.label, { color: c.muted, fontSize: 12, flex: 1 }]}>
                จดเซตที่ทำ (ไม่บังคับ)
              </Text>
              <Pressable
                onPress={() => setRestVisible(true)}
                style={[styles.restBtn, { backgroundColor: c.surfaceAlt }]}
                hitSlop={6}
              >
                <Timer size={14} color={c.brand} />
                <Text style={[textType.label, { color: c.brand, fontSize: 11 }]}>พัก</Text>
              </Pressable>
            </View>

            <View style={styles.addRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="ชื่อท่า เช่น Bench Press"
                placeholderTextColor={c.faint}
                onSubmitEditing={() => addExercise(newName)}
                returnKeyType="done"
                style={[styles.input, { flex: 1, color: c.text, backgroundColor: c.surfaceAlt }]}
              />
              <Pressable onPress={() => addExercise(newName)} style={[styles.addBtn, { backgroundColor: c.brand }]}>
                <Plus size={18} color="#fff" />
              </Pressable>
            </View>

            {unusedSuggestions.length > 0 && (
              <View style={styles.chipWrap}>
                {unusedSuggestions.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => addExercise(s)}
                    style={[styles.suggestChip, { backgroundColor: c.surfaceAlt }]}
                  >
                    <Text style={[textType.label, { color: c.text, fontSize: 12 }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {exercises.map((ex, exIdx) => {
              const parsed = cleaned.find((x) => x.exercise.toLowerCase() === ex.exercise.toLowerCase());
              const best = parsed ? bestSetBy1RM(parsed.sets) : null;
              return (
                <View key={`${ex.exercise}-${exIdx}`} style={[styles.exBlock, { borderTopColor: c.line }]}>
                  <View style={styles.exHead}>
                    <Text style={[textType.row, { color: c.text, fontSize: 14, flex: 1 }]}>{ex.exercise}</Text>
                    <Pressable hitSlop={10} onPress={() => setExercises((p) => p.filter((_, i) => i !== exIdx))}>
                      <X size={15} color={c.faint} />
                    </Pressable>
                  </View>

                  {ex.lastHint && (
                    <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>{ex.lastHint}</Text>
                  )}

                  {ex.sets.map((s, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={[textType.label, styles.setIdx, { color: c.faint, fontSize: 12 }]}>{setIdx + 1}</Text>
                      <TextInput
                        value={s.kg}
                        onChangeText={(v) => updateSet(exIdx, setIdx, { kg: v })}
                        keyboardType="numeric"
                        placeholder="kg"
                        placeholderTextColor={c.faint}
                        style={[styles.input, styles.setInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                      />
                      <TextInput
                        value={s.reps}
                        onChangeText={(v) => updateSet(exIdx, setIdx, { reps: v })}
                        keyboardType="numeric"
                        placeholder="ครั้ง"
                        placeholderTextColor={c.faint}
                        style={[styles.input, styles.setInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                      />
                      <Pressable
                        hitSlop={8}
                        style={styles.setX}
                        disabled={ex.sets.length === 1}
                        onPress={() => removeSet(exIdx, setIdx)}
                      >
                        <X size={13} color={ex.sets.length === 1 ? c.line : c.faint} />
                      </Pressable>
                    </View>
                  ))}

                  <View style={styles.exFoot}>
                    <Pressable onPress={() => addSet(exIdx)} style={styles.addSet} hitSlop={6}>
                      <Plus size={13} color={c.brand} />
                      <Text style={[textType.label, { color: c.brand, fontSize: 12 }]}>เพิ่มเซต</Text>
                    </Pressable>
                    {best && (
                      <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>
                        1RM ประมาณ {best.oneRm.toFixed(1)} kg
                        {is1RMReliable(best.set.reps) ? '' : ` · เกิน ${RELIABLE_REPS} ครั้ง ค่าจะเพี้ยน`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {totalVolume > 0 && (
              <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
                ยกรวม {Math.round(totalVolume).toLocaleString()} kg
              </Text>
            )}
          </View>
        )}

        <View style={[styles.durationCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>ระยะเวลา</Text>
          <AmountStepper value={durationMin} step={5} unit=" นาที" min={5} onChange={setDurationMin} />
        </View>

        <View style={[styles.estimateCard, { backgroundColor: c.surfaceAlt }]}>
          <View style={{ flex: 1 }}>
            <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>Numi ประเมินว่าเผาผลาญ</Text>
            <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>คำนวณจากน้ำหนัก {weightKg.toFixed(1)} กก.</Text>
          </View>
          <Text style={[textType.metric, { color: c.brand, fontSize: 26 }]}>{kcalBurned}</Text>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: c.brand }, (saving || !selected) && { opacity: 0.6 }, cardShadow(scheme)]}
          disabled={saving || !selected}
          onPress={handleSave}
        >
          <Text style={[textType.row, { color: c.onBrand, fontSize: 15 }]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={[textType.row, { color: c.subtext, fontSize: 14 }]}>ยกเลิก</Text>
        </Pressable>
      </ScrollView>

      <RestTimerModal visible={restVisible} seconds={90} onClose={() => setRestVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 16 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catChip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  exerciseList: { gap: 6 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 14, borderRadius: radius.iconBox },
  setsCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  setsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: radius.pill },
  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { width: 44, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip: { paddingHorizontal: 11, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  exBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 7 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIdx: { width: 18, textAlign: 'center' },
  setInput: { flex: 1, textAlign: 'center' },
  setX: { width: 20, alignItems: 'center' },
  exFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  durationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  estimateCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cardInner, padding: 14 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
  cancelBtn: { alignItems: 'center', paddingVertical: 6 },
});
