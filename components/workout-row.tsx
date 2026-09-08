import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { CATEGORY_LABELS, type WorkoutCategory } from '../lib/mets';
import { sessionVolume } from '../lib/strength';
import type { ExerciseSet } from '../lib/db/schema';

interface Session {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  kcalBurned: number;
  distanceKm: number | null;
  sets: ExerciseSet[] | null;
}

interface Props {
  session: Session;
  onDelete?: (id: string) => void;
}

export function WorkoutRow({ session, onDelete }: Props) {
  const c = useTheme();

  const detail: string[] = [`${Math.round(session.durationMin)} นาที`];
  if (session.distanceKm) detail.push(`${session.distanceKm} กม.`);
  if (session.sets?.length) {
    const setCount = session.sets.reduce((s, e) => s + e.sets.length, 0);
    detail.push(`${session.sets.length} ท่า · ${setCount} เซ็ต`);
    const vol = sessionVolume(session.sets);
    if (vol > 0) detail.push(`รวม ${Math.round(vol).toLocaleString()} kg`);
  }

  const exercises = session.sets?.map((e) => e.exercise).join(', ');

  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {session.name}
          </Text>
          <Text style={[styles.badge, { color: c.subtext, borderColor: c.border }]}>
            {CATEGORY_LABELS[session.category as WorkoutCategory] ?? session.category}
          </Text>
        </View>
        <Text style={[styles.sub, { color: c.subtext }]}>{detail.join(' · ')}</Text>
        {exercises ? (
          <Text style={[styles.sub, { color: c.subtext }]} numberOfLines={1}>
            {exercises}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.kcal, { color: c.text }]}>{Math.round(session.kcalBurned)} kcal</Text>
      {onDelete && (
        <Pressable hitSlop={10} onPress={() => onDelete(session.id)} style={styles.deleteBtn}>
          <Trash2 size={16} color={c.subtext} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  badge: {
    fontSize: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  sub: { fontSize: 12, marginTop: 2 },
  kcal: { fontSize: 14, fontWeight: '600' },
  deleteBtn: { padding: 4 },
});
