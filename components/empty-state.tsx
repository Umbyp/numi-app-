import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { type } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';

interface Props {
  title: string;
  description?: string;
  /** ปุ่มพาไปทำต่อ — สถานะว่างที่ไม่มีทางออกทำให้ผู้ใช้ค้าง ไม่รู้ว่าต้องทำอะไร */
  actionLabel?: string;
  onAction?: () => void;
  mascotSize?: number;
}

export function EmptyState({ title, description, actionLabel, onAction, mascotSize = 56 }: Props) {
  const c = useTheme();

  return (
    <View style={styles.wrap}>
      <Mascot size={mascotSize} />
      <Text style={[type.cardTitle, { color: c.text, fontSize: 16, textAlign: 'center' }]}>{title}</Text>
      {description ? (
        <Text style={[type.label, { color: c.subtext, fontSize: 12.5, textAlign: 'center', lineHeight: 19 }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={[styles.action, { backgroundColor: c.brand }]}>
          <Text style={[type.row, { color: c.onBrand, fontSize: 13 }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 24 },
  action: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radius.iconBox,
    marginTop: 4,
  },
});
