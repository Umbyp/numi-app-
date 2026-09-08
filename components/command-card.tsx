import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Check, X, Trash2 } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { AmountStepper } from './amount-stepper';
import { TOOL_LABELS } from '../lib/ai/tools';
import type { PendingCard } from '../lib/ai/types';
import type { AddMealArgs, LogWorkoutArgs, LogWeightArgs } from '../lib/ai/validators';

interface Props {
  card: PendingCard;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onChangeArgs: (id: string, args: unknown) => void;
  disabled?: boolean;
}

const MEAL_OPTIONS = [
  { key: 'breakfast', label: 'เช้า' },
  { key: 'lunch', label: 'กลางวัน' },
  { key: 'dinner', label: 'เย็น' },
  { key: 'snack', label: 'ของว่าง' },
] as const;

/**
 * การ์ดคำสั่ง — AI เสนอ ผู้ใช้ตรวจและแก้ได้ แล้วแอปเป็นคนเขียนลงฐานข้อมูล
 * ตัวเลขทุกอย่างแก้ได้ก่อนกดยืนยัน เพราะค่าที่ AI ประมาณมาผิดได้เสมอ
 */
export function CommandCard({ card, onConfirm, onDismiss, onChangeArgs, disabled }: Props) {
  const c = useTheme();

  if (card.status !== 'pending') {
    const done = card.status === 'confirmed';
    return (
      <View
        style={[
          styles.stub,
          { backgroundColor: c.card, borderColor: c.border },
          done && { borderColor: c.primary },
        ]}
      >
        <Text style={{ color: done ? c.primary : c.subtext, fontSize: 13 }}>
          {done ? '✓ ' : '✕ '}
          {TOOL_LABELS[card.tool] ?? card.tool}
          {done ? ' — บันทึกแล้ว' : ' — ยกเลิกแล้ว'}
        </Text>
        {done && card.result ? (
          <Text style={{ color: c.subtext, fontSize: 12, marginTop: 2 }}>{card.result}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.primary }]}>
      <Text style={[styles.title, { color: c.text }]}>{TOOL_LABELS[card.tool] ?? card.tool}</Text>

      {card.tool === 'add_meal' && (
        <AddMealBody card={card} onChangeArgs={onChangeArgs} />
      )}
      {card.tool === 'log_workout' && (
        <LogWorkoutBody card={card} onChangeArgs={onChangeArgs} />
      )}
      {card.tool === 'log_weight' && (
        <LogWeightBody card={card} onChangeArgs={onChangeArgs} />
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => onDismiss(card.id)}
          disabled={disabled}
          style={[styles.btn, styles.btnGhost, { borderColor: c.border }]}
        >
          <X size={15} color={c.subtext} />
          <Text style={{ color: c.subtext, fontSize: 14 }}>ยกเลิก</Text>
        </Pressable>
        <Pressable
          onPress={() => onConfirm(card.id)}
          disabled={disabled}
          style={[styles.btn, { backgroundColor: c.primary }, disabled && { opacity: 0.6 }]}
        >
          <Check size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>ยืนยัน</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddMealBody({
  card,
  onChangeArgs,
}: {
  card: PendingCard;
  onChangeArgs: (id: string, args: unknown) => void;
}) {
  const c = useTheme();
  const args = card.args as AddMealArgs;
  const total = args.items.reduce((s, i) => s + i.kcal, 0);

  /** แก้ปริมาณแล้วสเกลค่าโภชนาการตามสัดส่วนเดิม ไม่ใช่ให้ผู้ใช้กรอกเองทุกช่อง */
  function changeAmount(index: number, amountG: number) {
    const items = args.items.map((it, i) => {
      if (i !== index) return it;
      const ratio = it.amount_g > 0 ? amountG / it.amount_g : 0;
      return {
        ...it,
        amount_g: amountG,
        kcal: it.kcal * ratio,
        protein_g: it.protein_g * ratio,
        carb_g: it.carb_g * ratio,
        fat_g: it.fat_g * ratio,
      };
    });
    onChangeArgs(card.id, { ...args, items });
  }

  function removeItem(index: number) {
    if (args.items.length <= 1) return;
    onChangeArgs(card.id, { ...args, items: args.items.filter((_, i) => i !== index) });
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.pills}>
        {MEAL_OPTIONS.map((opt) => {
          const active = opt.key === args.meal_type;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChangeArgs(card.id, { ...args, meal_type: opt.key })}
              style={[
                styles.pill,
                { borderColor: c.border },
                active && { backgroundColor: c.primary, borderColor: c.primary },
              ]}
            >
              <Text style={{ color: active ? '#fff' : c.text, fontSize: 12 }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {args.items.map((item, i) => (
        <View key={`${item.name}-${i}`} style={[styles.itemRow, { borderTopColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={{ color: c.text, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.estimated && (
                <Text style={[styles.badge, { color: c.subtext, borderColor: c.border }]}>
                  ประมาณ
                </Text>
              )}
            </View>
            <Text style={{ color: c.subtext, fontSize: 12, marginTop: 3 }}>
              {Math.round(item.kcal)} kcal · P {item.protein_g.toFixed(1)} · C {item.carb_g.toFixed(1)} · F {item.fat_g.toFixed(1)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <AmountStepper value={item.amount_g} onChange={(v) => changeAmount(i, v)} />
            {args.items.length > 1 && (
              <Pressable hitSlop={8} onPress={() => removeItem(i)}>
                <Trash2 size={14} color={c.subtext} />
              </Pressable>
            )}
          </View>
        </View>
      ))}

      <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
        รวม {Math.round(total)} kcal
      </Text>
      {args.note ? (
        <Text style={{ color: c.subtext, fontSize: 12 }}>{args.note}</Text>
      ) : null}
    </View>
  );
}

function LogWorkoutBody({
  card,
  onChangeArgs,
}: {
  card: PendingCard;
  onChangeArgs: (id: string, args: unknown) => void;
}) {
  const c = useTheme();
  const args = card.args as LogWorkoutArgs;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontSize: 14 }}>{args.name}</Text>
      <View style={styles.fieldRow}>
        <Text style={{ color: c.subtext, fontSize: 13, flex: 1 }}>เวลา (นาที)</Text>
        <TextInput
          value={String(args.duration_min)}
          onChangeText={(v) => {
            const n = parseFloat(v);
            onChangeArgs(card.id, { ...args, duration_min: Number.isFinite(n) ? n : 0 });
          }}
          keyboardType="numeric"
          style={[styles.smallInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
        />
      </View>
      {args.distance_km != null && (
        <Text style={{ color: c.subtext, fontSize: 12 }}>ระยะทาง {args.distance_km} กม.</Text>
      )}
      <Text style={{ color: c.subtext, fontSize: 12 }}>
        {args.kcal_burned != null
          ? `เผา ${Math.round(args.kcal_burned)} kcal (ค่าที่ระบุมา)`
          : 'แคลอรี่จะคำนวณจากตาราง MET กับน้ำหนักตัวตอนบันทึก'}
      </Text>
    </View>
  );
}

function LogWeightBody({
  card,
  onChangeArgs,
}: {
  card: PendingCard;
  onChangeArgs: (id: string, args: unknown) => void;
}) {
  const c = useTheme();
  const args = card.args as LogWeightArgs;

  return (
    <View style={styles.fieldRow}>
      <Text style={{ color: c.subtext, fontSize: 13, flex: 1 }}>น้ำหนัก (kg)</Text>
      <TextInput
        value={String(args.weight_kg)}
        onChangeText={(v) => {
          const n = parseFloat(v);
          onChangeArgs(card.id, { ...args, weight_kg: Number.isFinite(n) ? n : 0 });
        }}
        keyboardType="numeric"
        style={[styles.smallInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  stub: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  title: { fontSize: 15, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontSize: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 90, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  btnGhost: { borderWidth: 1 },
});
