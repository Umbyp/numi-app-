import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { RestTimer } from '../components/rest-timer';
import { useTheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import {
  addWorkout,
  getLastSetsForExercise,
  getRecentExerciseNames,
  getStrengthSessions,
} from '../lib/db/queries';
import { calcKcalBurned } from '../lib/nutrition';
import { findActivity } from '../lib/mets';
import {
  bestSetBy1RM,
  exerciseVolume,
  findNewRecords,
  is1RMReliable,
  RECORD_LABELS,
  RELIABLE_REPS,
  type SessionLike,
} from '../lib/strength';
import { formatDayRelative } from '../lib/dates';
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

const INTENSITIES = [
  { id: 'weights_light', label: 'เบา-ปานกลาง' },
  { id: 'weights_hard', label: 'หนัก' },
] as const;

export default function LogStrengthScreen() {
  const c = useTheme();
  const router = useRouter();
  const { latestWeightKg, refresh } = useNumiStore();

  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [newName, setNewName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [intensityId, setIntensityId] = useState<string>('weights_light');
  const [durationMin, setDurationMin] = useState('45');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecentExerciseNames().then(setSuggestions);
  }, []);

  const weightKg = latestWeightKg ?? 70;
  const activity = findActivity(intensityId)!;

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
          ? `ครั้งก่อน ${formatDayRelative(last.localDate)} · ${last.sets
              .map((s) => `${s.kg}×${s.reps}`)
              .join(', ')}`
          : undefined,
      },
    ]);
    setNewName('');
  }, []);

  function updateSet(exIdx: number, setIdx: number, patch: Partial<DraftSet>) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) }
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
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
      )
    );
  }

  function removeExercise(exIdx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  }

  /** เก็บเฉพาะเซ็ตที่กรอกครบและเป็นค่าที่เป็นไปได้ */
  const cleaned = useMemo<ExerciseSet[]>(() => {
    return exercises
      .map((ex) => ({
        exercise: ex.exercise,
        sets: ex.sets
          .map((s) => ({ kg: parseFloat(s.kg), reps: parseInt(s.reps, 10) }))
          .filter((s) => Number.isFinite(s.kg) && s.kg >= 0 && Number.isFinite(s.reps) && s.reps > 0),
      }))
      .filter((ex) => ex.sets.length > 0);
  }, [exercises]);

  const volume = cleaned.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, x) => s + x.kg * x.reps, 0),
    0
  );

  const kcal = useMemo(() => {
    const min = parseFloat(durationMin);
    if (!min || min <= 0) return 0;
    return calcKcalBurned(activity.met, weightKg, min);
  }, [activity, weightKg, durationMin]);

  async function handleSave() {
    if (cleaned.length === 0) {
      Alert.alert('ยังไม่มีเซ็ตที่บันทึกได้', 'กรอกน้ำหนักและจำนวนครั้งอย่างน้อยหนึ่งเซ็ต');
      return;
    }
    const min = parseFloat(durationMin);
    if (!min || min <= 0 || min > 600) {
      Alert.alert('เวลาไม่ถูกต้อง', 'กรอกเป็นนาที ระหว่าง 1 ถึง 600');
      return;
    }
    setSaving(true);
    try {
      // ต้องอ่านประวัติก่อนบันทึก ไม่งั้นเซสชันนี้จะกลายเป็นคู่เทียบของตัวเอง
      const history = await getStrengthSessions();
      const asLike: SessionLike[] = history.map((h) => ({
        id: h.id,
        localDate: h.localDate,
        sets: h.sets ?? null,
      }));
      const records = findNewRecords(cleaned, asLike);

      await addWorkout({
        name: 'เวทเทรนนิ่ง',
        category: 'strength',
        met: activity.met,
        durationMin: min,
        kcalBurned: calcKcalBurned(activity.met, weightKg, min),
        sets: cleaned,
      });
      await refresh();

      if (records.length > 0) {
        const lines = records.map((r) => {
          const value = r.kind === 'volume' ? Math.round(r.value).toLocaleString() : r.value.toFixed(1);
          const from = r.previous > 0
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

  const unused = suggestions.filter(
    (s) => !exercises.some((ex) => ex.exercise.toLowerCase() === s.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <RestTimer />

        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="ชื่อท่า เช่น Bench Press"
            placeholderTextColor={c.subtext}
            onSubmitEditing={() => addExercise(newName)}
            returnKeyType="done"
            style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.card }]}
          />
          <Pressable
            onPress={() => addExercise(newName)}
            style={[styles.addBtn, { backgroundColor: c.primary }]}
          >
            <Plus size={18} color="#fff" />
          </Pressable>
        </View>

        {unused.length > 0 && (
          <View style={styles.chips}>
            {unused.map((s) => (
              <Pressable
                key={s}
                onPress={() => addExercise(s)}
                style={[styles.chip, { borderColor: c.border, backgroundColor: c.card }]}
              >
                <Text style={{ color: c.text, fontSize: 13 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {exercises.length === 0 && (
          <Text style={{ color: c.subtext, fontSize: 13 }}>
            เพิ่มท่าแรกเพื่อเริ่มบันทึก ถ้าเคยทำท่านี้มาก่อน ระบบจะเติมเซ็ตของครั้งก่อนให้อัตโนมัติ
          </Text>
        )}

        {exercises.map((ex, exIdx) => (
          <View
            key={`${ex.exercise}-${exIdx}`}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <View style={styles.exHead}>
              <Text style={[styles.exName, { color: c.text }]}>{ex.exercise}</Text>
              <Pressable hitSlop={10} onPress={() => removeExercise(exIdx)}>
                <X size={16} color={c.subtext} />
              </Pressable>
            </View>

            {ex.lastHint && (
              <Text style={{ color: c.subtext, fontSize: 11.5 }}>{ex.lastHint}</Text>
            )}

            {(() => {
              const parsed = cleaned.find(
                (x) => x.exercise.toLowerCase() === ex.exercise.toLowerCase()
              );
              const best = parsed ? bestSetBy1RM(parsed.sets) : null;
              if (!best) return null;
              return (
                <Text style={{ color: c.primary, fontSize: 11.5 }}>
                  1RM ประมาณ {best.oneRm.toFixed(1)} kg (จาก {best.set.kg}×{best.set.reps})
                  {is1RMReliable(best.set.reps)
                    ? ''
                    : ` · เกิน ${RELIABLE_REPS} ครั้ง ค่าประมาณจะเพี้ยนมาก`}
                  {' · ยกรวม '}
                  {Math.round(exerciseVolume(parsed!.sets)).toLocaleString()} kg
                </Text>
              );
            })()}

            <View style={styles.setHeader}>
              <Text style={[styles.setCol, styles.colIdx, { color: c.subtext }]}>เซ็ต</Text>
              <Text style={[styles.setCol, { color: c.subtext }]}>น้ำหนัก (kg)</Text>
              <Text style={[styles.setCol, { color: c.subtext }]}>ครั้ง</Text>
              <View style={styles.colX} />
            </View>

            {ex.sets.map((s, setIdx) => (
              <View key={setIdx} style={styles.setRow}>
                <Text style={[styles.colIdx, { color: c.subtext }]}>{setIdx + 1}</Text>
                <TextInput
                  value={s.kg}
                  onChangeText={(v) => updateSet(exIdx, setIdx, { kg: v })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={c.subtext}
                  style={[styles.input, styles.setInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                />
                <TextInput
                  value={s.reps}
                  onChangeText={(v) => updateSet(exIdx, setIdx, { reps: v })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={c.subtext}
                  style={[styles.input, styles.setInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                />
                <Pressable
                  hitSlop={8}
                  style={styles.colX}
                  onPress={() => removeSet(exIdx, setIdx)}
                  disabled={ex.sets.length === 1}
                >
                  <X size={14} color={ex.sets.length === 1 ? c.border : c.subtext} />
                </Pressable>
              </View>
            ))}

            <Pressable onPress={() => addSet(exIdx)} style={styles.addSet} hitSlop={6}>
              <Plus size={14} color={c.primary} />
              <Text style={{ color: c.primary, fontSize: 13, fontWeight: '500' }}>เพิ่มเซ็ต</Text>
            </Pressable>
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.subtext, fontSize: 12 }}>ความหนัก</Text>
          <View style={[styles.segmented, { borderColor: c.border }]}>
            {INTENSITIES.map((it) => {
              const active = it.id === intensityId;
              return (
                <Pressable
                  key={it.id}
                  onPress={() => setIntensityId(it.id)}
                  style={[styles.segment, active && { backgroundColor: c.primary }]}
                >
                  <Text style={{ color: active ? '#fff' : c.text, fontSize: 13 }}>{it.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.durationRow}>
            <Text style={{ color: c.subtext, fontSize: 12, flex: 1 }}>เวลาทั้งเซสชัน (นาที)</Text>
            <TextInput
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="numeric"
              style={[styles.input, styles.durationInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            />
          </View>

          <View style={styles.totals}>
            <Text style={{ color: c.subtext, fontSize: 13 }}>
              ยกรวม <Text style={{ color: c.text, fontWeight: '600' }}>{Math.round(volume).toLocaleString()} kg</Text>
            </Text>
            <Text style={{ color: c.subtext, fontSize: 13 }}>
              เผา <Text style={{ color: c.text, fontWeight: '600' }}>{kcal.toLocaleString()} kcal</Text>
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึกเซสชัน'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 50, gap: 12 },
  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { width: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  exHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exName: { fontSize: 15, fontWeight: '600', flex: 1 },
  setHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  setCol: { flex: 1, fontSize: 11 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colIdx: { width: 26, fontSize: 12, textAlign: 'center' },
  colX: { width: 22, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  setInput: { flex: 1, textAlign: 'center', paddingVertical: 7 },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationInput: { width: 90, textAlign: 'center' },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    paddingTop: 4,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
