import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/hooks/use-theme';

interface Props {
  consumed: number;
  target: number;
  size?: number;
}

/** วงแหวนแสดงแคลอรี่คงเหลือวันนี้ — เลขใหญ่ตรงกลาง อ่านได้ใน 1 วินาที */
export function CalorieRing({ consumed, target, size = 180 }: Props) {
  const c = useTheme();
  const remaining = Math.round(target - consumed);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(1, Math.max(0, consumed / target)) : 0;
  const overBudget = consumed > target;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.ringTrack}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={overBudget ? c.ringOver : c.ringActive}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.remaining, { color: c.text }]}>
          {Math.abs(remaining).toLocaleString()}
        </Text>
        <Text style={[styles.label, { color: c.subtext }]}>
          {overBudget ? 'kcal เกินเป้า' : 'kcal เหลือ'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  remaining: { fontSize: 34, fontWeight: '700' },
  label: { fontSize: 13, marginTop: 2 },
});
