import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { Squish } from '../squish';
import { type as textType } from '../../lib/fonts';
import { radius, pillShadow } from '../../lib/theme';
import type { AskChoiceArgs } from '../../lib/ai/validators';
import type { PendingCard } from '../../lib/hooks/use-chat';

interface Props {
  card: PendingCard;
  onPick: (id: string, option: string) => void;
}

/** ปุ่มให้แตะเลือกแทนพิมพ์ตอบ — มาจาก tool ask_choice ตอน AI มีคำถามที่ตอบเป็นตัวเลือกได้ */
export function ChoiceCard({ card, onPick }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const args = card.args as AskChoiceArgs;

  return (
    <View style={styles.wrap}>
      {args.question ? (
        <Text style={[textType.label, { color: c.subtext, fontSize: 12.5, marginBottom: 8 }]}>{args.question}</Text>
      ) : null}
      <View style={styles.row}>
        {args.options.map((opt) => (
          <Squish
            key={opt}
            scaleTo={0.96}
            onPress={() => onPick(card.id, opt)}
            style={[styles.chip, { backgroundColor: c.surface, borderColor: c.line }, pillShadow(scheme)]}
          >
            <Text style={[textType.row, { color: c.text, fontSize: 13 }]}>{opt}</Text>
          </Squish>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, alignSelf: 'flex-start', maxWidth: '92%' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
});
