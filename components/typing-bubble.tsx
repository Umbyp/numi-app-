import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { pillShadow, motion } from '../lib/theme';

/**
 * ฟองข้อความ "กำลังพิมพ์" ที่อยู่ในบทสนทนาจริง
 * ของเดิมเป็นแถบ spinner ลอยอยู่ใต้ลิสต์ ซึ่งอ่านไม่ออกว่าเป็นส่วนของบทสนทนา
 */
export function TypingBubble() {
  const c = useTheme();
  const scheme = useScheme();
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: motion.duration.base, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: motion.duration.base, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(320 - i * 160),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={styles.row}>
      <Mascot size={30} pose="idle" />
      <View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.line }, pillShadow(scheme)]}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: c.muted, opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
