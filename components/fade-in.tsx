import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: any;
}

/** เฟด + เลื่อนขึ้นเบา ๆ ตอน mount ครั้งเดียว — ใช้ห่อ item ในลิสต์ที่เพิ่งปรากฏใหม่ (ไม่เล่นซ้ำตอน re-render อันเดิม) */
export function FadeInView({ children, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
