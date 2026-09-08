import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { Mascot } from './mascot';

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
  const scheme = useScheme();
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
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <Mascot size={54} pose={done ? 'goal' : 'rest'} />
          <Text style={[type.label, { color: c.subtext, fontSize: 13 }]}>
            {done ? 'หมดเวลาพัก' : 'พักสักนิด ร่างกายต้องการการเติมพลัง'}
          </Text>
          <Text style={[type.metric, { color: done ? c.brand : c.text, fontSize: 48 }]}>{formatTime(remaining)}</Text>

          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: c.brand }]} />
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.ghostBtn, { backgroundColor: c.surfaceAlt }]} onPress={() => addTime(15)}>
              <Text style={[type.row, { color: c.brand, fontSize: 13 }]}>+15 วิ</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={onClose}>
              <Text style={[type.row, { color: c.onBrand, fontSize: 13 }]}>ปิด</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.34)' },
  centerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  track: { width: '100%', height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  ghostBtn: { flex: 1, borderRadius: radius.iconBox, paddingVertical: 12, alignItems: 'center' },
  primaryBtn: { flex: 1, borderRadius: radius.iconBox, paddingVertical: 12, alignItems: 'center' },
});
