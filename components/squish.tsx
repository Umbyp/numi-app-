import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../lib/theme';

/**
 * Pressable ที่ยุบลงตอนถูกแตะแล้วเด้งกลับ
 *
 * ทำไมต้องมี: ก่อนหน้านี้ทั้งแอปมี 29 ไฟล์ที่ใช้ Pressable แต่มีไฟล์เดียว
 * (mascot-greeting) ที่ใช้ ({ pressed }) ทำ feedback ทางสายตา ขณะที่ 11 ไฟล์ใช้ Haptics
 * แอปจึงสั่นมากกว่าขยับ — กดแล้วมือรู้สึกแต่ตาไม่เห็นอะไรเลย
 *
 * ทำไมใช้ createAnimatedComponent(Pressable) ไม่ใช่ห่อ Animated.View ข้างนอก
 * Pressable ของ RN เรนเดอร์ <View> พร้อมส่ง ref ไปที่ host view ตรง ๆ
 * (Libraries/Components/Pressable/Pressable.js) จึงผูก native driver ได้เลย
 * ถ้าห่อ View เพิ่มจะต้องไล่ย้าย flex/width ของทุกจุดที่เรียกใช้ ซึ่งพัง layout ได้ง่าย
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * ยุบลงเหลือเท่าไหร่ — ต้องปรับตามขนาดของสิ่งที่กด
   * ปุ่มเล็ก 30-56pt ใช้ค่าเริ่มต้น 0.95 (ยุบ 2-3pt พอเห็น)
   * การ์ดเต็มความกว้างต้องใช้ 0.97-0.98 ไม่งั้นขยับเป็นสิบพิกเซลจนดูกระตุก
   */
  scaleTo?: number;
}

export function Squish({ children, style, scaleTo = 0.95, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function spring(toValue: number, cfg: { friction: number; tension: number }) {
    Animated.spring(scale, { toValue, useNativeDriver: true, ...cfg }).start();
  }

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        spring(scaleTo, motion.spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1, motion.spring.pop);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
