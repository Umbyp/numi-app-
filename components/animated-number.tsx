import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type StyleProp, type TextStyle } from 'react-native';

interface Props {
  value: number;
  /** แปลงเลขเป็นข้อความ ค่าเริ่มต้นคือปัดเป็นจำนวนเต็มพร้อมคอมมา */
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

/**
 * ตัวเลขที่ไล่ขึ้นไปหาค่าใหม่ ไม่กระโดด
 *
 * RN ยังแก้ข้อความใน Text ด้วย native driver ไม่ได้ จึงต้องฟังค่าจาก Animated.Value
 * แล้ว setState ตาม ค่าใช้จ่ายยอมรับได้เพราะ animate แค่ครึ่งวินาทีตอนค่าเปลี่ยน
 */
export function AnimatedNumber({ value, format = defaultFormat, style, duration = 500 }: Props) {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}
