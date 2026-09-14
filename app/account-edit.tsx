import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  estimateWeeksToGoal,
  localDateString,
  type Sex,
} from '../lib/nutrition';
import { addDays, formatMonthYear } from '../lib/dates';
import { Sparkles } from 'lucide-react-native';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { AmountStepper } from '../components/amount-stepper';
import { Squish } from '../components/squish';
import { Mascot } from '../components/mascot';

type GoalType = 'lose' | 'maintain' | 'gain';

const STEP_KEYS = ['basic', 'goal', 'activity', 'summary'] as const;
type StepKey = (typeof STEP_KEYS)[number];
const STEP_TITLES: Record<StepKey, string> = {
  basic: 'ข้อมูลพื้นฐาน',
  goal: 'เป้าหมาย',
  activity: 'กิจกรรมและกล้ามเนื้อ',
  summary: 'สรุปผล',
};

const GOAL_OPTIONS: { key: GoalType; label: string; desc: string }[] = [
  { key: 'lose', label: 'ลดลง', desc: 'กินน้อยกว่าที่ร่างกายใช้วันละนิด' },
  { key: 'maintain', label: 'คงที่', desc: 'กินเท่าที่ร่างกายใช้พอดี' },
  { key: 'gain', label: 'เพิ่มขึ้น', desc: 'กินมากกว่าที่ใช้ เพื่อสร้างกล้ามเนื้อ' },
];

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
  const [showMacroEditor, setShowMacroEditor] = useState(false);

  /** เลือกทิศทางเป้าหมายใหม่ พร้อมตั้งอัตราเริ่มต้นให้สมเหตุสมผล ไม่งั้นปุ่มอัตราจะไม่มีตัวไหนถูกเลือกเลย */
  function pickGoalType(next: GoalType) {
    setGoalType(next);
    if (next === 'lose') setWeeklyRateKg(-0.5);
    else if (next === 'gain') setWeeklyRateKg(0.5);
  }

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

  /** ประมาณเดือนที่จะถึงน้ำหนักเป้าหมาย — โชว์เฉพาะตอนกรอกน้ำหนักเป้าหมายไว้แล้วและทิศทางสอดคล้องกับอัตราที่เลือก */
  const goalEta = useMemo(() => {
    if (goalType === 'maintain') return null;
    const cur = parseFloat(weightKg);
    const goal = parseFloat(goalWeightKg);
    if (!cur || !goal) return null;
    const weeks = estimateWeeksToGoal(cur, goal, weeklyRateKg);
    if (weeks === null || weeks <= 0) return null;
    return formatMonthYear(addDays(localDateString(), weeks * 7));
  }, [weightKg, goalWeightKg, goalType, weeklyRateKg]);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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

        <ScrollView contentContainerStyle={styles.scroll}>
          {STEP_KEYS[step] === 'basic' && (
            <>
              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
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

                <View style={styles.fieldRow}>
                  <Field label="ส่วนสูง (ซม.)" color={c.subtext} style={{ flex: 1, marginBottom: 0 }}>
                    <NumInput value={heightCm} onChange={setHeightCm} c={c} placeholder="165" />
                  </Field>
                  <Field label="น้ำหนักวันนี้ (กก.)" color={c.subtext} style={{ flex: 1, marginBottom: 0 }}>
                    <NumInput value={weightKg} onChange={setWeightKg} c={c} placeholder="60" />
                  </Field>
                </View>
              </View>

              {preview && (
                <View style={[styles.insightCard, { backgroundColor: c.brandTint }]}>
                  <Mascot pose="idle" size={56} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 11.5 }]}>จากที่กรอก Numi คิดได้ว่า</Text>
                    <Text style={[textType.row, { color: c.text, fontSize: 13, marginTop: 2, lineHeight: 20 }]}>
                      ร่างกายใช้ตอนนอนนิ่ง {Math.round(preview.bmr).toLocaleString()} kcal{'\n'}ใช้ทั้งวันรวมกิจกรรม{' '}
                      {Math.round(preview.tdee).toLocaleString()} kcal
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.disclaimerCard, { backgroundColor: c.cream }]}>
                <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 20 }]}>
                  ยังไม่รู้น้ำหนักเป๊ะก็กรอกคร่าว ๆ ไปก่อนได้ แก้ทีหลังได้ตลอด ตัวเลขจะขยับตามให้เอง
                </Text>
              </View>

              {!preview && (
                <Text style={[textType.label, { color: c.danger, fontSize: 12 }]}>
                  กรุณากรอกปีเกิด ส่วนสูง และน้ำหนักให้ถูกต้องก่อนไปต่อ
                </Text>
              )}
            </>
          )}

          {STEP_KEYS[step] === 'goal' && (
            <View style={{ gap: 16 }}>
              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>อยากให้น้ำหนัก…</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {GOAL_OPTIONS.map((opt) => {
                    const active = goalType === opt.key;
                    return (
                      <Squish
                        key={opt.key}
                        onPress={() => pickGoalType(opt.key)}
                        style={[
                          styles.goalRow,
                          { backgroundColor: active ? c.brandTint : c.surfaceAlt, borderColor: active ? c.brand : 'transparent' },
                        ]}
                      >
                        <View style={[styles.radio, { borderColor: active ? c.brand : c.line }]}>
                          {active && <View style={[styles.radioDot, { backgroundColor: c.brand }]} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[textType.row, { color: c.text, fontSize: 14.5 }]}>{opt.label}</Text>
                          <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, marginTop: 1 }]}>{opt.desc}</Text>
                        </View>
                      </Squish>
                    );
                  })}
                </View>
              </View>

              {goalType !== 'maintain' && (
                <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                  <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>
                    อยาก{goalType === 'lose' ? 'ลด' : 'เพิ่ม'}เร็วแค่ไหน
                  </Text>
                  <Text style={[textType.label, { color: c.faint, fontSize: 11.5, lineHeight: 18, marginTop: 2 }]}>
                    ยิ่งเร็วยิ่งต้องอดมาก ช้าหน่อยแต่ทำได้นานกว่าดีกว่า
                  </Text>
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
                            overSafe
                              ? { backgroundColor: c.dangerBg }
                              : active
                                ? { backgroundColor: c.brand }
                                : { backgroundColor: c.surfaceAlt },
                          ]}
                        >
                          <Text
                            style={[
                              textType.row,
                              { fontSize: 14, color: overSafe ? c.danger : active ? '#fff' : c.text },
                            ]}
                          >
                            {v.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              textType.label,
                              { fontSize: 10, marginTop: 1, color: overSafe ? c.danger : active ? '#CFE2FF' : c.muted },
                            ]}
                          >
                            {overSafe ? 'เร็วเกินไป' : active ? 'กำลังดี' : 'กก./สัปดาห์'}
                          </Text>
                        </Squish>
                      );
                    })}
                  </View>
                  {rateUnsafe && (
                    <Text style={[textType.label, { color: c.danger, fontSize: 12, marginTop: 6 }]}>
                      เกินอัตราปลอดภัย ({safeMaxLoss.toFixed(2)} กก./สัปดาห์) กรุณาเลือกอัตราที่ปลอดภัยกว่าก่อนไปต่อ
                    </Text>
                  )}

                  <Field label="น้ำหนักที่อยากไปให้ถึง (กก.)" color={c.subtext} style={{ marginTop: 12, marginBottom: 0 }}>
                    <NumInput value={goalWeightKg} onChange={setGoalWeightKg} c={c} placeholder="ไม่บังคับ" />
                  </Field>
                </View>
              )}

              {preview && (
                <View style={[styles.insightCard, { backgroundColor: c.brandTint }]}>
                  <Mascot pose="idle" size={72} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 11.5 }]}>ถ้าเลือกแบบนี้ วันนี้กินได้</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                      <Text style={[textType.metric, { color: c.text, fontSize: 30 }]}>{preview.target.toLocaleString()}</Text>
                      <Text style={[textType.label, { color: c.subtext, fontSize: 12.5 }]}>kcal/วัน</Text>
                    </View>
                    {goalEta && (
                      <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, marginTop: 2 }]}>
                        ถึงเป้า {parseFloat(goalWeightKg).toFixed(1)} กก. ราว{goalEta}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {STEP_KEYS[step] === 'activity' && (
            <View style={{ gap: 16 }}>
              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>วัน ๆ หนึ่งคุณขยับตัวแค่ไหน</Text>
                <View style={{ gap: 6, marginTop: 10 }}>
                  {ACTIVITY_LEVELS.map((lvl) => {
                    const active = activityLevel === lvl.value;
                    return (
                      <Squish
                        key={lvl.value}
                        onPress={() => setActivityLevel(lvl.value)}
                        style={[
                          styles.activityRow,
                          { backgroundColor: active ? c.brandTint : c.surfaceAlt, borderColor: active ? c.brand : 'transparent' },
                        ]}
                      >
                        <View style={[styles.radio, { borderColor: active ? c.brand : c.line }]}>
                          {active && <View style={[styles.radioDot, { backgroundColor: c.brand }]} />}
                        </View>
                        <Text style={[textType.row, { color: c.text, flex: 1, fontSize: 13.5 }]}>{lvl.label}</Text>
                      </Squish>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>อยากเน้นกล้ามเนื้อไปด้วยไหม</Text>
                <Text style={[textType.label, { color: c.faint, fontSize: 11.5, lineHeight: 18, marginTop: 2 }]}>
                  มีผลกับโปรตีนที่แนะนำ และจำนวนวันเวทในแผนที่ Numi จัดให้
                </Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Squish
                    onPress={() => setPrioritizeMuscle(true)}
                    style={[
                      styles.choiceCard,
                      { backgroundColor: prioritizeMuscle ? c.brandTint : c.surfaceAlt, borderColor: prioritizeMuscle ? c.brand : c.line },
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
                      { backgroundColor: !prioritizeMuscle ? c.brandTint : c.surfaceAlt, borderColor: !prioritizeMuscle ? c.brand : c.line },
                    ]}
                  >
                    <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>ไม่ต้อง เอาตามเป้าหมายหลักพอ</Text>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, lineHeight: 18 }]}>
                      ใช้สัดส่วนมาตรฐานตามเป้าที่เลือกไว้
                    </Text>
                  </Squish>
                </View>
              </View>
            </View>
          )}

          {STEP_KEYS[step] === 'summary' && preview && (
            <View style={{ gap: 16 }}>
              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <View style={styles.heroRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 13 }]}>วันนี้ควรกินได้</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                      <Text style={[textType.metric, { color: c.text, fontSize: 48 }]}>{preview.target.toLocaleString()}</Text>
                      <Text style={[textType.label, { color: c.muted, fontSize: 14 }]}>kcal</Text>
                    </View>
                    <Text style={[textType.label, { color: c.subtext, fontSize: 12, marginTop: 2 }]}>
                      ต่อวัน โดยเฉลี่ย ไม่ต้องเป๊ะทุกวัน
                    </Text>
                    {preview.clamped && (
                      <Text style={[textType.label, { color: c.muted, fontSize: 11.5, marginTop: 2 }]}>
                        ปรับขึ้นเป็นพื้นขั้นต่ำ {preview.floor} kcal เพื่อความปลอดภัย
                      </Text>
                    )}
                  </View>
                  <Mascot pose="goal" size={92} />
                </View>

                <View style={styles.twoBoxRow}>
                  <View style={[styles.smallStatBox, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>ร่างกายใช้ตอนนอนนิ่ง</Text>
                    <Text style={[textType.row, { color: c.text, fontSize: 17, marginTop: 2 }]}>{Math.round(preview.bmr).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.smallStatBox, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>ใช้ทั้งวันรวมกิจกรรม</Text>
                    <Text style={[textType.row, { color: c.text, fontSize: 17, marginTop: 2 }]}>{Math.round(preview.tdee).toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15 }]}>แบ่งเป็นสารอาหาร</Text>
                <Text style={[textType.label, { color: c.faint, fontSize: 11.5, lineHeight: 18, marginTop: 2 }]}>
                  {MACRO_RATIONALE[goalType]}
                  {prioritizeMuscle ? ' และเพิ่มโปรตีนอีกเพราะเลือกเน้นกล้ามเนื้อ' : ''}
                </Text>

                <View style={styles.macroBar}>
                  <View style={{ flex: proteinPct, backgroundColor: c.protein }} />
                  <View style={{ flex: carbPct, backgroundColor: c.carb }} />
                  <View style={{ flex: fatPct, backgroundColor: c.fat }} />
                </View>

                <View style={styles.macroGramsRow}>
                  <MacroGramBox label="โปรตีน" dotColor={c.protein} grams={preview.macros.proteinG} c={c} />
                  <MacroGramBox label="คาร์บ" dotColor={c.carb} grams={preview.macros.carbG} c={c} />
                  <MacroGramBox label="ไขมัน" dotColor={c.fat} grams={preview.macros.fatG} c={c} />
                </View>

                <Squish
                  scaleTo={0.97}
                  style={[styles.recommendBtn, { backgroundColor: c.brandTint }]}
                  onPress={() => setShowMacroEditor((v) => !v)}
                >
                  <Text style={[textType.row, { color: c.brand, fontSize: 13.5 }]}>
                    {showMacroEditor ? 'ซ่อนการปรับสัดส่วน' : 'ปรับสัดส่วนเอง'}
                  </Text>
                </Squish>

                {showMacroEditor && (
                  <View style={{ marginTop: 4 }}>
                    <View style={styles.macroRow}>
                      <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>โปรตีน</Text>
                      <AmountStepper value={proteinPct} step={5} unit="%" min={10} onChange={updateProteinPct} />
                    </View>
                    <View style={styles.macroRow}>
                      <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>คาร์บ</Text>
                      <AmountStepper value={carbPct} step={5} unit="%" min={10} onChange={updateCarbPct} />
                    </View>
                    <View style={styles.macroRow}>
                      <Text style={[textType.row, { color: c.text, fontSize: 13.5, width: 70 }]}>ไขมัน</Text>
                      <Text style={[textType.label, { color: c.muted, fontSize: 13 }]}>{fatPct}% · คิดจากที่เหลือให้เอง</Text>
                    </View>
                    <Squish
                      scaleTo={0.97}
                      style={[styles.recommendBtn, { backgroundColor: c.surfaceAlt }]}
                      onPress={applyRecommendedMacros}
                    >
                      <Sparkles size={14} color={c.brand} />
                      <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>ใช้ค่าแนะนำสำหรับเป้าหมายนี้</Text>
                    </Squish>
                  </View>
                )}
              </View>

              <View style={[styles.disclaimerCard, { backgroundColor: c.cream }]}>
                <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 20 }]}>
                  ตัวเลขนี้เป็นค่าประมาณจากส่วนสูง น้ำหนัก อายุ และกิจกรรมที่คุณบอก ถ้าน้ำหนักไม่ขยับเลยสองสัปดาห์ บอก Numi ได้ เดี๋ยวปรับใหม่ให้
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footerRow}>
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
              <Text style={[textType.row, styles.saveBtnText]}>{saving ? 'กำลังบันทึก...' : 'ใช้เป้าหมายนี้'}</Text>
            </Squish>
          )}
        </View>
        {!profile && step === STEP_KEYS.length - 1 && (
          <Squish onPress={() => router.back()} style={styles.skipLink}>
            <Text style={[textType.row, { color: c.faint, fontSize: 13 }]}>ข้ามไปก่อน ตั้งทีหลังได้</Text>
          </Squish>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  style?: StyleProp<ViewStyle>;
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

function MacroGramBox({
  label,
  dotColor,
  grams,
  c,
}: {
  label: string;
  dotColor: string;
  grams: number;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.macroGramBox, { backgroundColor: c.surfaceAlt }]}>
      <View style={styles.macroGramLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: dotColor }]} />
        <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
      </View>
      <Text style={[textType.row, { color: c.text, fontSize: 16, marginTop: 3 }]}>{Math.round(grams)} ก.</Text>
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
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  scroll: { padding: 18, paddingBottom: 24 },
  field: { marginBottom: 16 },
  fieldLabel: { marginBottom: 6 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.iconBox },
  stepCard: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card,
    padding: 13,
    marginBottom: 14,
  },
  disclaimerCard: {
    borderRadius: radius.cardInner,
    padding: 14,
    marginBottom: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.cardInner,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.iconBox,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rateRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  choiceCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.cardInner, padding: 14, gap: 4 },
  macroBar: { height: 14, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', marginVertical: 4 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  macroGramsRow: { flexDirection: 'row', gap: 9, marginTop: 4 },
  macroGramBox: { flex: 1, borderRadius: radius.cardInner, padding: 12 },
  macroGramLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 8, height: 8, borderRadius: 3 },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.iconBox,
    paddingVertical: 10,
    marginTop: 4,
  },
  ratePill: { flex: 1, borderRadius: radius.cardInner, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  twoBoxRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  smallStatBox: { flex: 1, borderRadius: radius.cardInner, padding: 12 },
  footerRow: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 8 },
  skipLink: { alignItems: 'center', paddingBottom: 14 },
  ghostBtn: { flex: 1, borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
  primaryBtn: { flex: 2, borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15 },
});
