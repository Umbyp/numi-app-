import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { TrendChart } from '../../components/trend-chart';
import { useTheme } from '../../lib/hooks/use-theme';
import { getStrengthSessions } from '../../lib/db/queries';
import { dailySeries, seriesMovingAverage } from '../../lib/nutrition';
import { dateAxis, formatDayRelative } from '../../lib/dates';
import {
  buildRecords,
  bestSetBy1RM,
  exerciseVolume,
  is1RMReliable,
  type SessionLike,
} from '../../lib/strength';

const RANGE_DAYS = 90;

interface Row {
  id: string;
  localDate: string;
  sets: { kg: number; reps: number }[];
  volume: number;
  oneRm: number;
  bestKg: number;
  bestReps: number;
}

export default function ExerciseDetailScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ name: string }>();
  const name = typeof params.name === 'string' ? params.name : '';

  const [sessions, setSessions] = useState<SessionLike[]>([]);

  const load = useCallback(async () => {
    const rows = await getStrengthSessions();
    setSessions(
      rows.map((r) => ({ id: r.id, localDate: r.localDate, sets: r.sets ?? null }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const record = useMemo(
    () => buildRecords(sessions).find((r) => r.exercise.toLowerCase() === name.toLowerCase()),
    [sessions, name]
  );

  /** เฉพาะเซสชันที่มีท่านี้ เรียงจากใหม่ไปเก่าตามลำดับที่ query มา */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const s of sessions) {
      const entry = (s.sets ?? []).find(
        (e) => e.exercise.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!entry || entry.sets.length === 0) continue;
      const best = bestSetBy1RM(entry.sets);
      out.push({
        id: s.id,
        localDate: s.localDate,
        sets: entry.sets,
        volume: exerciseVolume(entry.sets),
        oneRm: best?.oneRm ?? 0,
        bestKg: best?.set.kg ?? 0,
        bestReps: best?.set.reps ?? 0,
      });
    }
    return out;
  }, [sessions, name]);

  const axis = useMemo(() => dateAxis(RANGE_DAYS), []);
  const series = useMemo(() => {
    const byDate: Record<string, number> = {};
    // วันเดียวเล่นซ้ำได้ เก็บค่าที่ดีที่สุดของวันนั้น
    for (const r of rows) {
      byDate[r.localDate] = Math.max(byDate[r.localDate] ?? 0, r.oneRm);
    }
    return dailySeries(axis, byDate);
  }, [axis, rows]);

  // window 1 = ลากเส้นผ่านค่าจริง ไม่เฉลี่ย เพราะ 1RM ไม่ได้แกว่งรายวันแบบน้ำหนักตัว
  const line = useMemo(() => seriesMovingAverage(series, 1), [series]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: name || 'ท่าเวท' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tiles}>
          <Tile c={c} label="1RM ประมาณ" value={record ? `${record.best1RM.toFixed(1)} kg` : '—'} />
          <Tile c={c} label="น้ำหนักสูงสุด" value={record ? `${record.bestWeightKg} kg` : '—'} />
          <Tile
            c={c}
            label="ยอดยกดีที่สุด"
            value={record ? `${Math.round(record.bestSessionVolume).toLocaleString()} kg` : '—'}
          />
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>1RM ประมาณ ย้อนหลัง {RANGE_DAYS} วัน</Text>
          <TrendChart
            series={series}
            average={line}
            unit="kg"
            lineLabel="1RM ประมาณ"
            emptyText={`ยังไม่มี ${name} ในช่วง ${RANGE_DAYS} วันนี้`}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>ประวัติการเล่น</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, paddingVertical: 4 }]}>
          {rows.length === 0 ? (
            <Text style={{ color: c.subtext, fontSize: 13, paddingVertical: 10 }}>
              ยังไม่มีประวัติของท่านี้
            </Text>
          ) : (
            rows.map((r) => (
              <View key={r.id} style={[styles.row, { borderBottomColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                    {formatDayRelative(r.localDate)}
                  </Text>
                  <Text style={{ color: c.subtext, fontSize: 12, marginTop: 3 }}>
                    {r.sets.map((s) => `${s.kg}×${s.reps}`).join(', ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>
                    {r.oneRm.toFixed(1)} kg
                  </Text>
                  <Text style={{ color: c.subtext, fontSize: 11, marginTop: 2 }}>
                    รวม {Math.round(r.volume).toLocaleString()} kg
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={{ color: c.subtext, fontSize: 12 }}>
          1RM คำนวณด้วยสูตร Epley จากเซ็ตที่ดีที่สุดของวันนั้น เป็นค่าประมาณ ไม่ใช่ค่าที่วัดจริง
          {rows.some((r) => !is1RMReliable(r.bestReps))
            ? ' และจะเพี้ยนมากขึ้นเมื่อเล่นเกิน 12 ครั้งต่อเซ็ต'
            : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

function Tile({
  c,
  label,
  value,
}: {
  c: ReturnType<typeof useTheme>;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={{ color: c.subtext, fontSize: 11 }}>{label}</Text>
      <Text style={[styles.tileValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 2 },
  tileValue: { fontSize: 17, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
