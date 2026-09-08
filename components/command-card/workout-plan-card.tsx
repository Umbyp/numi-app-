import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { CategoryIcon, categoryTint, DayTypeIcon, dayTypeTint } from '../icons/workout-icons';
import { muscleGroupLabel } from '../../lib/met';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import type { WorkoutPlanArgs } from '../../lib/ai/validators';

interface Props {
  card: { id: string; args: WorkoutPlanArgs };
  onConfirm: (id: string, editedArgs: WorkoutPlanArgs) => void;
  onDismiss: (id: string) => void;
}

const DAY_TYPE_LABEL: Record<'cardio' | 'strength' | 'both', string> = {
  cardio: 'วันคาร์ดิโอ',
  strength: 'วันเวท',
  both: 'คาร์ดิโอ + เวท',
};

export function WorkoutPlanCard({ card, onConfirm, onDismiss }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const [days, setDays] = useState(card.args.days);
  const exerciseCount = days.reduce((s, d) => s + d.exercises.length, 0);

  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev
        .map((d, i) => (i === dayIdx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d))
        .filter((d) => d.exercises.length > 0)
    );
  }

  async function handleConfirm() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(card.id, { ...card.args, days });
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <View style={styles.header}>
        <Text style={[type.badge, styles.eyebrow, { color: c.muted }]}>การ์ดคำสั่ง · แผนออกกำลังกาย</Text>
      </View>
      <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>{card.args.title}</Text>
      <Text style={[type.label, { color: c.subtext, fontSize: 12, lineHeight: 18 }]}>{card.args.rationale}</Text>

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      {days.map((day, dayIdx) => {
        const dTint = dayTypeTint(day.day_type, c);
        return (
          <View key={dayIdx} style={{ gap: 6 }}>
            <View style={styles.dayHeaderRow}>
              <Text style={[type.row, { color: c.text, fontSize: 13 }]}>{day.label}</Text>
              <View style={[styles.dayTypePill, { backgroundColor: dTint.bg }]}>
                <DayTypeIcon dayType={day.day_type} size={12} color={dTint.icon} />
                <Text style={[type.badge, { color: dTint.icon }]}>{DAY_TYPE_LABEL[day.day_type]}</Text>
              </View>
            </View>
            {day.warmup && <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>ก่อนเล่น: {day.warmup}</Text>}
            {day.during_note && <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>ระหว่างเล่น: {day.during_note}</Text>}
            {day.cooldown && <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>หลังเล่น: {day.cooldown}</Text>}

            {day.exercises.map((ex, exIdx) => {
              const eTint = categoryTint(ex.category, c);
              return (
                <View key={exIdx} style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: eTint.bg }]}>
                    <CategoryIcon category={ex.category} size={17} color={eTint.icon} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={[type.row, { color: c.text, fontSize: 13 }]} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <View style={styles.badgeRow}>
                      {muscleGroupLabel(ex.muscle_group) && (
                        <Badge label={muscleGroupLabel(ex.muscle_group)!} bg={eTint.bg} text={eTint.icon} />
                      )}
                      <Badge label={`MET ${ex.met}`} bg={c.surfaceAlt} text={c.subtext} />
                      <Badge label={`${ex.duration_min} นาที`} bg={c.surfaceAlt} text={c.subtext} />
                      {ex.sets != null && ex.reps && (
                        <Badge label={`${ex.sets}x${ex.reps}`} bg={c.surfaceAlt} text={c.subtext} />
                      )}
                      {ex.rest_sec != null && <Badge label={`พัก ${ex.rest_sec}วิ`} bg={c.surfaceAlt} text={c.subtext} />}
                    </View>
                  </View>
                  <Pressable hitSlop={10} onPress={() => removeExercise(dayIdx, exIdx)}>
                    <X size={16} color={c.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}

      <View style={[styles.divider, { backgroundColor: c.line }]} />

      <View style={styles.actions}>
        <Text style={[type.label, { color: c.muted, flex: 1 }]}>
          รวม <Text style={[type.cardTitle, { color: c.text, fontSize: 13 }]}>{days.length} วัน · {exerciseCount} ท่า</Text>
        </Text>
        <Pressable style={[styles.ghost, { backgroundColor: c.surfaceAlt }]} onPress={() => onDismiss(card.id)}>
          <Text style={[type.row, { color: c.subtext, fontSize: 13 }]}>ยกเลิก</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, { backgroundColor: c.brand }, days.length === 0 && { opacity: 0.5 }]}
          disabled={days.length === 0}
          onPress={handleConfirm}
        >
          <Text style={[type.row, { color: c.onBrand, fontSize: 13 }]}>ยืนยัน</Text>
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
  divider: { height: 1 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTypePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  iconBox: { width: 36, height: 36, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  badge: { borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghost: { borderRadius: radius.iconBox, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
  primary: { borderRadius: radius.iconBox, paddingHorizontal: 18, height: 40, alignItems: 'center', justifyContent: 'center' },
});
