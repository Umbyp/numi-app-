import { Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { fabShadow } from '../lib/theme';

/**
 * ปุ่มเพิ่มด่วน — ปุ่มลอยเดียวของแอป
 * เดิมมีปุ่ม AI ลอยคู่กันอีกฝั่ง สองปุ่มขนาดเท่ากันจึงไม่มีอันไหนเป็น primary
 * และรวมกับ 5 แท็บทำให้โซนล่างมีเป้ากดเจ็ดอัน ตอนนี้ทางเข้าแชทอยู่หัวแดชบอร์ดกับใน sheet นี้แทน
 * วางมุมขวาล่างตามที่นิ้วโป้งเอื้อมถึงและตามที่คนคาดหวังบนมือถือ
 */
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
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
