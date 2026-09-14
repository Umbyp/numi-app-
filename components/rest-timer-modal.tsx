import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/hooks/use-theme';
import { type } from '../lib/fonts';
import { radius } from '../lib/theme';
import { Mascot } from './mascot';
import { Squish } from './squish';

interface Props {
  visible: boolean;
  seconds: number;
  onClose: () => void;
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** ตัวจับเวลาพักระหว่างเซต — นับถอยหลังจริง สั่นเตือนตอนหมดเวลา ไม่ปิดอัตโนมัติกันตกใจกลางเซต */
export function RestTimerModal({ visible, seconds, onClose }: Props) {
  const c = useTheme();
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRemaining(seconds);
    setTotal(seconds);
    setDone(false);
  }, [visible, seconds]);

  useEffect(() => {
    if (!visible || done) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          setDone(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, done]);

  function addTime(extra: number) {
    setRemaining((r) => r + extra);
    setTotal((t) => t + extra);
    setDone(false);
  }

  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <Mascot size={132} pose={done ? 'goal' : 'rest'} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 19 }]}>{done ? 'พักเสร็จแล้ว' : 'พักสักนิด'}</Text>
            <Text style={[type.label, { color: c.subtext, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 2 }]}>
              {done ? 'พร้อมไปต่อเซตถัดไปได้เลย' : 'ร่างกายต้องการการเติมพลังนะ จิบน้ำหน่อยก็ได้'}
            </Text>
          </View>
          <Text style={[type.metric, { color: c.text, fontSize: 60 }]}>{formatTime(remaining)}</Text>

          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: done ? c.brand : c.fat }]} />
          </View>

          <View style={styles.actions}>
            <Squish style={[styles.ghostBtn, { backgroundColor: c.surfaceAlt }]} onPress={() => addTime(30)}>
              <Text style={[type.row, { color: c.text, fontSize: 14 }]}>+ 30 วิ</Text>
            </Squish>
            <Squish style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={onClose}>
              <Text style={[type.row, { color: '#fff', fontSize: 14.5 }]}>พักเสร็จแล้ว</Text>
            </Squish>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.4)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 14,
    alignItems: 'center',
  },
  track: { width: '100%', height: 12, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: 9, width: '100%' },
  ghostBtn: { flex: 1, height: 54, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flex: 1.4, height: 54, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
});
