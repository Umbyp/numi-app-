import { View, Text, Animated, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { useCelebration } from '../lib/hooks/use-celebration';
import { Mascot } from './mascot';
import { pickMood, type DayState } from '../lib/mascot-pose';
import { type } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';
import { Squish } from './squish';

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

  // fireOnMount เพราะแดชบอร์ดจำ celebrated_date ไว้ใน DB แล้วส่งมาเป็น allowCelebrate
  // ตัวคุมว่าซ้ำหรือเปล่าอยู่ข้างนอก hook จึงยิงได้ตั้งแต่เฟรมแรก
  const celebration = useCelebration({
    when: mood.celebrate,
    allow: allowCelebrate,
    fireOnMount: true,
    onDone: onCelebrated,
  });

  const accent =
    mood.pose === 'goal' ? c.brand : mood.pose === 'rest' ? c.fat : mood.pose === 'start' ? c.carb : c.muted;

  // เฉพาะหน้าแดชบอร์ดเท่านั้นที่ใช้ mascot-start แทน idle ปกติ — จุดอื่นในแอปที่ใช้ pose 'idle' ยังเป็นรูปเดิม
  const imagePose = mood.pose === 'idle' ? 'start' : mood.pose;

  return (
    <Squish
      onPress={onPress}
      disabled={!onPress}
      // การ์ดกว้างเต็มจอ ยุบ 0.95 แบบปุ่มเล็กจะขยับเป็นสิบพิกเซลจนดูกระตุก
      scaleTo={0.98}
      style={styles.wrap}
    >
      <Animated.View style={celebration.style}>
        <Mascot size={74} pose={imagePose} />
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
    </Squish>
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
