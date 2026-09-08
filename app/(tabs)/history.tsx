import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { TrendChart } from '../../components/trend-chart';
import { DaySummaryRow } from '../../components/day-summary-row';
import { useTheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import {
  getWeightsSince,
  getMeasurementsSince,
  getDaySummariesSince,
  getLatestMeasurement,
  addOrUpdateWeightToday,
  addOrUpdateMeasurementToday,
  type DaySummary,
} from '../../lib/db/queries';
import { dailySeries, seriesMovingAverage } from '../../lib/nutrition';
import { dateAxis } from '../../lib/dates';

const RANGES = [7, 30, 90] as const;
type Metric = 'weight' | 'waist';

interface WeightRow {
  localDate: string;
  weightKg: number;
}
interface MeasureRow {
  localDate: string;
  waistCm: number | null;
}

export default function HistoryScreen() {
  const c = useTheme();
  const router = useRouter();
  const { goals, latestWeightKg, refresh } = useNumiStore();

  const [range, setRange] = useState<number>(30);
  const [metric, setMetric] = useState<Metric>('weight');
  const [weightRows, setWeightRows] = useState<WeightRow[]>([]);
  const [measureRows, setMeasureRows] = useState<MeasureRow[]>([]);
  const [days, setDays] = useState<DaySummary[]>([]);

  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [showMeasure, setShowMeasure] = useState(false);
  const [measureInput, setMeasureInput] = useState({
    waistCm: '',
    chestCm: '',
    hipCm: '',
    armCm: '',
    thighCm: '',
  });
  const [saving, setSaving] = useState(false);

  const axis = useMemo(() => dateAxis(range), [range]);

  const load = useCallback(async () => {
    const from = axis[0];
    const [w, m, d, latestM] = await Promise.all([
      getWeightsSince(from),
      getMeasurementsSince(from),
      getDaySummariesSince(from),
      getLatestMeasurement(),
    ]);
    setWeightRows(w.map((r) => ({ localDate: r.localDate, weightKg: r.weightKg })));
    setMeasureRows(m.map((r) => ({ localDate: r.localDate, waistCm: r.waistCm })));
    setDays(d);
    if (latestM) {
      setMeasureInput({
        waistCm: latestM.waistCm != null ? String(latestM.waistCm) : '',
        chestCm: latestM.chestCm != null ? String(latestM.chestCm) : '',
        hipCm: latestM.hipCm != null ? String(latestM.hipCm) : '',
        armCm: latestM.armCm != null ? String(latestM.armCm) : '',
        thighCm: latestM.thighCm != null ? String(latestM.thighCm) : '',
      });
    }
  }, [axis]);

  useFocusEffect(
    useCallback(() => {
      load();
      setWeightInput(latestWeightKg != null ? String(latestWeightKg) : '');
    }, [load, latestWeightKg])
  );

  const series = useMemo(() => {
    const byDate: Record<string, number> = {};
    if (metric === 'weight') {
      for (const r of weightRows) byDate[r.localDate] = r.weightKg;
    } else {
      for (const r of measureRows) if (r.waistCm != null) byDate[r.localDate] = r.waistCm;
    }
    return dailySeries(axis, byDate);
  }, [axis, metric, weightRows, measureRows]);

  const average = useMemo(() => seriesMovingAverage(series, 7), [series]);

  /** เทียบค่าเฉลี่ยจุดแรกกับจุดสุดท้าย ไม่เทียบค่าดิบ เพราะค่าดิบแกว่งจากน้ำในร่างกาย */
  const change = useMemo(() => {
    const known = average.filter((v): v is number => v !== null);
    if (known.length < 2) return null;
    return known[known.length - 1] - known[0];
  }, [average]);

  const loggedDays = days.filter((d) => d.entryCount > 0);
  const avgKcal = loggedDays.length
    ? loggedDays.reduce((s, d) => s + d.kcal, 0) / loggedDays.length
    : null;
  const avgProtein = loggedDays.length
    ? loggedDays.reduce((s, d) => s + d.proteinG, 0) / loggedDays.length
    : null;

  const unit = metric === 'weight' ? 'kg' : 'ซม.';

  async function handleSaveWeight() {
    const v = parseFloat(weightInput);
    if (!v || v < 20 || v > 400) {
      Alert.alert('น้ำหนักไม่ถูกต้อง', 'กรอกเป็นตัวเลขระหว่าง 20 ถึง 400 kg');
      return;
    }
    const bf = parseFloat(bodyFatInput);
    setSaving(true);
    try {
      await addOrUpdateWeightToday(v, undefined, Number.isFinite(bf) ? bf : null);
      await refresh();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeasure() {
    const num = (s: string) => {
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : null;
    };
    setSaving(true);
    try {
      await addOrUpdateMeasurementToday({
        waistCm: num(measureInput.waistCm),
        chestCm: num(measureInput.chestCm),
        hipCm: num(measureInput.hipCm),
        armCm: num(measureInput.armCm),
        thighCm: num(measureInput.thighCm),
      });
      await load();
      setShowMeasure(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.heading, { color: c.text }]}>ประวัติ</Text>

          <View style={[styles.segmented, { borderColor: c.border }]}>
            {RANGES.map((r) => {
              const active = r === range;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={[styles.segment, active && { backgroundColor: c.primary }]}
                >
                  <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: '500' }}>
                    {r} วัน
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ---------- กราฟเทรนด์ ---------- */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardHead}>
              <View style={styles.metricTabs}>
                {([
                  { key: 'weight', label: 'น้ำหนัก' },
                  { key: 'waist', label: 'รอบเอว' },
                ] as const).map((m) => {
                  const active = metric === m.key;
                  return (
                    <Pressable key={m.key} onPress={() => setMetric(m.key)} hitSlop={6}>
                      <Text
                        style={[
                          styles.metricTab,
                          { color: active ? c.text : c.subtext },
                          active && { borderBottomColor: c.primary, borderBottomWidth: 2 },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {change !== null && (
                <Text style={{ color: c.subtext, fontSize: 12 }}>
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(1)} {unit} ใน {range} วัน
                </Text>
              )}
            </View>

            <TrendChart
              series={series}
              average={average}
              unit={unit}
              emptyText={
                metric === 'weight'
                  ? 'ยังไม่มีน้ำหนักในช่วงนี้ — บันทึกด้านล่างได้เลย'
                  : 'ยังไม่มีรอบเอวในช่วงนี้ — เปิด “สัดส่วน” ด้านล่างเพื่อบันทึก'
              }
            />
          </View>

          {/* ---------- ตัวเลขสรุป ---------- */}
          <View style={styles.tiles}>
            <Tile
              c={c}
              label="แคลอรี่เฉลี่ย/วัน"
              value={avgKcal != null ? Math.round(avgKcal).toLocaleString() : '—'}
              sub={goals ? `เป้า ${goals.kcalTarget.toLocaleString()}` : 'ยังไม่ตั้งเป้า'}
            />
            <Tile
              c={c}
              label="โปรตีนเฉลี่ย/วัน"
              value={avgProtein != null ? `${Math.round(avgProtein)} g` : '—'}
              sub={goals ? `เป้า ${goals.proteinG} g` : ''}
            />
            <Tile
              c={c}
              label="วันที่บันทึก"
              value={`${loggedDays.length}`}
              sub={`จาก ${range} วัน`}
            />
          </View>

          {/* ---------- บันทึกน้ำหนัก/สัดส่วนวันนี้ ---------- */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>บันทึกวันนี้</Text>

            <View style={styles.inputRow}>
              <LabeledInput
                c={c}
                label="น้ำหนัก (kg)"
                value={weightInput}
                onChange={setWeightInput}
                placeholder="60.5"
              />
              <LabeledInput
                c={c}
                label="ไขมัน (%)"
                value={bodyFatInput}
                onChange={setBodyFatInput}
                placeholder="ไม่บังคับ"
              />
              <Pressable
                onPress={handleSaveWeight}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
              >
                <Text style={styles.saveBtnText}>บันทึก</Text>
              </Pressable>
            </View>

            <Pressable style={styles.toggle} onPress={() => setShowMeasure((v) => !v)} hitSlop={6}>
              <Text style={{ color: c.subtext, fontSize: 13 }}>สัดส่วน (ซม.)</Text>
              {showMeasure ? (
                <ChevronUp size={16} color={c.subtext} />
              ) : (
                <ChevronDown size={16} color={c.subtext} />
              )}
            </Pressable>

            {showMeasure && (
              <View>
                <View style={styles.measureGrid}>
                  {([
                    ['waistCm', 'รอบเอว'],
                    ['chestCm', 'รอบอก'],
                    ['hipCm', 'รอบสะโพก'],
                    ['armCm', 'ต้นแขน'],
                    ['thighCm', 'ต้นขา'],
                  ] as const).map(([key, label]) => (
                    <View key={key} style={styles.measureCell}>
                      <LabeledInput
                        c={c}
                        label={label}
                        value={measureInput[key]}
                        onChange={(v) => setMeasureInput((s) => ({ ...s, [key]: v }))}
                        placeholder="—"
                      />
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={handleSaveMeasure}
                  disabled={saving}
                  style={[
                    styles.saveBtn,
                    styles.saveBtnWide,
                    { backgroundColor: c.primary },
                    saving && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.saveBtnText}>บันทึกสัดส่วน</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ---------- รายวัน ---------- */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>รายวัน</Text>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, paddingVertical: 4 }]}>
            {days.length === 0 ? (
              <Text style={{ color: c.subtext, fontSize: 13, padding: 12 }}>
                ยังไม่มีมื้ออาหารที่บันทึกไว้ในช่วง {range} วันนี้
              </Text>
            ) : (
              days.map((d) => (
                <DaySummaryRow
                  key={d.localDate}
                  localDate={d.localDate}
                  kcal={d.kcal}
                  target={goals?.kcalTarget ?? 0}
                  proteinG={d.proteinG}
                  carbG={d.carbG}
                  fatG={d.fatG}
                  entryCount={d.entryCount}
                  onPress={() => router.push(`/day/${d.localDate}`)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tile({
  c,
  label,
  value,
  sub,
}: {
  c: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={{ color: c.subtext, fontSize: 11 }}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]}>{value}</Text>
      {sub ? <Text style={{ color: c.subtext, fontSize: 11 }}>{sub}</Text> : null}
    </View>
  );
}

function LabeledInput({
  c,
  label,
  value,
  onChange,
  placeholder,
}: {
  c: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.subtext, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={c.subtext}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 14 },
  heading: { fontSize: 22, fontWeight: '700' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  metricTabs: { flexDirection: 'row', gap: 14 },
  metricTab: { fontSize: 14, fontWeight: '600', paddingBottom: 3 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 2 },
  tileValue: { fontSize: 19, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveBtn: { borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  saveBtnWide: { marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  measureCell: { width: '47%' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
});
