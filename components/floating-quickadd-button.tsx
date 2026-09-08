import { Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { fabShadow } from '../lib/theme';

/** ปุ่มเพิ่มด่วนลอยมุมซ้ายล่าง สมมาตรกับปุ่ม AI (FloatingAIButton) ฝั่งขวา — เดิมเคยเป็นช่องกลางแถบแท็บ ย้ายออกมาลอยแทนเพื่อให้แถบแท็บสมดุล */
export function FloatingQuickAddButton({ onPress, bottomOffset = 100 }: { onPress: () => void; bottomOffset?: number }) {
  const c = useTheme();
  const scheme = useScheme();

  return (
    <Pressable
      style={[styles.btn, { bottom: bottomOffset, backgroundColor: c.brand }, fabShadow(scheme, c.brand)]}
      onPress={onPress}
      hitSlop={8}
    >
      <Plus size={26} color="#fff" strokeWidth={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
