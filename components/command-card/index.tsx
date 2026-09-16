import { View, Text, StyleSheet } from 'react-native';
import { Check, X as XIcon } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/use-theme';
import { AddMealCard } from './add-meal-card';
import { WorkoutPlanCard } from './workout-plan-card';
import { ChoiceCard } from './choice-card';
import type { PendingCard } from '../../lib/hooks/use-chat';

interface Props {
  card: PendingCard;
  onConfirm: (id: string, editedArgs?: unknown) => void;
  onDismiss: (id: string) => void;
}

export function CommandCard({ card, onConfirm, onDismiss }: Props) {
  // ask_choice ตอบแล้วคำตอบไปโผล่เป็นข้อความแชทปกติอยู่แล้ว ไม่ต้องมี stub ค้างซ้ำ
  if (card.tool === 'ask_choice' && card.status !== 'pending') return null;
  if (card.status === 'confirmed') return <StatusStub icon="confirmed" label="บันทึกแล้ว" />;
  if (card.status === 'dismissed') return <StatusStub icon="dismissed" label="ยกเลิกแล้ว" />;

  switch (card.tool) {
    case 'add_meal':
      return <AddMealCard card={card} onConfirm={onConfirm} onDismiss={onDismiss} />;
    case 'propose_workout_plan':
      return <WorkoutPlanCard card={card} onConfirm={onConfirm} onDismiss={onDismiss} />;
    case 'ask_choice':
      return <ChoiceCard card={card} onPick={onConfirm} />;
    default:
      return null;
  }
}

function StatusStub({ icon, label }: { icon: 'confirmed' | 'dismissed'; label: string }) {
  const c = useTheme();
  return (
    <View style={[styles.stub, { backgroundColor: c.ghostBg }]}>
      {icon === 'confirmed' ? <Check size={14} color={c.primary} /> : <XIcon size={14} color={c.subtext} />}
      <Text style={{ color: c.subtext, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
});
