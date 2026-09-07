import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import { addWorkout } from '../lib/db/queries';
import { calcKcalBurned } from '../lib/nutrition';
import { WORKOUT_CATEGORIES, metsByCategory, type WorkoutCategory } from '../lib/met';
import { AmountStepper } from '../components/amount-stepper';
import { type as textType } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

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

  const selected = options.find((m) => m.key === metKey) ?? options[0];
  const weightKg = latestWeightKg ?? 70;
  const kcalBurned = selected ? calcKcalBurned(selected.met, weightKg, durationMin) : 0;

  function pickCategory(cat: WorkoutCategory) {
    setCategory(cat);
    const first = metsByCategory(cat)[0];
    setMetKey(first?.key ?? '');
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await addWorkout({
        name: selected.name,
        category,
        met: selected.met,
        durationMin,
        kcalBurned,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.chipRow}>
          {WORKOUT_CATEGORIES.map((cat) => {
            const active = cat.key === category;
            return (
              <Pressable
                key={cat.key}
                onPress={() => pickCategory(cat.key)}
                style={[styles.catChip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
              >
                <Text style={[textType.row, { fontSize: 13, color: active ? '#fff' : c.text }]}>{cat.label}</Text>
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
          <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={[textType.row, { color: c.subtext, fontSize: 14 }]}>ยกเลิก</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 16 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catChip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  exerciseList: { gap: 6 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 14, borderRadius: radius.iconBox },
  durationCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  estimateCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.card - 6, padding: 14 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
  cancelBtn: { alignItems: 'center', paddingVertical: 6 },
});
