import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { radius } from '../lib/theme';

interface BlockProps {
  width?: DimensionValue;
  height?: number;
  round?: number;
}

/**
 * กล่องเทาเต้นจาง ๆ ระหว่างรอข้อมูล
 * ก่อนหน้านี้ทุกหน้าเปิดมาโชว์เลข 0 กับกราฟว่างแล้วค่อยกระตุกเป็นข้อมูลจริง
 * ผู้ใช้ใหม่จะคิดว่าแอปพัง — โชว์โครงว่างแทนจะอ่านได้ว่า "กำลังโหลด"
 */
export function SkeletonBlock({ width = '100%', height = 14, round }: BlockProps) {
  const c = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: round ?? radius.badge,
        backgroundColor: c.line,
        opacity: pulse,
      }}
    />
  );
}

/** โครงว่างของการ์ดแคลอรี่บนแดชบอร์ด — วงแหวน + สามแถวสถิติ + สามแถบมาโคร */
export function CalorieCardSkeleton() {
  return (
    <View style={styles.wrap}>
      <SkeletonBlock width={110} height={16} />
      <View style={styles.ringRow}>
        <SkeletonBlock width={152} height={152} round={76} />
        <View style={styles.statCol}>
          <SkeletonBlock height={34} round={radius.iconBox} />
          <SkeletonBlock height={34} round={radius.iconBox} />
          <SkeletonBlock height={34} round={radius.iconBox} />
        </View>
      </View>
      <View style={styles.macroRow}>
        <SkeletonBlock height={26} round={radius.badge} />
        <SkeletonBlock height={26} round={radius.badge} />
        <SkeletonBlock height={26} round={radius.badge} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statCol: { flex: 1, gap: 8 },
  macroRow: { flexDirection: 'row', gap: 10 },
});
