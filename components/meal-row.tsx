import { View, Text, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { type } from '../lib/fonts';
import { getMealTypeMeta, type MealType } from '../lib/meal-type';
import { MealTypeIcon } from './icons/meal-type-icons';
import { radius } from '../lib/theme';
import { Squish } from './squish';

interface Entry {
  id: string;
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  estimated: boolean | null;
  mealType: string;
  loggedAt: Date;
}

interface Props {
  entry: Entry;
  onDelete: (id: string) => void;
}

export function MealRow({ entry, onDelete }: Props) {
  const c = useTheme();
  const meta = getMealTypeMeta(entry.mealType as MealType);
  const time = entry.loggedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.row, { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.iconBox, { backgroundColor: c[meta.bgKey] }]}>
        <MealTypeIcon type={meta.key} color={c[meta.colorKey]} size={20} />
      </View>

      <View style={styles.middle}>
        <Text style={[type.row, { color: c.text }]} numberOfLines={1}>
          {entry.name}
        </Text>
        <View style={styles.badgeRow}>
          <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>{Math.round(entry.kcal)} kcal</Text>
          <Badge label={`P${Math.round(entry.proteinG)}`} bg={c.proteinBg} text={c.proteinText} />
          <Badge label={`C${Math.round(entry.carbG)}`} bg={c.carbBg} text={c.carbText} />
          <Badge label={`F${Math.round(entry.fatG)}`} bg={c.fatBg} text={c.fatText} />
          {entry.estimated ? <Badge label="ประมาณ" bg={c.surfaceAlt} text={c.muted} /> : null}
        </View>
      </View>

      <View style={styles.right}>
        <View style={[styles.mealBadge, { backgroundColor: c[meta.bgKey] }]}>
          <MealTypeIcon type={meta.key} color={c[meta.textKey]} size={10} />
          <Text style={[type.badge, { color: c[meta.textKey] }]}>{meta.label}</Text>
        </View>
        <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>{time}</Text>
      </View>

      <Squish hitSlop={10} onPress={() => onDelete(entry.id)} style={styles.deleteBtn}>
        <Trash2 size={16} color={c.muted} />
      </Squish>
    </View>
  );
}

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[type.badge, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.row,
    padding: 8,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.iconBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, minWidth: 0, gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  badge: { borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deleteBtn: { padding: 4 },
});
