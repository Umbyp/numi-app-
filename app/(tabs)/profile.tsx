import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import { saveProfile, addOrUpdateWeightToday } from '../../lib/db/queries';
import {
  ACTIVITY_LEVELS,
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcMacroTargets,
  maxSafeWeeklyLoss,
  type Sex,
} from '../../lib/nutrition';

type GoalType = 'lose' | 'maintain' | 'gain';

export default function ProfileScreen() {
  const c = useTheme();
  const { profile, latestWeightKg, refresh } = useNumiStore();

  const [sex, setSex] = useState<Sex>('female');
  const [birthYear, setBirthYear] = useState('1995');
  const [heightCm, setHeightCm] = useState('165');
  const [weightKg, setWeightKg] = useState('60');
  const [activityLevel, setActivityLevel] = useState(1.375);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [weeklyRateKg, setWeeklyRateKg] = useState(-0.5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSex(profile.sex as Sex);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setActivityLevel(profile.activityLevel);
      setGoalType(profile.goalType as GoalType);
      setWeeklyRateKg(profile.weeklyRateKg);
    }
    if (latestWeightKg) setWeightKg(String(latestWeightKg));
  }, [profile, latestWeightKg]);

  const preview = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const by = parseInt(birthYear, 10);
    if (!w || !h || !by) return null;
    const age = new Date().getFullYear() - by;
    if (age <= 0 || age > 120) return null;

    const bmr = calcBMR({ sex, weightKg: w, heightCm: h, age });
    const tdee = calcTDEE(bmr, activityLevel);
    const rate = goalType === 'maintain' ? 0 : weeklyRateKg;
    const { target, clamped, floor } = calcCalorieTarget({ tdee, weeklyRateKg: rate, sex });
    const macros = calcMacroTargets(target, { protein: 0.3, carb: 0.4, fat: 0.3 });
    return { bmr, tdee, target, clamped, floor, macros };
  }, [sex, birthYear, heightCm, weightKg, activityLevel, goalType, weeklyRateKg]);

  const safeMaxLoss = useMemo(() => {
    const w = parseFloat(weightKg);
    return w ? maxSafeWeeklyLoss(w) : 1.0;
  }, [weightKg]);

  async function handleSave() {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const by = parseInt(birthYear, 10);
    if (!w || !h || !by || !preview) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกน้ำหนัก ส่วนสูง และปีเกิดให้ถูกต้อง');
      return;
    }
    if (goalType === 'lose' && Math.abs(weeklyRateKg) > safeMaxLoss) {
      Alert.alert(
        'อัตราลดน้ำหนักสูงเกินไป',
        `เพื่อความปลอดภัย ไม่ควรลดเกิน ${safeMaxLoss.toFixed(2)} kg/สัปดาห์ (1% ของน้ำหนักตัว)`
      );
      return;
    }
    setSaving(true);
    try {
      await addOrUpdateWeightToday(w);
      await saveProfile({
        sex,
        birthYear: by,
        heightCm: h,
        activityLevel,
        goalType,
        weeklyRateKg: goalType === 'maintain' ? 0 : weeklyRateKg,
        manualKcal: null,
        proteinPct: 0.3,
        carbPct: 0.4,
        fatPct: 0.3,
        addExerciseKcal: false,
      });
      await refresh();
      Alert.alert('บันทึกแล้ว', 'อัปเดตเป้าหมายแคลอรี่เรียบร้อย');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.heading, { color: c.text }]}>โปรไฟล์และเป้าหมาย</Text>

          <Field label="เพศ" color={c.text}>
            <Segmented
              options={[
                { key: 'female', label: 'หญิง' },
                { key: 'male', label: 'ชาย' },
              ]}
              value={sex}
              onChange={(v) => setSex(v as Sex)}
              c={c}
            />
          </Field>

          <Field label="ปีเกิด (ค.ศ.)" color={c.text}>
            <NumInput value={birthYear} onChange={setBirthYear} c={c} placeholder="1995" />
          </Field>

          <Field label="ส่วนสูง (cm)" color={c.text}>
            <NumInput value={heightCm} onChange={setHeightCm} c={c} placeholder="165" />
          </Field>

          <Field label="น้ำหนักปัจจุบัน (kg)" color={c.text}>
            <NumInput value={weightKg} onChange={setWeightKg} c={c} placeholder="60" />
          </Field>

          <Field label="ระดับกิจกรรม" color={c.text}>
            {ACTIVITY_LEVELS.map((lvl) => (
              <Pressable
                key={lvl.value}
                onPress={() => setActivityLevel(lvl.value)}
                style={[
                  styles.optionRow,
                  { borderColor: c.border },
                  activityLevel === lvl.value && { backgroundColor: c.ghostBg },
                ]}
              >
                <View style={[styles.radio, { borderColor: c.primary }]}>
                  {activityLevel === lvl.value && <View style={[styles.radioDot, { backgroundColor: c.primary }]} />}
                </View>
                <Text style={{ color: c.text, flex: 1, fontSize: 13 }}>{lvl.label}</Text>
              </Pressable>
            ))}
          </Field>

          <Field label="เป้าหมาย" color={c.text}>
            <Segmented
              options={[
                { key: 'lose', label: 'ลดน้ำหนัก' },
                { key: 'maintain', label: 'คงที่' },
                { key: 'gain', label: 'เพิ่มน้ำหนัก' },
              ]}
              value={goalType}
              onChange={(v) => setGoalType(v as GoalType)}
              c={c}
            />
          </Field>

          {goalType !== 'maintain' && (
            <Field label={`อัตรา ${goalType === 'lose' ? 'ลด' : 'เพิ่ม'} (kg/สัปดาห์)`} color={c.text}>
              <View style={styles.rateRow}>
                {(goalType === 'lose' ? [0.25, 0.5, 0.75, 1.0] : [0.25, 0.5]).map((v) => {
                  const signed = goalType === 'lose' ? -v : v;
                  const active = Math.abs(weeklyRateKg - signed) < 0.001;
                  const overSafe = goalType === 'lose' && v > safeMaxLoss;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setWeeklyRateKg(signed)}
                      style={[
                        styles.ratePill,
                        { borderColor: c.border },
                        active && { backgroundColor: c.primary, borderColor: c.primary },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : c.text, fontSize: 12 }}>
                        {v} kg{overSafe ? ' ⚠︎' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalType === 'lose' && Math.abs(weeklyRateKg) > safeMaxLoss && (
                <Text style={{ color: c.danger, fontSize: 12, marginTop: 4 }}>
                  เกินอัตราปลอดภัย ({safeMaxLoss.toFixed(2)} kg/สัปดาห์) ระบบจะไม่ให้บันทึกค่านี้
                </Text>
              )}
            </Field>
          )}

          {preview && (
            <View style={[styles.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ color: c.subtext, fontSize: 12 }}>BMR {Math.round(preview.bmr)} kcal · TDEE {Math.round(preview.tdee)} kcal</Text>
              <Text style={[styles.previewTarget, { color: c.text }]}>{preview.target.toLocaleString()} kcal/วัน</Text>
              {preview.clamped && (
                <Text style={{ color: c.subtext, fontSize: 12 }}>
                  ปรับขึ้นเป็นพื้นขั้นต่ำ {preview.floor} kcal เพื่อความปลอดภัย
                </Text>
              )}
              <Text style={{ color: c.subtext, fontSize: 12, marginTop: 6 }}>
                P {preview.macros.proteinG}g · C {preview.macros.carbG}g · F {preview.macros.fatG}g
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
            disabled={saving || !preview}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

function NumInput({
  value,
  onChange,
  c,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  c: ReturnType<typeof useTheme>;
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

function Segmented({
  options,
  value,
  onChange,
  c,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.segmented, { borderColor: c.border }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && { backgroundColor: c.primary }]}
          >
            <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: '500' }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  segmented: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  rateRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ratePill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  previewCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 20 },
  previewTarget: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
