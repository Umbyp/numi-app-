import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polyline, Path, Circle } from 'react-native-svg';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import { getMealTotalsByDateRange, getWeightHistory, getEarliestWeight, type DayTotalsWithDate } from '../../lib/db/queries';
import { localDateString, calcWeightProgress } from '../../lib/nutrition';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import { Mascot } from '../../components/mascot';
import { EmptyState } from '../../components/empty-state';
import { Squish } from '../../components/squish';

const DAY_LETTERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const PERIODS = [
  { key: 0, label: 'สัปดาห์นี้' },
  { key: 1, label: 'สัปดาห์ที่แล้ว' },
  { key: 2, label: '2 สัปดาห์ที่แล้ว' },
];

function rangeForOffset(offsetWeeks: number): [string, string] {
  const end = new Date();
  end.setDate(end.getDate() - offsetWeeks * 7);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return [localDateString(start), localDateString(end)];
}

export default function InsightsScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { goals, profile, latestWeightKg } = useNumiStore();
  const [period, setPeriod] = useState(0);
  const [days, setDays] = useState<DayTotalsWithDate[]>([]);
  const [weightHistory, setWeightHistory] = useState<Awaited<ReturnType<typeof getWeightHistory>>>([]);
  const [earliestWeight, setEarliestWeight] = useState<Awaited<ReturnType<typeof getEarliestWeight>>>(null);

  useEffect(() => {
    const [start, end] = rangeForOffset(period);
    getMealTotalsByDateRange(start, end).then(setDays);
  }, [period]);

  useEffect(() => {
    getWeightHistory(60).then(setWeightHistory);
    getEarliestWeight().then(setEarliestWeight);
  }, []);

  const avgKcal = useMemo(() => {
    const withData = days.filter((d) => d.kcal > 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, d) => s + d.kcal, 0) / withData.length;
  }, [days]);

  const maxKcal = Math.max(2000, ...days.map((d) => d.kcal), 1);
  const hasMealData = days.some((d) => d.kcal > 0);

  const insightText = useMemo(() => {
    const target = goals?.proteinG ?? 0;
    const withData = days.filter((d) => d.kcal > 0);
    if (withData.length === 0 || target === 0) return 'ยังไม่มีข้อมูลพอให้วิเคราะห์ช่วงนี้ ลองบันทึกอาหารให้ครบสักสองสามวัน';
    const lowDays = withData.filter((d) => d.proteinG < target * 0.9).length;
    if (lowDays === 0) return 'โปรตีนเข้าเป้าดีตลอดช่วงนี้ รักษาระดับนี้ไว้ได้เลย';
    return `โปรตีนต่ำกว่าเป้า ${lowDays} วันจาก ${withData.length} — เพิ่มไข่หรืออกไก่มื้อเช้าน่าจะพอ`;
  }, [days, goals]);

  const weightDelta =
    weightHistory.length >= 2 ? weightHistory[weightHistory.length - 1].weightKg - weightHistory[0].weightKg : 0;

  const goalWeight = profile?.goalWeightKg ?? null;
  const weightProgress = useMemo(() => {
    if (!goalWeight || !earliestWeight || latestWeightKg == null) return null;
    return calcWeightProgress({ startKg: earliestWeight.weightKg, currentKg: latestWeightKg, goalKg: goalWeight });
  }, [goalWeight, earliestWeight, latestWeightKg]);

  const cardStyle = [styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[type.greeting, { color: c.text, fontSize: 24 }]}>ข้อมูลเชิงลึก</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <Squish
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={[styles.periodChip, { backgroundColor: active ? c.surface : 'transparent' }, active && cardShadow(scheme)]}
              >
                <Text style={[type.row, { fontSize: 13, color: active ? c.text : c.muted }]}>{p.label}</Text>
              </Squish>
            );
          })}
        </ScrollView>

        <View style={cardStyle}>
          {!hasMealData ? (
            <EmptyState
              title="ยังไม่มีข้อมูลของช่วงนี้"
              description="บันทึกอาหารสัก 2-3 วัน แล้วกราฟกับข้อสังเกตจะเริ่มมีความหมาย"
              actionLabel="ไปบันทึกอาหาร"
              onAction={() => router.push('/add-food')}
              mascotSize={48}
            />
          ) : (
          <>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 14 }]}>แคลอรี่ที่ได้รับ</Text>
              <View style={styles.baselineRow}>
                <Text style={[type.metric, { color: c.text, fontSize: 28 }]}>{Math.round(avgKcal).toLocaleString()}</Text>
                <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>เฉลี่ย/วัน</Text>
              </View>
            </View>
          </View>

          <View style={styles.legendRow}>
            <LegendDot color={c.protein} label="โปรตีน" c={c} />
            <LegendDot color={c.carb} label="คาร์บ" c={c} />
            <LegendDot color={c.fat} label="ไขมัน" c={c} />
          </View>

          <View style={styles.chartRow}>
            {days.map((d) => {
              const dow = new Date(`${d.localDate}T00:00:00`).getDay();
              const total = d.kcal || 1;
              const scale = 120 / maxKcal;
              return (
                <View key={d.localDate} style={styles.barCol}>
                  <View style={styles.barStack}>
                    <View style={{ height: (d.proteinG * 4) * scale, backgroundColor: c.protein }} />
                    <View style={{ height: (d.carbG * 4) * scale, backgroundColor: c.carb }} />
                    <View style={{ height: (d.fatG * 9) * scale, backgroundColor: c.fat }} />
                  </View>
                  <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>{DAY_LETTERS[dow]}</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.calloutRow, { backgroundColor: c.brandTint }]}>
            <Mascot size={40} />
            <Text style={[type.row, { color: c.text, fontSize: 12, flex: 1, lineHeight: 18 }]}>{insightText}</Text>
          </View>
          </>
          )}
        </View>

        <View style={cardStyle}>
          <View style={styles.rowBetween}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 14 }]}>น้ำหนัก</Text>
            <View style={styles.baselineRow}>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 22 }]}>
                {weightHistory.length ? weightHistory[weightHistory.length - 1].weightKg.toFixed(1) : '—'}
              </Text>
              {weightHistory.length >= 2 && (
                <Text style={[type.row, { color: c.brand, fontSize: 12 }]}>
                  {weightDelta > 0 ? '+' : ''}
                  {weightDelta.toFixed(1)} กก.
                </Text>
              )}
            </View>
          </View>
          <WeightChart history={weightHistory} color={c.brand} />

          {weightProgress ? (
            <View style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={[type.label, { color: c.subtext, fontSize: 12 }]}>
                  {weightProgress.reachedGoal
                    ? 'ถึงเป้าหมายแล้ว'
                    : `เหลืออีก ${weightProgress.remainingKg.toFixed(1)} กก. ถึงเป้าหมาย ${goalWeight!.toFixed(1)} กก.`}
                </Text>
                <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>{Math.round(weightProgress.progressPct)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
                <View style={[styles.progressFill, { width: `${weightProgress.progressPct}%`, backgroundColor: c.brand }]} />
              </View>
            </View>
          ) : (
            <Squish onPress={() => router.push('/account-edit')}>
              <Text style={[type.label, { color: c.brand, fontSize: 12 }]}>
                {goalWeight ? 'บันทึกน้ำหนักเพื่อดูความคืบหน้า' : 'ตั้งเป้าหมายน้ำหนักเพื่อดูความคืบหน้า'}
              </Text>
            </Squish>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label, c }: { color: string; label: string; c: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[type.label, { color: c.subtext, fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

function WeightChart({ history, color }: { history: { weightKg: number }[]; color: string }) {
  if (history.length < 2) return null;
  const width = 320;
  const height = 64;
  const min = Math.min(...history.map((h) => h.weightKg));
  const max = Math.max(...history.map((h) => h.weightKg));
  const span = Math.max(0.5, max - min);
  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((h.weightKg - min) / span) * height;
    return `${x},${y}`;
  });
  const last = points[points.length - 1].split(',').map(Number);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ marginTop: 4 }}>
      <Path d={`M${points.join(' L')} L${width},${height} L0,${height} Z`} fill={color} opacity={0.09} />
      <Polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={4.5} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  periodChip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  legendRow: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barStack: { width: '100%', flexDirection: 'column-reverse', borderRadius: 6, overflow: 'hidden' },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.cardInner, padding: 12 },
  progressTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
});
