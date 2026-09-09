import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import { getWaterForDate, addWaterMl } from '../lib/db/queries';
import { calcWaterGoalMl, localDateString } from '../lib/nutrition';
import { WaterGlass } from './water-glass';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { Squish } from './squish';

/** แก้วน้ำมาตรฐาน 250 มล. ขวดเล็ก 600 มล. — หน่วยที่คนนึกภาพออกจริง */
const QUICK_ADD = [250, 600];

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
  const glasses = Math.round((ml / 250) * 10) / 10;
  const reached = ml >= goal;

  async function change(delta: number) {
    // อัปเดตหน้าจอทันทีแล้วค่อยเขียน DB ปุ่มจะได้ไม่หน่วงตอนกดรัว ๆ
    setMl((m) => Math.max(0, m + delta));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMl(await addWaterMl(delta));
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <View style={styles.row}>
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

        <View style={styles.meta}>
          <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>น้ำดื่ม</Text>
          <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
            เป้าหมาย {(goal / 1000).toFixed(1)} ลิตร
            {latestWeightKg ? ` · ราว 33 มล. ต่อน้ำหนัก 1 กก.` : ''}
          </Text>

          <Text style={[type.metric, { color: c.carb, fontSize: 26, marginTop: 4 }]}>
            {(ml / 1000).toFixed(2)}
            <Text style={[type.label, { color: c.faint, fontSize: 12 }]}> ล.</Text>
          </Text>

          <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
            {glasses} แก้ว
            {reached ? ' · ถึงเป้าแล้ว' : ` · เหลืออีก ${Math.round((goal - ml) / 250 * 10) / 10} แก้ว`}
          </Text>

          <View style={styles.actionRow}>
            <Squish
              onPress={() => change(-250)}
              disabled={ml === 0}
              style={[styles.btn, { backgroundColor: c.surfaceAlt }, ml === 0 && { opacity: 0.4 }]}
            >
              <Minus size={15} color={c.subtext} />
            </Squish>

            {QUICK_ADD.map((amount) => (
              <Squish
                key={amount}
                onPress={() => change(amount)}
                style={[styles.addBtn, { backgroundColor: c.carbBg }]}
              >
                <Plus size={13} color={c.carbText} />
                <Text style={[type.badge, { color: c.carbText, fontSize: 12 }]}>{amount}</Text>
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
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  btn: { width: 34, height: 30, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.badge,
  },
});
