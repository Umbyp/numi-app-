import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { AmountStepper } from '../amount-stepper';
import { MealTypeIcon } from '../icons/meal-type-icons';
import { getMealTypeMeta, type MealType } from '../../lib/meal-type';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import type { AddMealArgs } from '../../lib/ai/validators';

interface Props {
  card: { id: string; args: AddMealArgs };
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

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      {items.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: c[meta.bgKey] }]}>
            <MealTypeIcon type={meta.key} color={c[meta.colorKey]} size={18} />
          </View>

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

          <Pressable hitSlop={10} onPress={() => removeItem(idx)}>
            <X size={16} color={c.muted} />
          </Pressable>
        </View>
      ))}

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      <View style={styles.actions}>
        <Text style={[type.label, { color: c.muted, flex: 1 }]}>
          รวม <Text style={[type.cardTitle, { color: c.text, fontSize: 13 }]}>{Math.round(total)} kcal</Text>
        </Text>
        <Pressable style={[styles.ghost, { backgroundColor: c.surfaceAlt }]} onPress={() => onDismiss(card.id)}>
          <Text style={[type.row, { color: c.subtext, fontSize: 13 }]}>ยกเลิก</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, { backgroundColor: c.brand }, items.length === 0 && { opacity: 0.5 }]}
          disabled={items.length === 0}
          onPress={handleConfirm}
        >
          <Text style={[type.row, { color: '#fff', fontSize: 13 }]}>ยืนยัน</Text>
        </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { letterSpacing: 0.4 },
  mealPill: { borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 2 },
  divider: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  iconBox: { width: 36, height: 36, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  badgeRow: { flexDirection: 'row', gap: 5 },
  badge: { borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghost: { borderRadius: radius.iconBox, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
  primary: { borderRadius: radius.iconBox, paddingHorizontal: 18, height: 40, alignItems: 'center', justifyContent: 'center' },
});
