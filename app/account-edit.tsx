import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
  recommendedMacroPct,
  type Sex,
} from '../lib/nutrition';
import { Sparkles } from 'lucide-react-native';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../lib/theme';
import { AmountStepper } from '../components/amount-stepper';
import { Mascot } from '../components/mascot';
import { Squish } from '../components/squish';

type GoalType = 'lose' | 'maintain' | 'gain';

const STEP_KEYS = ['basic', 'goal', 'activity', 'muscle', 'macros', 'summary'] as const;
type StepKey = (typeof STEP_KEYS)[number];
const STEP_TITLES: Record<StepKey, string> = {
  basic: 'ข้อมูลพื้นฐาน',
  goal: 'เป้าหมาย',
  activity: 'ระดับกิจกรรม',
  muscle: 'จุดประสงค์พิเศษ',
  macros: 'สัดส่วนสารอาหาร',
  summary: 'สรุปผล',
};

// เข้าจากเมนู "ข้อมูลส่วนตัว" / "เป้าหมายน้ำหนัก" / "เป้าหมายสารอาหาร" ควรแก้แค่เรื่องนั้นแล้วบันทึกได้เลย
// ไม่ใช่ต้องไล่ Next ผ่านทุกขั้นของ wizard onboarding — เฉพาะตอนเข้าแบบไม่ระบุ step (ปุ่ม "แก้ไข" บนสุด) ถึงจะได้ wizard เต็ม
const FOCUSED_HEADER_TITLE: Record<StepKey, string> = {
  basic: 'ข้อมูลส่วนตัว',
  goal: 'เป้าหมายน้ำหนัก',
  activity: 'ระดับกิจกรรม',
  muscle: 'จุดประสงค์พิเศษ',
  macros: 'เป้าหมายสารอาหาร',
  summary: 'สรุปผล',
};

const MACRO_RATIONALE: Record<GoalType, string> = {
  lose: 'โปรตีนสูงขึ้นเพื่อรักษามวลกล้ามเนื้อระหว่างแคลอรี่ขาด',
  maintain: 'สัดส่วนสมดุลกลาง ๆ เหมาะกับการรักษาน้ำหนักคงที่ (TDEE)',
  gain: 'คาร์บสูงขึ้นเพื่อเป็นพลังงานให้ฝึกหนักและสร้างกล้ามเนื้อ',
};

export default function AccountEditScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { profile, latestWeightKg, refresh } = useNumiStore();

  const [step, setStep] = useState(() => {
    const idx = STEP_KEYS.indexOf((params.step as StepKey) ?? 'basic');
    return idx >= 0 ? idx : 0;
  });
  // มี step param แปลว่าเข้ามาแก้เรื่องเดียวจากเมนูบัญชี — โชว์แค่ step นั้นแล้วบันทึกได้เลย
  // ไม่มี step param (ปุ่ม "แก้ไข" บนสุด) แปลว่าเป็น wizard เต็มแบบตอน onboarding ไล่ Next ทีละขั้น
  const focusedEdit = !!params.step && STEP_KEYS.includes(params.step as StepKey);

  const [sex, setSex] = useState<Sex>('female');
  const [birthYear, setBirthYear] = useState('1995');
  const [heightCm, setHeightCm] = useState('165');
  const [weightKg, setWeightKg] = useState('60');
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState(1.375);
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [weeklyRateKg, setWeeklyRateKg] = useState(-0.5);
  const [prioritizeMuscle, setPrioritizeMuscle] = useState(false);
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
  function applyRecommendedMacros() {
    const rec = recommendedMacroPct(goalType, prioritizeMuscle);
    setProteinPct(rec.protein);
    setCarbPct(rec.carb);
  }

  useEffect(() => {
    if (profile) {
      setSex(profile.sex as Sex);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setActivityLevel(profile.activityLevel);
      setGoalType(profile.goalType as GoalType);
      setWeeklyRateKg(profile.weeklyRateKg);
      setPrioritizeMuscle(profile.prioritizeMuscle);
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

  const rateUnsafe = goalType === 'lose' && Math.abs(weeklyRateKg) > safeMaxLoss;
  const nextDisabled =
    (STEP_KEYS[step] === 'basic' && !preview) || (STEP_KEYS[step] === 'goal' && rateUnsafe);

  function goNext() {
    if (step < STEP_KEYS.length - 1) setStep(step + 1);
  }
  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSave() {
    if (!preview) return;
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const by = parseInt(birthYear, 10);
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
        prioritizeMuscle,
      });
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <Stack.Screen
        options={{ title: focusedEdit ? FOCUSED_HEADER_TITLE[STEP_KEYS[step]] : 'แก้ไขโปรไฟล์และเป้าหมาย' }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {!focusedEdit && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / STEP_KEYS.length) * 100}%`, backgroundColor: c.brand },
                ]}
              />
            </View>
            <Text style={[textType.label, { color: c.muted, fontSize: 12, marginTop: 6 }]}>
              ขั้นตอน {step + 1} จาก {STEP_KEYS.length} · {STEP_TITLES[STEP_KEYS[step]]}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll}>
          {STEP_KEYS[step] === 'basic' && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
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

              <View style={styles.twoCol}>
                <Field label="ส่วนสูง (ซม.)" color={c.subtext} style={{ flex: 1 }}>
                  <NumInput value={heightCm} onChange={setHeightCm} c={c} placeholder="165" />
                </Field>
                <Field label="น้ำหนักวันนี้ (กก.)" color={c.subtext} style={{ flex: 1 }}>
                  <NumInput value={weightKg} onChange={setWeightKg} c={c} placeholder="60" />
                </Field>
              </View>

              {!preview && (
                <Text style={[textType.label, { color: c.danger, fontSize: 12 }]}>
                  กรุณากรอกปีเกิด ส่วนสูง และน้ำหนักให้ถูกต้องก่อนไปต่อ
                </Text>
              )}
            </View>
          )}

          {STEP_KEYS[step] === 'goal' && (
            <>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Field label="อยากให้น้ำหนัก…" color={c.subtext}>
                  <Segmented
                    options={[
                      { key: 'lose', label: 'ลดลง' },
                      { key: 'maintain', label: 'คงที่' },
                      { key: 'gain', label: 'เพิ่มขึ้น' },
                    ]}
                    value={goalType}
                    onChange={(v) => setGoalType(v as GoalType)}
                    c={c}
                  />
                </Field>

                <Field label="น้ำหนักที่อยากไปให้ถึง (กก.)" color={c.subtext} style={{ marginBottom: 0 }}>
                  <NumInput value={goalWeightKg} onChange={setGoalWeightKg} c={c} placeholder="ไม่บังคับ" />
                </Field>
              </View>

              {goalType !== 'maintain' && (
                <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                  <Field label={`อยาก${goalType === 'lose' ? 'ลด' : 'เพิ่ม'}เร็วแค่ไหน (kg/สัปดาห์)`} color={c.subtext} style={{ marginBottom: 0 }}>
                    <View style={styles.rateRow}>
                      {(goalType === 'lose' ? [0.25, 0.5, 0.75, 1.0] : [0.25, 0.5]).map((v) => {
                        const signed = goalType === 'lose' ? -v : v;
                        const active = Math.abs(weeklyRateKg - signed) < 0.001;
                        const overSafe = goalType === 'lose' && v > safeMaxLoss;
                        return (
                          <Squish
                            key={v}
                            onPress={() => setWeeklyRateKg(signed)}
                            style={[
                              styles.ratePill,
                              { backgroundColor: overSafe ? c.dangerBg : active ? c.brand : c.surfaceAlt },
                            ]}
                          >
                            <Text
                              style={[
                                textType.label,
                                { color: overSafe ? c.danger : active ? '#fff' : c.text, fontSize: 12 },
                              ]}
                            >
                              {v} kg{overSafe ? ' ⚠︎' : ''}
                            </Text>
                          </Squish>
                        );
                      })}
                    </View>
                    {rateUnsafe && (
                      <Text style={[textType.label, { color: c.danger, fontSize: 12, marginTop: 8 }]}>
                        เกินอัตราปลอดภัย ({safeMaxLoss.toFixed(2)} kg/สัปดาห์) กรุณาเลือกอัตราที่ปลอดภัยกว่าก่อนไปต่อ
                      </Text>
                    )}
                  </Field>
                </View>
              )}
            </>
          )}

          {STEP_KEYS[step] === 'activity' && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <Field label="วัน ๆ หนึ่งคุณขยับตัวแค่ไหน" color={c.text} style={{ marginBottom: 0 }}>
                {ACTIVITY_LEVELS.map((lvl) => (
                  <Squish
                    key={lvl.value}
                    onPress={() => setActivityLevel(lvl.value)}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: activityLevel === lvl.value ? c.brandTint : c.surfaceAlt,
                        borderColor: activityLevel === lvl.value ? c.brand : c.line,
                      },
                    ]}
                  >
                    <View style={[styles.radio, { borderColor: c.brand }]}>
                      {activityLevel === lvl.value && <View style={[styles.radioDot, { backgroundColor: c.brand }]} />}
                    </View>
                    <Text style={[textType.row, { color: c.text, flex: 1, fontSize: 13.5 }]}>{lvl.label}</Text>
                  </Squish>
                ))}
              </Field>
            </View>
          )}

          {STEP_KEYS[step] === 'muscle' && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>
                อยากเน้นกล้ามเนื้อไปด้วยไหม
              </Text>
              <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, lineHeight: 18, marginTop: -6 }]}>
                มีผลกับโปรตีนที่แนะนำ และจำนวนวันเวทในแผนที่ Numi จัดให้
              </Text>
              <Squish
                onPress={() => setPrioritizeMuscle(true)}
                style={[
                  styles.choiceCard,
                  { backgroundColor: prioritizeMuscle ? c.brandTint : c.surfaceAlt, borderColor: prioritizeMuscle ? c.brand : 'transparent' },
                ]}
              >
                <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>ใช่ เน้นด้วย</Text>
                <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, lineHeight: 18 }]}>
                  เพิ่มโปรตีน และแนะนำวันเวทมากขึ้น
                </Text>
              </Squish>
              <Squish
                onPress={() => setPrioritizeMuscle(false)}
                style={[
                  styles.choiceCard,
                  { backgroundColor: !prioritizeMuscle ? c.brandTint : c.surfaceAlt, borderColor: !prioritizeMuscle ? c.brand : 'transparent' },
                ]}
              >
                <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>ไม่ต้อง เอาตามเป้าหมายหลักพอ</Text>
                <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, lineHeight: 18 }]}>
                  ใช้สัดส่วนมาตรฐานตามเป้าที่เลือกไว้
                </Text>
              </Squish>
            </View>
          )}

          {STEP_KEYS[step] === 'macros' && (
            <>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Field label="แบ่งแคลอรี่เป็นสัดส่วนเท่าไหร่" color={c.text} style={{ marginBottom: 0 }}>
                  <View style={styles.ratioBar}>
                    <View style={{ width: `${proteinPct}%`, backgroundColor: c.protein }} />
                    <View style={{ width: `${carbPct}%`, backgroundColor: c.carb }} />
                    <View style={{ width: `${fatPct}%`, backgroundColor: c.fat }} />
                  </View>

                  <View style={styles.macroRow}>
                    <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>โปรตีน</Text>
                    <AmountStepper value={proteinPct} step={5} unit="%" min={10} onChange={updateProteinPct} large />
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>คาร์บ</Text>
                    <AmountStepper value={carbPct} step={5} unit="%" min={10} onChange={updateCarbPct} large />
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>ไขมัน</Text>
                    <Text style={[textType.label, { color: c.muted, fontSize: 13 }]}>{fatPct}% · คิดจากที่เหลือให้เอง</Text>
                  </View>
                  <Squish scaleTo={0.97} style={[styles.recommendBtn, { backgroundColor: c.brandTint }]} onPress={applyRecommendedMacros}>
                    <Sparkles size={14} color={c.brand} />
                    <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>ใช้ค่าแนะนำสำหรับเป้าหมายนี้</Text>
                  </Squish>
                  <Text style={[textType.label, { color: c.faint, fontSize: 11, marginTop: 8 }]}>
                    {MACRO_RATIONALE[goalType]}
                    {prioritizeMuscle ? ' และเพิ่มโปรตีนอีกเพราะเลือกเน้นกล้ามเนื้อ' : ''}
                  </Text>
                </Field>
              </View>

              {preview && (
                <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                  <Text style={[textType.label, { color: c.subtext, fontSize: 12.5 }]}>เท่ากับวันละประมาณ</Text>
                  <View style={styles.macroChipRow}>
                    <MacroChip label="โปรตีน" grams={preview.macros.proteinG} dot={c.protein} c={c} />
                    <MacroChip label="คาร์บ" grams={preview.macros.carbG} dot={c.carb} c={c} />
                    <MacroChip label="ไขมัน" grams={preview.macros.fatG} dot={c.fat} c={c} />
                  </View>
                </View>
              )}
            </>
          )}

          {STEP_KEYS[step] === 'summary' && preview && (
            <>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <View style={styles.summaryHeaderRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 13 }]}>วันนี้ควรกินได้</Text>
                    <View style={styles.baselineRow}>
                      <Text style={[textType.metric, { color: c.text, fontSize: 48, letterSpacing: -1.5 }]}>
                        {preview.target.toLocaleString()}
                      </Text>
                      <Text style={[textType.row, { color: c.muted, fontSize: 14 }]}>kcal</Text>
                    </View>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 12, marginTop: 2 }]}>
                      ต่อวัน โดยเฉลี่ย ไม่ต้องเป๊ะทุกวัน
                    </Text>
                  </View>
                  <Mascot size={90} pose="goal" />
                </View>

                {preview.clamped && (
                  <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
                    ปรับขึ้นเป็นพื้นขั้นต่ำ {preview.floor} kcal เพื่อความปลอดภัย
                  </Text>
                )}

                <View style={styles.macroChipRow}>
                  <View style={[styles.macroChip, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>ร่างกายใช้ตอนนอนนิ่ง</Text>
                    <Text style={[textType.cardTitle, { color: c.text, fontSize: 17, marginTop: 3 }]}>{Math.round(preview.bmr)}</Text>
                  </View>
                  <View style={[styles.macroChip, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>ใช้ทั้งวันรวมกิจกรรม</Text>
                    <Text style={[textType.cardTitle, { color: c.text, fontSize: 17, marginTop: 3 }]}>{Math.round(preview.tdee)}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>แบ่งเป็นสารอาหาร</Text>
                <Text style={[textType.label, { color: c.faint, fontSize: 11.5, lineHeight: 18, marginTop: -6 }]}>
                  {MACRO_RATIONALE[goalType]}
                  {prioritizeMuscle ? ' และเพิ่มโปรตีนอีกเพราะเลือกเน้นกล้ามเนื้อ' : ''}
                </Text>
                <View style={styles.ratioBar}>
                  <View style={{ width: `${proteinPct}%`, backgroundColor: c.protein }} />
                  <View style={{ width: `${carbPct}%`, backgroundColor: c.carb }} />
                  <View style={{ width: `${fatPct}%`, backgroundColor: c.fat }} />
                </View>
                <View style={styles.macroChipRow}>
                  <MacroChip label="โปรตีน" grams={preview.macros.proteinG} dot={c.protein} c={c} />
                  <MacroChip label="คาร์บ" grams={preview.macros.carbG} dot={c.carb} c={c} />
                  <MacroChip label="ไขมัน" grams={preview.macros.fatG} dot={c.fat} c={c} />
                </View>
                <Squish
                  scaleTo={0.97}
                  style={[styles.recommendBtn, { backgroundColor: c.brandTint }]}
                  onPress={() => setStep(STEP_KEYS.indexOf('macros'))}
                >
                  <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>ปรับสัดส่วนเอง</Text>
                </Squish>
              </View>

              <View style={[styles.tipBox, { backgroundColor: c.cream }]}>
                <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 20 }]}>
                  ตัวเลขนี้เป็นค่าประมาณจากส่วนสูง น้ำหนัก อายุ และกิจกรรมที่คุณบอก ถ้าน้ำหนักไม่ขยับเลยสองสัปดาห์ บอก Numi ได้ เดี๋ยวปรับใหม่ให้
                </Text>
              </View>
            </>
          )}

          {focusedEdit && STEP_KEYS[step] !== 'summary' && (
            <PreviewCard preview={preview} c={c} scheme={scheme} />
          )}
        </ScrollView>

        <View style={styles.footerRow}>
          {focusedEdit ? (
            <Squish scaleTo={0.97}
              style={[styles.primaryBtn, { flex: 1, backgroundColor: c.brand }, (saving || !preview || (STEP_KEYS[step] === 'goal' && rateUnsafe)) && { opacity: 0.6 }]}
              disabled={saving || !preview || (STEP_KEYS[step] === 'goal' && rateUnsafe)}
              onPress={handleSave}
            >
              <Text style={[textType.row, styles.saveBtnText]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Squish>
          ) : (
            <>
              {step > 0 && (
                <Squish style={[styles.ghostBtn, { backgroundColor: c.surfaceAlt }]} onPress={goBack}>
                  <Text style={[textType.row, { color: c.subtext, fontSize: 14 }]}>ย้อนกลับ</Text>
                </Squish>
              )}
              {step < STEP_KEYS.length - 1 ? (
                <Squish scaleTo={0.97}
                  style={[styles.primaryBtn, { backgroundColor: c.brand }, nextDisabled && { opacity: 0.5 }]}
                  disabled={nextDisabled}
                  onPress={goNext}
                >
                  <Text style={[textType.row, styles.saveBtnText]}>ถัดไป</Text>
                </Squish>
              ) : (
                <Squish scaleTo={0.97}
                  style={[styles.primaryBtn, { backgroundColor: c.brand }, (saving || !preview) && { opacity: 0.6 }]}
                  disabled={saving || !preview}
                  onPress={handleSave}
                >
                  <Text style={[textType.row, styles.saveBtnText]}>{saving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}</Text>
                </Squish>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface PreviewData {
  bmr: number;
  tdee: number;
  target: number;
  clamped: boolean;
  floor: number;
  macros: { proteinG: number; carbG: number; fatG: number };
}

function PreviewCard({
  preview,
  c,
  scheme,
}: {
  preview: PreviewData | null;
  c: ReturnType<typeof useTheme>;
  scheme: ReturnType<typeof useScheme>;
}) {
  if (!preview) return null;
  return (
    <View style={[styles.previewCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
        BMR {Math.round(preview.bmr)} kcal · TDEE {Math.round(preview.tdee)} kcal
      </Text>
      <Text style={[textType.metric, styles.previewTarget, { color: c.text }]}>
        {preview.target.toLocaleString()} kcal/วัน
      </Text>
      {preview.clamped && (
        <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>
          ปรับขึ้นเป็นพื้นขั้นต่ำ {preview.floor} kcal เพื่อความปลอดภัย
        </Text>
      )}
      <Text style={[textType.label, { color: c.muted, fontSize: 12, marginTop: 6 }]}>
        P {preview.macros.proteinG}g · C {preview.macros.carbG}g · F {preview.macros.fatG}g
      </Text>
    </View>
  );
}

function Field({
  label,
  color,
  children,
  style,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
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

function MacroChip({
  label,
  grams,
  dot,
  c,
}: {
  label: string;
  grams: number;
  dot: string;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.macroChip, { backgroundColor: c.surfaceAlt }]}>
      <View style={styles.macroChipHeader}>
        <View style={[styles.macroChipDot, { backgroundColor: dot }]} />
        <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
      </View>
      <Text style={[textType.cardTitle, { color: c.text, fontSize: 17, marginTop: 3 }]}>{Math.round(grams)} ก.</Text>
    </View>
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
          <Squish
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && { backgroundColor: c.surface }]}
          >
            <Text style={[textType.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: { paddingHorizontal: 18, paddingTop: 14 },
  progressTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  scroll: { padding: 18, paddingBottom: 24, gap: 14 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 17, gap: 14 },
  twoCol: { flexDirection: 'row', gap: 10 },
  field: {},
  fieldLabel: { marginBottom: 7 },
  input: { height: MIN_TOUCH, borderRadius: radius.cardInner, paddingHorizontal: 14, fontSize: 15.5 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.cardInner },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 44,
    borderWidth: 2,
    borderRadius: radius.cardInner,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginBottom: 6,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  rateRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  choiceCard: { borderWidth: 2, borderRadius: radius.cardInner, padding: 13, gap: 3, marginTop: 10 },
  ratioBar: { height: 16, borderRadius: 9, overflow: 'hidden', flexDirection: 'row' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  macroChipRow: { flexDirection: 'row', gap: 9 },
  macroChip: { flex: 1, borderRadius: radius.cardInner, padding: 12 },
  macroChipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroChipDot: { width: 10, height: 10, borderRadius: 3 },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: radius.cardInner,
  },
  ratePill: { height: 52, minWidth: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.cardInner, paddingHorizontal: 8 },
  previewCard: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 4, marginBottom: 4, gap: 2 },
  previewTarget: { fontSize: 26, marginTop: 4 },
  summaryHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  tipBox: { borderRadius: radius.cardInner, padding: 15 },
  footerRow: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 8 },
  ghostBtn: { width: 112, borderRadius: radius.cardInner, height: 56, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flex: 1, borderRadius: radius.cardInner, height: 56, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15 },
});
