import { useRef } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * การ์ดที่ยุบลงเล็กน้อยตอนกด
 * ของเดิมการ์ดที่กดได้กับกดไม่ได้หน้าตาเหมือนกันหมด ไม่มีอะไรบอกว่าอันไหนกดได้
 */
export function PressableCard({ onPress, disabled, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, friction: 7, tension: 180, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      onPressIn={() => to(0.975)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
