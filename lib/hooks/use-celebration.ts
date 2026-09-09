import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { motion } from '../theme';

/**
 * การฉลองตอนถึงเป้า — โตขึ้น ลอยขึ้น เอียงนิดหน่อย แล้วเด้งกลับ
 *
 * เดิม logic นี้ฝังอยู่ใน mascot-greeting ใช้ซ้ำไม่ได้ ผลคือมีแค่ที่แดชบอร์ด
 * ที่ฉลองตอนเข้าเป้าแคลอรี่ ส่วนดื่มน้ำครบ ทำครบทุกเซต หรือถึงเป้าโปรตีน
 * เงียบสนิททั้งที่เป็นช่วงเวลาที่คนอยากได้คำชมที่สุด
 *
 * เรื่องจังหวะการยิง (สำคัญ)
 * ---------------------------
 * โดยปกติฉลองเฉพาะ "ตอนที่เพิ่งข้ามเส้น" คือ when เปลี่ยนจาก false เป็น true
 * ถ้าเปิดหน้าขึ้นมาแล้ว when เป็น true อยู่แล้ว (ดื่มน้ำครบไปตั้งแต่เช้า)
 * จะไม่ฉลอง เพราะมันไม่ใช่ข่าวใหม่ และการเด้งทุกครั้งที่กลับมาหน้านี้จะน่ารำคาญ
 *
 * ยกเว้นกรณีที่ผู้เรียกจำสถานะ "ฉลองไปแล้วหรือยัง" ไว้เองข้างนอก เช่นแดชบอร์ด
 * ที่เก็บ celebrated_date ลง DB — กรณีนั้นส่ง fireOnMount มาเพื่อให้ยิงได้เลย
 * ตั้งแต่เฟรมแรก เพราะ allow ที่ส่งมาเป็นตัวคุมอยู่แล้วว่าซ้ำหรือเปล่า
 */

interface Options {
  /** ถึงเป้าแล้วหรือยัง */
  when: boolean;
  /** อนุญาตให้ฉลองไหม — ใช้กับที่ที่จำไว้ว่าฉลองของวันนี้ไปแล้ว */
  allow?: boolean;
  /** ยิงได้ตั้งแต่เฟรมแรกถ้า when เป็น true อยู่แล้ว */
  fireOnMount?: boolean;
  onDone?: () => void;
  /** สั่นด้วยไหม ปิดได้ถ้าหน้านั้นสั่นจากอย่างอื่นอยู่แล้วจะได้ไม่รัวซ้อน */
  haptic?: boolean;
  /** ขยายใหญ่สุดเท่าไหร่ */
  scaleTo?: number;
  /** ลอยขึ้นกี่ pt (ค่าลบคือขึ้น) */
  lift?: number;
  /** เอียงกี่องศา */
  rock?: number;
}

export function useCelebration({
  when,
  allow = true,
  fireOnMount = false,
  onDone,
  haptic = true,
  scaleTo = 1.22,
  lift = -10,
  rock = -7,
}: Options) {
  const progress = useRef(new Animated.Value(0)).current;
  const prev = useRef(fireOnMount ? false : when);

  useEffect(() => {
    // prev เป็นตัวกันซ้ำในตัวอยู่แล้ว: อยู่ที่ true ค้างไว้จะไม่ยิงอีก
    // แต่ถ้าหลุดลงไปต่ำกว่าเป้าแล้วกลับขึ้นมาใหม่ ถือว่าข้ามเส้นอีกรอบ ควรได้ฉลองจริง ๆ
    const crossed = when && !prev.current;
    prev.current = when;
    if (!crossed || !allow) return;

    if (haptic) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.base,
        // back easing เลยเป้าไปนิดก่อนกลับ — ตรงนี้แหละที่ทำให้อ่านว่า "ดีใจ" ไม่ใช่ "ขยาย"
        easing: Easing.out(Easing.back(2.4)),
        useNativeDriver: true,
      }),
      Animated.spring(progress, { toValue: 0, ...motion.spring.celebrate, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [when, allow]);

  // ต้อง memo ไม่งั้นสร้าง interpolate node ใหม่ทุก render และ Animated.View
  // ต้อง re-attach node ใหม่ตามไปด้วยทุกครั้ง
  const style = useMemo(
    () => ({
      transform: [
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) },
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rock}deg`] }) },
      ],
    }),
    [progress, scaleTo, lift, rock],
  );

  return { progress, style };
}
