import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/hooks/use-theme';
import { calcRingFraction, calcNetRemaining } from '../lib/nutrition';
import { type } from '../lib/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  consumedKcal: number;
  targetKcal: number;
  activityKcal: number;
  size?: number;
}

/** วงแหวน "ที่ควรได้รับ" — เติมตามสัดส่วนอาหารที่กินแล้วเทียบกับโควตารวมของวันนี้ (เป้าหมาย + กิจกรรม) */
export function CalorieRing({ consumedKcal, targetKcal, activityKcal, size = 152 }: Props) {
  const c = useTheme();
  const netRemaining = Math.round(calcNetRemaining({ targetKcal, consumedKcal, activityKcal }));
  const fraction = calcRingFraction({ targetKcal, consumedKcal, activityKcal });

  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedFraction = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedFraction, { toValue: fraction, duration: 600, useNativeDriver: false }).start();
  }, [fraction]);

  const strokeDashoffset = animatedFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={c.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>ที่ควรได้รับ</Text>
        <Text style={[type.metric, styles.value, { color: c.text }]}>{netRemaining.toLocaleString()}</Text>
        <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 34 },
});
