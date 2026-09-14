import { useCallback, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Minus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useCelebration } from '../lib/hooks/use-celebration';
import { useNumiStore } from '../lib/store';
import { getWaterForDate, addWaterMl } from '../lib/db/queries';
import { calcWaterGoalMl, localDateString } from '../lib/nutrition';
import { WaterGlass } from './water-glass';
import { type } from '../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../lib/theme';
import { Squish } from './squish';

/** แก้วน้ำมาตรฐาน 250 มล. ขวดเล็ก 600 มล. — หน่วยที่คนนึกภาพออกจริง */
const QUICK_ADD = [
  { ml: 250, label: '+ 1 แก้ว' },
  { ml: 600, label: '+ ขวด' },
];

export function WaterCard() {
  const c = useTheme();
  const scheme = useScheme();
  const latestWeightKg = useNumiStore((s) => s.latestWeightKg);
  const [ml, setMl] = useState(0);
  const [flowing, setFlowing] = useState(false);

  const onFocus = useCallback(() => {
    getWaterForDate(localDateString()).then(setMl);
    setFlowing(true);
    // หยุดคลื่นตอนออกจากแท็บ ลูป Animated ที่ทิ้งไว้จะปลุกเครื่องทุกเฟรมทั้งที่ไม่มีใครดู
    return () => setFlowing(false);
  }, []);

  useFocusEffect(onFocus);

  const goal = calcWaterGoalMl(latestWeightKg);
  const pct = goal > 0 ? Math.min(1, ml / goal) : 0;
  const reached = ml >= goal;

  // ไม่ส่ง fireOnMount เพราะการเด้งทุกครั้งที่กลับมาแท็บนี้ทั้งที่ดื่มครบตั้งแต่เช้าจะน่ารำคาญ
  // เอาแค่จังหวะที่แก้วเต็มพอดี ปิด haptic เพราะปุ่ม +250 สั่นอยู่แล้ว จะได้ไม่รัวซ้อน
  const celebration = useCelebration({ when: reached, haptic: false, scaleTo: 1.14, lift: -6, rock: -5 });

  async function change(delta: number) {
    // อัปเดตหน้าจอทันทีแล้วค่อยเขียน DB ปุ่มจะได้ไม่หน่วงตอนกดรัว ๆ
    setMl((m) => Math.max(0, m + delta));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMl(await addWaterMl(delta));
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <View style={styles.row}>
        <Animated.View style={celebration.style}>
          <WaterGlass
            pct={pct}
            size={92}
            water={c.carb}
            track={c.line}
            surface={c.surface}
            shine={scheme === 'dark' ? 0.22 : 0.8}
            celebrate={reached}
            flowing={flowing}
          />
        </Animated.View>

        <View style={styles.meta}>
          <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>น้ำดื่ม</Text>

          <View style={styles.numberRow}>
            <Text style={[type.metric, { color: c.carb, fontSize: 26, letterSpacing: -0.5 }]}>
              {(ml / 1000).toFixed(2)}
            </Text>
            <Text style={[type.label, { color: c.faint, fontSize: 11.5 }]}>
              {' '}ล. · {reached ? 'ถึงเป้าแล้ว' : `เหลืออีก ${Math.round((goal - ml) / 250 * 10) / 10} แก้ว`}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Squish
              onPress={() => change(-250)}
              disabled={ml === 0}
              style={[styles.btn, { backgroundColor: c.surfaceAlt }, ml === 0 && { opacity: 0.4 }]}
            >
              <Minus size={15} color={c.subtext} />
            </Squish>

            {QUICK_ADD.map(({ ml: amount, label }) => (
              <Squish
                key={amount}
                onPress={() => change(amount)}
                style={[styles.addBtn, { backgroundColor: c.carbBg }]}
              >
                <Text style={[type.row, { color: c.carbText, fontSize: 14 }]}>{label}</Text>
              </Squish>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  meta: { flex: 1, minWidth: 0, gap: 1 },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  btn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MIN_TOUCH,
    paddingHorizontal: 10,
    borderRadius: radius.cardInner,
  },
});
