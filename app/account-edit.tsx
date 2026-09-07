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
import { useRouter } from 'expo-router';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import { saveProfile, addOrUpdateWeightToday } from '../lib/db/queries';
import {
  ACTIVITY_LEVELS,
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcMacroTargets,
  maxSafeWeeklyLoss,
  type Sex,
} from '../lib/nutrition';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { AmountStepper } from '../components/amount-stepper';

type GoalType = 'lose' | 'maintain' | 'gain';

export default function AccountEditScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { profile, latestWeightKg, refresh, themePreference, setThemePreference } = useNumiStore();

  const [sex, setSex] = useState<Sex>('female');
  const [birthYear, setBirthYear] = useState('1995');
  const [heightCm, setHeightCm] = useState('165');
  const [weightKg, setWeightKg] = useState('60');
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState(1.375);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [weeklyRateKg, setWeeklyRateKg] = useState(-0.5);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbPct, setCarbPct] = useState(40);
  const fatPct = Math.max(10, 100 - proteinPct - carbPct);
  const [saving, setSaving] = useState(false);

  function updateProteinPct(v: number) {
    const clamped = Math.min(60, Math.max(10, v));
    setProteinPct(Math.min(clamped, 90 - carbPct));
  }
  function updateCarbPct(v: number) {
    const clamped = Math.min(60, Math.max(10, v));
    setCarbPct(Math.min(clamped, 90 - proteinPct));
  }

  useEffect(() => {
    if (profile) {
      setSex(profile.sex as Sex);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setActivityLevel(profile.activityLevel);
      setGoalType(profile.goalType as GoalType);
      setWeeklyRateKg(profile.weeklyRateKg);
      setProteinPct(Math.round(profile.proteinPct * 100));
      setCarbPct(Math.round(profile.carbPct * 100));
      if (profile.goalWeightKg) setGoalWeightKg(String(profile.goalWeightKg));
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
    const macros = calcMacroTargets(target, { protein: proteinPct / 100, carb: carbPct / 100, fat: fatPct / 100 });
    return { bmr, tdee, target, clamped, floor, macros };
  }, [sex, birthYear, heightCm, weightKg, activityLevel, goalType, weeklyRateKg, proteinPct, carbPct, fatPct]);

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
        proteinPct: proteinPct / 100,
        carbPct: carbPct / 100,
        fatPct: fatPct / 100,
        addExerciseKcal: false,
        goalWeightKg: parseFloat(goalWeightKg) || null,
      });
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Field label="เพศ" color={c.subtext}>
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

          <Field label="ปีเกิด (ค.ศ.)" color={c.subtext}>
            <NumInput value={birthYear} onChange={setBirthYear} c={c} placeholder="1995" />
          </Field>

          <Field label="ส่วนสูง (cm)" color={c.subtext}>
            <NumInput value={heightCm} onChange={setHeightCm} c={c} placeholder="165" />
          </Field>

          <Field label="น้ำหนักปัจจุบัน (kg)" color={c.subtext}>
            <NumInput value={weightKg} onChange={setWeightKg} c={c} placeholder="60" />
          </Field>

          <Field label="น้ำหนักเป้าหมาย (kg)" color={c.subtext}>
            <NumInput value={goalWeightKg} onChange={setGoalWeightKg} c={c} placeholder="ไม่บังคับ" />
          </Field>

          <Field label="ระดับกิจกรรม" color={c.subtext}>
            {ACTIVITY_LEVELS.map((lvl) => (
              <Pressable
                key={lvl.value}
                onPress={() => setActivityLevel(lvl.value)}
                style={[
                  styles.optionRow,
                  { backgroundColor: activityLevel === lvl.value ? c.brandTint : c.surfaceAlt },
                ]}
              >
                <View style={[styles.radio, { borderColor: c.brand }]}>
                  {activityLevel === lvl.value && <View style={[styles.radioDot, { backgroundColor: c.brand }]} />}
                </View>
                <Text style={[textType.label, { color: c.text, flex: 1, fontSize: 13 }]}>{lvl.label}</Text>
              </Pressable>
            ))}
          </Field>

          <Field label="เป้าหมาย" color={c.subtext}>
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
            <Field label={`อัตรา ${goalType === 'lose' ? 'ลด' : 'เพิ่ม'} (kg/สัปดาห์)`} color={c.subtext}>
              <View style={styles.rateRow}>
                {(goalType === 'lose' ? [0.25, 0.5, 0.75, 1.0] : [0.25, 0.5]).map((v) => {
                  const signed = goalType === 'lose' ? -v : v;
                  const active = Math.abs(weeklyRateKg - signed) < 0.001;
                  const overSafe = goalType === 'lose' && v > safeMaxLoss;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setWeeklyRateKg(signed)}
                      style={[styles.ratePill, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
                    >
                      <Text style={[textType.label, { color: active ? '#fff' : c.text, fontSize: 12 }]}>
                        {v} kg{overSafe ? ' ⚠︎' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {goalType === 'lose' && Math.abs(weeklyRateKg) > safeMaxLoss && (
                <Text style={[textType.label, { color: c.danger, fontSize: 12, marginTop: 4 }]}>
                  เกินอัตราปลอดภัย ({safeMaxLoss.toFixed(2)} kg/สัปดาห์) ระบบจะไม่ให้บันทึกค่านี้
                </Text>
              )}
            </Field>
          )}

          <Field label="สัดส่วนสารอาหาร (% ของแคลอรี่)" color={c.subtext}>
            <View style={styles.macroRow}>
              <Text style={[textType.row, { color: c.text, fontSize: 13, width: 70 }]}>โปรตีน</Text>
              <AmountStepper value={proteinPct} step={5} unit="%" min={10} onChange={updateProteinPct} />
            </View>
            <View style={styles.macroRow}>
              <Text style={[textType.row, { color: c.text, fontSize: 13, width: 70 }]}>คาร์บ</Text>
              <AmountStepper value={carbPct} step={5} unit="%" min={10} onChange={updateCarbPct} />
            </View>
            <View style={styles.macroRow}>
              <Text style={[textType.row, { color: c.text, fontSize: 13, width: 70 }]}>ไขมัน</Text>
              <Text style={[textType.label, { color: c.muted, fontSize: 13 }]}>{fatPct}% (คำนวณจากที่เหลือ)</Text>
            </View>
          </Field>

          <Field label="ธีม" color={c.subtext}>
            <Segmented
              options={[
                { key: 'system', label: 'ตามระบบ' },
                { key: 'light', label: 'สว่าง' },
                { key: 'dark', label: 'มืด' },
              ]}
              value={themePreference}
              onChange={(v) => setThemePreference(v as 'system' | 'light' | 'dark')}
              c={c}
            />
          </Field>

          {preview && (
            <View style={[styles.previewCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
                BMR {Math.round(preview.bmr)} kcal · TDEE {Math.round(preview.tdee)} kcal
              </Text>
              <Text style={[textType.metric, styles.previewTarget, { color: c.text }]}>{preview.target.toLocaleString()} kcal/วัน</Text>
              {preview.clamped && (
                <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
                  ปรับขึ้นเป็นพื้นขั้นต่ำ {preview.floor} kcal เพื่อความปลอดภัย
                </Text>
              )}
              <Text style={[textType.label, { color: c.muted, fontSize: 12, marginTop: 6 }]}>
                P {preview.macros.proteinG}g · C {preview.macros.carbG}g · F {preview.macros.fatG}g
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }, cardShadow(scheme)]}
            disabled={saving || !preview}
            onPress={handleSave}
          >
            <Text style={[textType.row, styles.saveBtnText]}>{saving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[textType.label, styles.fieldLabel, { color }]}>{label}</Text>
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
      placeholderTextColor={c.faint}
      style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(600) }]}
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
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && { backgroundColor: c.surface }]}
          >
            <Text style={[textType.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 60 },
  field: { marginBottom: 16 },
  fieldLabel: { marginBottom: 6 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.iconBox },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.iconBox,
    padding: 12,
    marginBottom: 6,
  },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  rateRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ratePill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  previewCard: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 4, marginBottom: 20, gap: 2 },
  previewTarget: { fontSize: 26, marginTop: 4 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15 },
});
