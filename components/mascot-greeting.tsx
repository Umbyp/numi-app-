import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { pickMood, type DayState } from '../lib/mascot-pose';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

interface Props extends DayState {
  /** เล่นแอนิเมชันฉลองได้ไหม — แดชบอร์ดส่ง false มาถ้าฉลองของวันนี้ไปแล้ว */
  allowCelebrate?: boolean;
  onCelebrated?: () => void;
  /** กดการ์ดเพื่อคุยกับมาสคอตต่อ */
  onPress?: () => void;
}

/**
 * แถบทักทายบนแดชบอร์ด — มาสคอตเปลี่ยนท่าและพูดตามสถานะของวัน
 * ก่อนหน้านี้มาสคอตเป็นรูปนิ่งมุมจอ ไม่เคยรู้ว่าเกิดอะไรขึ้น
 */
export function MascotGreeting({ allowCelebrate = false, onCelebrated, onPress, ...state }: Props) {
  const c = useTheme();
  const scheme = useScheme();
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

  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const lift = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.line },
        cardShadow(scheme),
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* ไม่ใส่วงกลมสีรองข้างหลัง เพราะตัวรูปมาสคอตมีวงกลมฟ้าเป็นพื้นในตัวเองอยู่แล้ว
          ซ้อนอีกชั้นจะกลายเป็นวงในวงและสีตีกัน */}
      <Animated.View style={{ transform: [{ scale }, { translateY: lift }] }}>
        <Mascot size={56} pose={mood.pose} />
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{mood.title}</Text>
        <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>{mood.line}</Text>
      </View>
      {onPress ? <Text style={[type.label, { color: c.brand, fontSize: 12 }]}>ถาม Numi ›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 12,
    paddingRight: 16,
  },
});
