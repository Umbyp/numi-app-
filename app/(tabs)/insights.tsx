import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import {
  getMealTotalsByDateRange,
  getWeightsSince,
  getEarliestWeight,
  type DayTotalsWithDate,
} from '../../lib/db/queries';
import { calcWeightProgress, dailySeries, seriesMovingAverage } from '../../lib/nutrition';
import { dateAxis } from '../../lib/dates';
import { type } from '../../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../../lib/theme';
import { Mascot } from '../../components/mascot';
import { TrendChart } from '../../components/trend-chart';
import { EmptyState } from '../../components/empty-state';
import { Squish } from '../../components/squish';

const DAY_LETTERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const RANGES = [7, 30, 90] as const;

export default function InsightsScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { goals, profile, latestWeightKg } = useNumiStore();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [days, setDays] = useState<DayTotalsWithDate[]>([]);
  const [weightRows, setWeightRows] = useState<{ localDate: string; weightKg: number }[]>([]);
  const [earliestWeight, setEarliestWeight] = useState<Awaited<ReturnType<typeof getEarliestWeight>>>(null);

  const axis = useMemo(() => dateAxis(range), [range]);

  useEffect(() => {
    getMealTotalsByDateRange(axis[0], axis[axis.length - 1]).then(setDays);
    getWeightsSince(axis[0]).then((rows) => setWeightRows(rows.map((r) => ({ localDate: r.localDate, weightKg: r.weightKg }))));
  }, [axis]);

  useEffect(() => {
    getEarliestWeight().then(setEarliestWeight);
  }, []);

  const avgKcal = useMemo(() => {
    const withData = days.filter((d) => d.kcal > 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, d) => s + d.kcal, 0) / withData.length;
  }, [days]);

  const hasMealData = days.some((d) => d.kcal > 0);
  const weekBars = range === 7 ? days : [];

  const insightText = useMemo(() => {
    const target = goals?.proteinG ?? 0;
    const withData = days.filter((d) => d.kcal > 0);
    if (withData.length === 0 || target === 0) return 'ยังไม่มีข้อมูลพอให้วิเคราะห์ช่วงนี้ ลองบันทึกอาหารให้ครบสักสองสามวัน';
    const lowDays = withData.filter((d) => d.proteinG < target * 0.9).length;
    if (lowDays === 0) return 'โปรตีนเข้าเป้าดีตลอดช่วงนี้ รักษาระดับนี้ไว้ได้เลย';
    return `โปรตีนต่ำกว่าเป้า ${lowDays} วันจาก ${withData.length} — เพิ่มไข่หรืออกไก่มื้อเช้าน่าจะพอ`;
  }, [days, goals]);

  const weightSeries = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const r of weightRows) byDate[r.localDate] = r.weightKg;
    return dailySeries(axis, byDate);
  }, [axis, weightRows]);
  const weightAverage = useMemo(() => seriesMovingAverage(weightSeries, 7), [weightSeries]);
  const latestWeightAvg = useMemo(() => {
    for (let i = weightAverage.length - 1; i >= 0; i--) if (weightAverage[i] !== null) return weightAverage[i];
    return null;
  }, [weightAverage]);
  const weightChange = useMemo(() => {
    const known = weightAverage.filter((v): v is number => v !== null);
    return known.length < 2 ? null : known[known.length - 1] - known[0];
  }, [weightAverage]);

  const goalWeight = profile?.goalWeightKg ?? null;
  const weightProgress = useMemo(() => {
    if (!goalWeight || !earliestWeight || latestWeightKg == null) return null;
    return calcWeightProgress({ startKg: earliestWeight.weightKg, currentKg: latestWeightKg, goalKg: goalWeight });
  }, [goalWeight, earliestWeight, latestWeightKg]);

  const cardStyle = [styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[type.greeting, { color: c.text, fontSize: 22 }]}>ย้อนหลัง</Text>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <Squish
                key={r}
                onPress={() => setRange(r)}
                style={[styles.rangeChip, { backgroundColor: active ? c.surface : 'transparent' }, active && cardShadow(scheme)]}
              >
                <Text style={[type.row, { fontSize: 13, color: active ? c.text : c.muted }]}>
                  {r === 90 ? '3 เดือน' : `${r} วัน`}
                </Text>
              </Squish>
            );
          })}
        </View>

        <View style={cardStyle}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 13 }]}>น้ำหนักล่าสุด</Text>
              <View style={styles.baselineRow}>
                <Text style={[type.metric, { color: c.text, fontSize: 40 }]}>
                  {latestWeightAvg !== null ? latestWeightAvg.toFixed(1) : '—'}
                </Text>
                <Text style={[type.label, { color: c.muted, fontSize: 13 }]}>กก.</Text>
              </View>
            </View>
            {weightChange !== null && (
              <View style={[styles.changeBadge, { backgroundColor: weightChange < 0 ? c.carbBg : c.surfaceAlt }]}>
                <Text style={[type.row, { fontSize: 12.5, color: weightChange < 0 ? c.carbText : c.subtext }]}>
                  {weightChange < 0 ? 'ลง' : weightChange > 0 ? 'ขึ้น' : 'คงที่'} {Math.abs(weightChange).toFixed(1)} กก.
                </Text>
              </View>
            )}
          </View>

          <TrendChart series={weightSeries} average={weightAverage} unit="กก." emptyText="ยังไม่มีน้ำหนักในช่วงนี้" height={130} />

          {weightProgress ? (
            <View style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={[type.label, { color: c.subtext, fontSize: 12 }]}>
                  {weightProgress.reachedGoal
                    ? 'ถึงเป้าหมายแล้ว'
                    : `เหลืออีก ${weightProgress.remainingKg.toFixed(1)} กก. ถึงเป้า ${goalWeight!.toFixed(1)} กก.`}
                </Text>
                <Text style={[type.label, { color: c.text, fontSize: 12 }]}>{Math.round(weightProgress.progressPct)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
                <View style={[styles.progressFill, { width: `${weightProgress.progressPct}%`, backgroundColor: c.brand }]} />
              </View>
            </View>
          ) : (
            <Squish onPress={() => router.push('/account-edit')} hitSlop={10}>
              <Text style={[type.label, { color: c.brand, fontSize: 12 }]}>
                {goalWeight ? 'บันทึกน้ำหนักเพื่อดูความคืบหน้า' : 'ตั้งเป้าหมายน้ำหนักเพื่อดูความคืบหน้า'}
              </Text>
            </Squish>
          )}
        </View>

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
              <Text style={[type.cardTitle, { color: c.text, fontSize: 13 }]}>กินเฉลี่ยต่อวัน</Text>
              <View style={styles.baselineRow}>
                <Text style={[type.metric, { color: c.text, fontSize: 28 }]}>{Math.round(avgKcal).toLocaleString()}</Text>
                <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>kcal</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              <LegendDot color={c.protein} label="โปรตีน" c={c} />
              <LegendDot color={c.carb} label="คาร์บ" c={c} />
              <LegendDot color={c.fat} label="ไขมัน" c={c} />
            </View>
          </View>

          {weekBars.length > 0 && (
            <View style={styles.chartRow}>
              {(() => {
                const maxKcal = Math.max(2000, ...weekBars.map((d) => d.kcal), 1);
                const scale = 120 / maxKcal;
                return weekBars.map((d) => {
                  const dow = new Date(`${d.localDate}T00:00:00`).getDay();
                  return (
                    <View key={d.localDate} style={styles.barCol}>
                      <View style={styles.barStack}>
                        <View style={{ height: d.proteinG * 4 * scale, backgroundColor: c.protein }} />
                        <View style={{ height: d.carbG * 4 * scale, backgroundColor: c.carb }} />
                        <View style={{ height: d.fatG * 9 * scale, backgroundColor: c.fat }} />
                      </View>
                      <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>{DAY_LETTERS[dow]}</Text>
                    </View>
                  );
                });
              })()}
            </View>
          )}

          <View style={[styles.calloutRow, { backgroundColor: c.cream }]}>
            <Mascot size={40} pose="idle" />
            <Text style={[type.row, { color: c.creamText, fontSize: 12, flex: 1, lineHeight: 18 }]}>{insightText}</Text>
          </View>
          </>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  rangeRow: { flexDirection: 'row', gap: 4, backgroundColor: 'transparent' },
  rangeChip: { height: MIN_TOUCH, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  changeBadge: { borderRadius: radius.pill, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barStack: { width: '100%', flexDirection: 'column-reverse', borderRadius: 6, overflow: 'hidden' },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.cardInner, padding: 12 },
  progressTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
});
