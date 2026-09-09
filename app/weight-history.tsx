import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import {
  getWeightHistory,
  getWeightsSince,
  getMeasurementsSince,
  getLatestMeasurement,
  addOrUpdateMeasurementToday,
} from '../lib/db/queries';
import { dailySeries, seriesMovingAverage } from '../lib/nutrition';
import { dateAxis } from '../lib/dates';
import { TrendChart } from '../components/trend-chart';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { EmptyState } from '../components/empty-state';
import { Squish } from '../components/squish';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const RANGES = [30, 90, 180] as const;
type Metric = 'weight' | 'waist';

const MEASURE_FIELDS = [
  ['waistCm', 'รอบเอว'],
  ['chestCm', 'รอบอก'],
  ['hipCm', 'รอบสะโพก'],
  ['armCm', 'ต้นแขน'],
  ['thighCm', 'ต้นขา'],
] as const;

type MeasureKey = (typeof MEASURE_FIELDS)[number][0];

export default function WeightHistoryScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWeightHistory>>>([]);
  const [weightRows, setWeightRows] = useState<{ localDate: string; weightKg: number }[]>([]);
  const [waistRows, setWaistRows] = useState<{ localDate: string; waistCm: number | null }[]>([]);
  const [range, setRange] = useState<number>(90);
  const [metric, setMetric] = useState<Metric>('weight');
  const [showMeasure, setShowMeasure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [measureInput, setMeasureInput] = useState<Record<MeasureKey, string>>({
    waistCm: '',
    chestCm: '',
    hipCm: '',
    armCm: '',
    thighCm: '',
  });

  const axis = useMemo(() => dateAxis(range), [range]);

  const load = useCallback(() => {
    const from = axis[0];
    getWeightHistory(365).then((rows) => setHistory([...rows].reverse()));
    getWeightsSince(from).then((rows) =>
      setWeightRows(rows.map((r) => ({ localDate: r.localDate, weightKg: r.weightKg })))
    );
    getMeasurementsSince(from).then((rows) =>
      setWaistRows(rows.map((r) => ({ localDate: r.localDate, waistCm: r.waistCm })))
    );
    getLatestMeasurement().then((m) => {
      if (!m) return;
      setMeasureInput({
        waistCm: m.waistCm != null ? String(m.waistCm) : '',
        chestCm: m.chestCm != null ? String(m.chestCm) : '',
        hipCm: m.hipCm != null ? String(m.hipCm) : '',
        armCm: m.armCm != null ? String(m.armCm) : '',
        thighCm: m.thighCm != null ? String(m.thighCm) : '',
      });
    });
  }, [axis]);

  useFocusEffect(load);

  const series = useMemo(() => {
    const byDate: Record<string, number> = {};
    if (metric === 'weight') {
      for (const r of weightRows) byDate[r.localDate] = r.weightKg;
    } else {
      for (const r of waistRows) if (r.waistCm != null) byDate[r.localDate] = r.waistCm;
    }
    return dailySeries(axis, byDate);
  }, [axis, metric, weightRows, waistRows]);

  const average = useMemo(() => seriesMovingAverage(series, 7), [series]);

  /** เทียบค่าเฉลี่ยจุดแรกกับจุดสุดท้าย ไม่เทียบค่าดิบ เพราะค่าดิบแกว่งจากน้ำในร่างกาย */
  const change = useMemo(() => {
    const known = average.filter((v): v is number => v !== null);
    return known.length < 2 ? null : known[known.length - 1] - known[0];
  }, [average]);

  const unit = metric === 'weight' ? 'กก.' : 'ซม.';

  async function handleSaveMeasure() {
    const num = (s: string) => {
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : null;
    };
    if (MEASURE_FIELDS.every(([k]) => num(measureInput[k]) === null)) {
      Alert.alert('ยังไม่ได้กรอกอะไรเลย', 'กรอกอย่างน้อยหนึ่งช่องก่อนบันทึก');
      return;
    }
    setSaving(true);
    try {
      await addOrUpdateMeasurementToday({
        waistCm: num(measureInput.waistCm),
        chestCm: num(measureInput.chestCm),
        hipCm: num(measureInput.hipCm),
        armCm: num(measureInput.armCm),
        thighCm: num(measureInput.thighCm),
      });
      load();
      setShowMeasure(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={history}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
          ListEmptyComponent={
            <EmptyState
              title="ยังไม่มีประวัติน้ำหนัก"
              description="ชั่งเวลาเดิมทุกวันสัก 2 สัปดาห์ แล้วเส้นค่าเฉลี่ยจะเริ่มบอกเทรนด์จริงได้"
              actionLabel="บันทึกน้ำหนักวันนี้"
              onAction={() => router.push('/account-edit')}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.rangeRow}>
                {RANGES.map((r) => {
                  const active = r === range;
                  return (
                    <Squish
                      key={r}
                      onPress={() => setRange(r)}
                      style={[styles.rangeChip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
                    >
                      <Text style={[type.label, { fontSize: 12, color: active ? '#fff' : c.subtext }]}>{r} วัน</Text>
                    </Squish>
                  );
                })}
              </View>

              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <View style={styles.cardHead}>
                  <View style={styles.metricTabs}>
                    {([
                      { key: 'weight', label: 'น้ำหนัก' },
                      { key: 'waist', label: 'รอบเอว' },
                    ] as const).map((m) => {
                      const active = metric === m.key;
                      return (
                        <Squish key={m.key} onPress={() => setMetric(m.key)} hitSlop={6}>
                          <Text
                            style={[
                              type.cardTitle,
                              { fontSize: 14, color: active ? c.text : c.faint, paddingBottom: 3 },
                              active && { borderBottomWidth: 2, borderBottomColor: c.brand },
                            ]}
                          >
                            {m.label}
                          </Text>
                        </Squish>
                      );
                    })}
                  </View>
                  {change !== null && (
                    <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>
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
                      ? 'ยังไม่มีน้ำหนักในช่วงนี้'
                      : 'ยังไม่มีรอบเอวในช่วงนี้ — เปิด “สัดส่วน” ด้านล่างเพื่อบันทึก'
                  }
                />
              </View>

              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Squish scaleTo={0.98} style={styles.toggle} onPress={() => setShowMeasure((v) => !v)} hitSlop={6}>
                  <Text style={[type.cardTitle, { color: c.text, fontSize: 14, flex: 1 }]}>สัดส่วน (ซม.)</Text>
                  {showMeasure ? <ChevronUp size={16} color={c.muted} /> : <ChevronDown size={16} color={c.muted} />}
                </Squish>

                {showMeasure && (
                  <>
                    <View style={styles.measureGrid}>
                      {MEASURE_FIELDS.map(([key, label]) => (
                        <View key={key} style={styles.measureCell}>
                          <Text style={[type.label, { color: c.muted, fontSize: 11, marginBottom: 4 }]}>{label}</Text>
                          <TextInput
                            value={measureInput[key]}
                            onChangeText={(v) => setMeasureInput((s) => ({ ...s, [key]: v }))}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={c.faint}
                            style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
                          />
                        </View>
                      ))}
                    </View>
                    <Squish
                      onPress={handleSaveMeasure}
                      disabled={saving}
                      style={[styles.saveBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]}
                    >
                      <Text style={[type.row, { color: '#fff', fontSize: 14 }]}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึกสัดส่วนวันนี้'}
                      </Text>
                    </Squish>
                  </>
                )}
              </View>

              <Text style={[type.label, { color: c.muted, fontSize: 12, paddingTop: 4 }]}>ประวัติการชั่ง</Text>
            </View>
          }
          renderItem={({ item }) => {
            const d = new Date(`${item.localDate}T00:00:00`);
            return (
              <View style={styles.row}>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>
                  {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543}
                </Text>
                <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{item.weightKg.toFixed(1)} กก.</Text>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  header: { gap: 12, paddingBottom: 4 },
  rangeRow: { flexDirection: 'row', gap: 6 },
  rangeChip: { height: 32, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  metricTabs: { flexDirection: 'row', gap: 14 },
  toggle: { flexDirection: 'row', alignItems: 'center' },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureCell: { width: '47%' },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 12, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
});
