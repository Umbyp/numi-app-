import { useMemo, useState } from 'react';
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
import { useTheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import { addWorkout } from '../lib/db/queries';
import { calcKcalBurned } from '../lib/nutrition';
import { MET_ACTIVITIES, CATEGORY_LABELS, type WorkoutCategory } from '../lib/mets';

// เวทมีหน้าบันทึกของตัวเองที่จดเซ็ตได้ หน้านี้จึงเหลือเฉพาะกิจกรรมที่วัดด้วยเวลา
const CATEGORIES: WorkoutCategory[] = ['cardio', 'sport', 'flexibility', 'other'];

export default function LogCardioScreen() {
  const c = useTheme();
  const router = useRouter();
  const { latestWeightKg, refresh } = useNumiStore();

  const [activityId, setActivityId] = useState('walk_brisk');
  const [durationMin, setDurationMin] = useState('30');
  const [distanceKm, setDistanceKm] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [saving, setSaving] = useState(false);

  const activity = MET_ACTIVITIES.find((a) => a.id === activityId)!;
  const weightKg = latestWeightKg ?? 70;

  const kcal = useMemo(() => {
    const min = parseFloat(durationMin);
    if (!min || min <= 0) return 0;
    return calcKcalBurned(activity.met, weightKg, min);
  }, [activity, weightKg, durationMin]);

  async function handleSave() {
    const min = parseFloat(durationMin);
    if (!min || min <= 0 || min > 600) {
      Alert.alert('เวลาไม่ถูกต้อง', 'กรอกเป็นนาที ระหว่าง 1 ถึง 600');
      return;
    }
    const dist = parseFloat(distanceKm);
    const hr = parseInt(avgHr, 10);
    setSaving(true);
    try {
      await addWorkout({
        name: activity.name,
        category: activity.category,
        met: activity.met,
        durationMin: min,
        kcalBurned: calcKcalBurned(activity.met, weightKg, min),
        distanceKm: Number.isFinite(dist) ? dist : null,
        avgHr: Number.isFinite(hr) ? hr : null,
      });
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {CATEGORIES.map((cat) => {
          const list = MET_ACTIVITIES.filter((a) => a.category === cat);
          if (list.length === 0) return null;
          return (
            <View key={cat} style={styles.group}>
              <Text style={[styles.groupLabel, { color: c.subtext }]}>{CATEGORY_LABELS[cat]}</Text>
              <View style={styles.chips}>
                {list.map((a) => {
                  const active = a.id === activityId;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setActivityId(a.id)}
                      style={[
                        styles.chip,
                        { borderColor: c.border, backgroundColor: c.card },
                        active && { backgroundColor: c.primary, borderColor: c.primary },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : c.text, fontSize: 13 }}>{a.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.row}>
          <Labeled c={c} label="เวลา (นาที)">
            <NumInput c={c} value={durationMin} onChange={setDurationMin} placeholder="30" />
          </Labeled>
          {activity.tracksDistance && (
            <Labeled c={c} label="ระยะทาง (กม.)">
              <NumInput c={c} value={distanceKm} onChange={setDistanceKm} placeholder="ไม่บังคับ" />
            </Labeled>
          )}
          <Labeled c={c} label="หัวใจเฉลี่ย">
            <NumInput c={c} value={avgHr} onChange={setAvgHr} placeholder="ไม่บังคับ" />
          </Labeled>
        </View>

        <View style={[styles.preview, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.subtext, fontSize: 12 }}>
            MET {activity.met} · น้ำหนัก {weightKg} kg
          </Text>
          <Text style={[styles.previewValue, { color: c.text }]}>{kcal.toLocaleString()} kcal</Text>
          {latestWeightKg == null && (
            <Text style={{ color: c.subtext, fontSize: 12 }}>
              ยังไม่มีน้ำหนักที่บันทึกไว้ ใช้ค่าเริ่มต้น 70 kg — บันทึกน้ำหนักในหน้าประวัติเพื่อให้แม่นขึ้น
            </Text>
          )}
        </View>

        <Text style={{ color: c.subtext, fontSize: 12 }}>
          ค่านี้เป็นค่าประมาณจากตาราง MET ไม่ได้วัดจากร่างกายจริง
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Labeled({
  c,
  label,
  children,
}: {
  c: ReturnType<typeof useTheme>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.subtext, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

function NumInput({
  c,
  value,
  onChange,
  placeholder,
}: {
  c: ReturnType<typeof useTheme>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={c.subtext}
      style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 50, gap: 14 },
  group: { gap: 6 },
  groupLabel: { fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  row: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  preview: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 2 },
  previewValue: { fontSize: 26, fontWeight: '700' },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
