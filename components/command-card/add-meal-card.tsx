import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { AmountStepper } from '../amount-stepper';
import { FoodVisual } from '../food-visual';
import { getMealTypeMeta, type MealType } from '../../lib/meal-type';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import type { AddMealArgs } from '../../lib/ai/validators';
import { Squish } from '../squish';

interface Props {
  card: { id: string; args: AddMealArgs; photoUri?: string | null };
  onConfirm: (id: string, editedArgs: AddMealArgs) => void;
  onDismiss: (id: string) => void;
}

export function AddMealCard({ card, onConfirm, onDismiss }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const [items, setItems] = useState(card.args.items);
  const total = items.reduce((s, i) => s + i.kcal, 0);
  const meta = getMealTypeMeta(card.args.meal_type as MealType);

  function updateAmount(idx: number, newG: number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const ratio = newG / it.amount_g;
        return {
          ...it,
          amount_g: newG,
          kcal: Math.round(it.kcal * ratio),
          protein_g: +(it.protein_g * ratio).toFixed(1),
          carb_g: +(it.carb_g * ratio).toFixed(1),
          fat_g: +(it.fat_g * ratio).toFixed(1),
        };
      })
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(card.id, { ...card.args, items });
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <View style={styles.header}>
        <Text style={[type.badge, styles.eyebrow, { color: c.muted }]}>การ์ดคำสั่ง · บันทึกอาหาร</Text>
        <View style={[styles.mealPill, { backgroundColor: c[meta.bgKey] }]}>
          <Text style={[type.badge, { color: c[meta.textKey] }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={[styles.itemsCard, { backgroundColor: c.surfaceAlt }]}>
        {items.map((item, idx) => (
          <View key={idx} style={[styles.row, idx > 0 && { borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <FoodVisual name={item.name} photoUri={card.photoUri} size={38} />

            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={[type.row, { color: c.text, fontSize: 14.5 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.subRow}>
                <Text style={[type.label, { color: c.muted, fontSize: 11.5 }]} numberOfLines={1}>
                  {Math.round(item.amount_g)} กรัม{item.estimated ? ' · ประเมินโดย Numi' : ''}
                </Text>
              </View>
              <View style={styles.badgeRow}>
                <Badge label={`P${Math.round(item.protein_g)}`} bg={c.proteinBg} text={c.proteinText} />
                <Badge label={`C${Math.round(item.carb_g)}`} bg={c.carbBg} text={c.carbText} />
                <Badge label={`F${Math.round(item.fat_g)}`} bg={c.fatBg} text={c.fatText} />
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{Math.round(item.kcal)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AmountStepper compact value={item.amount_g} onChange={(v) => updateAmount(idx, v)} />
                <Squish hitSlop={10} onPress={() => removeItem(idx)}>
                  <X size={15} color={c.muted} />
                </Squish>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={[type.label, { color: c.subtext, fontSize: 12.5 }]}>รวมที่จะบันทึก</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={[type.metric, { color: c.text, fontSize: 26 }]}>{Math.round(total)}</Text>
          <Text style={[type.label, { color: c.muted, fontSize: 12.5 }]}>kcal</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Squish style={[styles.ghost, { backgroundColor: c.surfaceAlt }]} onPress={() => onDismiss(card.id)}>
          <Text style={[type.row, { color: c.subtext, fontSize: 13 }]}>ยกเลิก</Text>
        </Squish>
        <Squish scaleTo={0.97}
          style={[styles.primary, { backgroundColor: c.brand }, items.length === 0 && { opacity: 0.5 }]}
          disabled={items.length === 0}
          onPress={handleConfirm}
        >
          <Text style={[type.row, { color: '#fff', fontSize: 13 }]}>ยืนยัน</Text>
        </Squish>
      </View>
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
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 14, marginVertical: 6, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { letterSpacing: 0.4 },
  mealPill: { borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 2 },
  itemsCard: { borderRadius: radius.cardInner, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 5 },
  badge: { borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ghost: { width: 104, borderRadius: radius.iconBox, height: 48, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1, borderRadius: radius.iconBox, height: 48, alignItems: 'center', justifyContent: 'center' },
});
