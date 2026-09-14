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
        <View style={[styles.eyebrowPill, { backgroundColor: c.brandTint }]}>
          <Text style={[type.badge, { color: c.brand }]}>การ์ดคำสั่ง</Text>
        </View>
        <Text style={[type.label, styles.eyebrowLabel, { color: c.muted }]} numberOfLines={1}>
          เพิ่มมื้ออาหาร · {meta.label}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      {items.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <FoodVisual name={item.name} photoUri={card.photoUri} size={38} />

          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={styles.nameRow}>
              <Text style={[type.row, { color: c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.estimated && (
                <Text style={[type.badge, styles.estBadge, { color: c.muted, borderColor: c.line }]}>ประมาณ</Text>
              )}
            </View>
            <View style={styles.badgeRow}>
              <Badge label={`P${Math.round(item.protein_g)}`} bg={c.proteinBg} text={c.proteinText} />
              <Badge label={`C${Math.round(item.carb_g)}`} bg={c.carbBg} text={c.carbText} />
              <Badge label={`F${Math.round(item.fat_g)}`} bg={c.fatBg} text={c.fatText} />
            </View>
          </View>

          <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{Math.round(item.kcal)}</Text>

          <AmountStepper value={item.amount_g} onChange={(v) => updateAmount(idx, v)} />

          <Squish hitSlop={14} onPress={() => removeItem(idx)}>
            <X size={16} color={c.muted} />
          </Squish>
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      <View style={styles.totalRow}>
        <Text style={[type.label, { color: c.subtext, flex: 1 }]}>รวมที่จะบันทึก</Text>
        <Text style={[type.metric, { color: c.text, fontSize: 26, letterSpacing: -0.6 }]}>{Math.round(total)}</Text>
        <Text style={[type.label, { color: c.muted, fontSize: 11.5 }]}>kcal</Text>
      </View>

      <View style={styles.actions}>
        <Squish style={[styles.ghost, { backgroundColor: c.surfaceAlt }]} onPress={() => onDismiss(card.id)}>
          <Text style={[type.row, { color: c.subtext, fontSize: 14 }]}>ไม่ใช่</Text>
        </Squish>
        <Squish scaleTo={0.97}
          style={[styles.primary, { backgroundColor: c.brand }, items.length === 0 && { opacity: 0.5 }]}
          disabled={items.length === 0}
          onPress={handleConfirm}
        >
          <Text style={[type.row, { color: '#fff', fontSize: 15 }]}>บันทึกเลย</Text>
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
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 14, marginVertical: 6, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  eyebrowPill: { height: 24, borderRadius: radius.badge + 3, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  eyebrowLabel: { flex: 1, minWidth: 0 },
  divider: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  badgeRow: { flexDirection: 'row', gap: 5 },
  badge: { borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ghost: { width: 104, borderRadius: radius.cardInner, height: 52, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1, borderRadius: radius.cardInner, height: 52, alignItems: 'center', justifyContent: 'center' },
});
