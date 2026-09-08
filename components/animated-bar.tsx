import { useEffect, useRef } from 'react';
import { View, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  /** 0-1 เกินหนึ่งจะถูกตัดที่หนึ่ง */
  fraction: number;
  color: string;
  trackColor: string;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * แถบความคืบหน้าที่วิ่งไปหาค่าใหม่ ไม่กระโดด
 * ใช้ useNativeDriver: false เพราะ animate ความกว้างเป็นเปอร์เซ็นต์
 */
export function AnimatedBar({ fraction, color, trackColor, height = 8, round, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, fraction));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const r = round ?? height / 2;

  return (
    <View style={[{ height, borderRadius: r, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius: r }} />
    </View>
  );
}
