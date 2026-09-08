import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { pickMood, type DayState } from '../lib/mascot-pose';
import { type } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';

interface Props extends DayState {
  /** เล่นแอนิเมชันฉลองได้ไหม — แดชบอร์ดส่ง false มาถ้าฉลองของวันนี้ไปแล้ว */
  allowCelebrate?: boolean;
  onCelebrated?: () => void;
  /** กดเพื่อคุยกับมาสคอตต่อ */
  onPress?: () => void;
}

/**
 * มาสคอตพูดกับผู้ใช้บนแดชบอร์ด
 *
 * ทำเป็นฟองคำพูดที่มีหางชี้ไปหาแมว ไม่ใช่การ์ดสี่เหลี่ยมอีกใบ
 * เพราะของเดิมเป็นการ์ดขาวขอบบางเงาเดียวกับการ์ดแคลอรี่ที่อยู่ใต้มัน
 * น้ำหนักภาพเท่ากันหมด จึงไม่อ่านว่า "แมวกำลังพูด" แต่อ่านว่า "อีกหนึ่งการ์ดในตับ"
 *
 * บอกอารมณ์ด้วยแถบสีที่ขอบซ้ายของฟอง ไม่ใช่ไล่สีพื้นทั้งใบ
 * เพราะวัดคอนทราสต์แล้วพื้นที่ไล่สีทำให้บรรทัดรองตกเกณฑ์ WCAG AA ใน light mode
 * (fatBg ได้ 4.22 / carbBg ได้ 4.09 ต่ำกว่า 4.5) พื้นฟองจึงเป็น surface เสมอ
 * แถบสีบาง ๆ ยังบอกสถานะได้จากการกวาดตาและไม่แตะตัวอักษรเลย
 */
export function MascotGreeting({ allowCelebrate = false, onCelebrated, onPress, ...state }: Props) {
  const c = useTheme();
  const mood = pickMood(state);

  const bounce = useRef(new Animated.Value(0)).current;
  const celebrated = useRef(false);

  useEffect(() => {
    if (!mood.celebrate || !allowCelebrate || celebrated.current) return;
    celebrated.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2.4)), useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 0, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start(() => onCelebrated?.());
  }, [mood.celebrate, allowCelebrate]);

  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const lift = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rock = bounce.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] });

  const accent =
    mood.pose === 'goal' ? c.brand : mood.pose === 'rest' ? c.fat : mood.pose === 'start' ? c.carb : c.muted;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
    >
      <Animated.View style={{ transform: [{ scale }, { translateY: lift }, { rotate: rock }] }}>
        <Mascot size={74} pose={mood.pose} />
      </Animated.View>

      <View style={styles.bubbleCol}>
        {/* หางฟอง — สี่เหลี่ยมหมุน 45 องศาสีเดียวกับฟอง ทำให้ต่อเนื่องเป็นชิ้นเดียว */}
        <View style={[styles.tail, { backgroundColor: c.surface }]} />
        <View style={[styles.bubble, { backgroundColor: c.surface }]}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <View style={styles.bubbleBody}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>{mood.title}</Text>
            <Text style={[type.label, { color: c.subtext, fontSize: 12.5, lineHeight: 18 }]}>{mood.line}</Text>

            {onPress ? (
              <View style={[styles.chip, { backgroundColor: c.brandTint }]}>
                <Text style={[type.row, { color: c.text, fontSize: 12 }]}>ถาม Numi</Text>
                <ChevronRight size={13} color={c.brand} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: MIN_TOUCH },
  bubbleCol: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  tail: { width: 14, height: 14, marginRight: -7, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  bubble: { flex: 1, minWidth: 0, flexDirection: 'row', borderRadius: radius.card, overflow: 'hidden' },
  accentBar: { width: 4 },
  bubbleBody: { flex: 1, minWidth: 0, paddingHorizontal: 15, paddingVertical: 13, gap: 3 },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radius.pill,
    marginTop: 6,
  },
});
