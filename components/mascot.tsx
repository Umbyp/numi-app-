import { useEffect, useRef } from 'react';
import { Animated, Easing, type ImageStyle, type StyleProp } from 'react-native';
import type { MascotPose } from '../lib/mascot-pose';
import { motion } from '../lib/theme';

interface Props {
  size?: number;
  /** ท่าตามสถานะ ดู lib/mascot-pose.ts */
  pose?: MascotPose;
  style?: StyleProp<ImageStyle>;
  /** ปิดได้ถ้าจุดที่ใช้มีแอนิเมชันของตัวเองอยู่แล้ว (เช่น celebration) หรือโชว์ซ้ำเป็นแถวยาว (avatar ในแชท) */
  animated?: boolean;
}

/**
 * โลโก้แมวมาสคอตของ Numi
 *
 * require ต้องเป็น path คงที่ทั้งหมด Metro จึงจะรวมรูปเข้า bundle ได้
 * เขียน require(`../assets/mascot-${pose}.png`) ไม่ได้
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const SOURCES: Record<MascotPose, ReturnType<typeof require>> = {
  idle: require('../assets/mascot-start.png'),
  start: require('../assets/mascot-start.png'),
  rest: require('../assets/mascot-rest.png'),
  goal: require('../assets/mascot-goal.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export function Mascot({ size = 44, pose = 'idle', style, animated = false }: Props) {
  const breath = useRef(new Animated.Value(0)).current;

  // หายใจเบา ๆ ตลอดเวลา — ใช้ motion.duration.breath ตัวเดียวกับที่ token ไว้ให้ "ของที่ยังไม่พร้อม"
  // (skeleton) ยืมมาใช้กับสิ่งที่ "มีชีวิต" แทน จังหวะช้าและ sine easing ทำให้ดูเหมือนหายใจจริง ๆ
  // ไม่ใช่เด้งเล่น — ขยับแค่ ~4% ของขนาด ตาเห็นว่ามีชีวิตแต่ไม่แย่งความสนใจจากข้อความข้าง ๆ
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: motion.duration.breath,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: motion.duration.breath,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const translateY = breath.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Animated.Image
      source={SOURCES[pose]}
      style={[{ width: size, height: size, transform: animated ? [{ scale }, { translateY }] : undefined }, style]}
      resizeMode="contain"
    />
  );
}
