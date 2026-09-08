import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useNumiStore } from '../lib/store';
import { getWaterForDate, addWaterMl } from '../lib/db/queries';
import { calcWaterGoalMl, localDateString } from '../lib/nutrition';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

/** แก้วน้ำมาตรฐาน 250 มล. ขวดเล็ก 600 มล. — หน่วยที่คนนึกภาพออกจริง */
const QUICK_ADD = [250, 600];

export function WaterCard() {
  const c = useTheme();
  const scheme = useScheme();
  const latestWeightKg = useNumiStore((s) => s.latestWeightKg);
  const [ml, setMl] = useState(0);

  const load = useCallback(() => {
    getWaterForDate(localDateString()).then(setMl);
  }, []);

  useFocusEffect(load);

  const goal = calcWaterGoalMl(latestWeightKg);
  const pct = goal > 0 ? Math.min(1, ml / goal) : 0;
  const glasses = Math.round((ml / 250) * 10) / 10;

  async function change(delta: number) {
    // อัปเดตหน้าจอทันทีแล้วค่อยเขียน DB ปุ่มจะได้ไม่หน่วงตอนกดรัว ๆ
    setMl((m) => Math.max(0, m + delta));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMl(await addWaterMl(delta));
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>น้ำดื่ม</Text>
          <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>
            เป้าหมาย {(goal / 1000).toFixed(1)} ลิตร
            {latestWeightKg ? ` · ราว 33 มล. ต่อน้ำหนัก 1 กก.` : ''}
          </Text>
        </View>
        <Text style={[type.metric, { color: c.carb, fontSize: 26 }]}>
          {(ml / 1000).toFixed(2)}
          <Text style={[type.label, { color: c.faint, fontSize: 12 }]}> ล.</Text>
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: c.line }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: c.carb }]} />
      </View>

      <View style={styles.actionRow}>
        <Text style={[type.label, { color: c.muted, fontSize: 11, flex: 1 }]}>
          {glasses} แก้ว
          {ml >= goal ? ' · ถึงเป้าแล้ว' : ` · เหลืออีก ${Math.round((goal - ml) / 250 * 10) / 10} แก้ว`}
        </Text>

        <Pressable
          onPress={() => change(-250)}
          disabled={ml === 0}
          style={[styles.btn, { backgroundColor: c.surfaceAlt }, ml === 0 && { opacity: 0.4 }]}
        >
          <Minus size={15} color={c.subtext} />
        </Pressable>

        {QUICK_ADD.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => change(amount)}
            style={[styles.addBtn, { backgroundColor: c.carbBg }]}
          >
            <Plus size={13} color={c.carbText} />
            <Text style={[type.badge, { color: c.carbText, fontSize: 12 }]}>{amount}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
