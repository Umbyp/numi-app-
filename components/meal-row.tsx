import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';

interface Entry {
  id: string;
  name: string;
  amountG: number;
  kcal: number;
  estimated: boolean | null;
}

interface Props {
  entry: Entry;
  onDelete: (id: string) => void;
}

export function MealRow({ entry, onDelete }: Props) {
  const c = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {entry.name}
          </Text>
          {entry.estimated ? (
            <Text style={[styles.badge, { color: c.subtext, borderColor: c.border }]}>
              ประมาณ
            </Text>
          ) : null}
        </View>
        <Text style={[styles.sub, { color: c.subtext }]}>{Math.round(entry.amountG)} g</Text>
      </View>
      <Text style={[styles.kcal, { color: c.text }]}>{Math.round(entry.kcal)} kcal</Text>
      <Pressable hitSlop={10} onPress={() => onDelete(entry.id)} style={styles.deleteBtn}>
        <Trash2 size={16} color={c.subtext} />
      </Pressable>
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
