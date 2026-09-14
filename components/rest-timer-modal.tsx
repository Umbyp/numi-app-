import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
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
  const scheme = useScheme();
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const [done, setDone] = useState(false);
  const doneSound = useAudioPlayer(require('../assets/sounds/rest-done.wav'));

  useEffect(() => {
    // เล่นได้แม้เปิดสวิตช์ปิดเสียงไว้ — ระหว่างออกกำลังกายมือถือมักไม่ได้อยู่ในมือ ต้องได้ยินแน่ ๆ
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

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
          doneSound.seekTo(0);
          doneSound.play();
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
        <View style={[styles.sheet, { backgroundColor: c.surface }, cardShadow(scheme)]}>
          <Mascot size={104} pose={done ? 'goal' : 'rest'} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 19 }]}>
              {done ? 'พักครบแล้ว' : 'พักสักนิด'}
            </Text>
            <Text style={[type.label, { color: c.subtext, fontSize: 13, textAlign: 'center', marginTop: 2 }]}>
              {done ? 'ไปต่อเซตถัดไปได้เลย' : 'ร่างกายต้องการการเติมพลังนะ จิบน้ำหน่อยก็ได้'}
            </Text>
          </View>
          <Text style={[type.metric, { color: c.text, fontSize: 64, letterSpacing: -2 }]}>{formatTime(remaining)}</Text>

          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: c.fat }]} />
          </View>

          <View style={styles.actions}>
            <Squish style={[styles.ghostBtn, { backgroundColor: c.surfaceAlt }]} onPress={() => addTime(15)}>
              <Text style={[type.row, { color: c.text, fontSize: 14.5 }]}>+15 วิ</Text>
            </Squish>
            <Squish style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={onClose}>
              <Text style={[type.row, { color: '#fff', fontSize: 15 }]}>พักเสร็จแล้ว</Text>
            </Squish>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.4)' },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 34,
    gap: 16,
    alignItems: 'center',
  },
  track: { width: '100%', height: 12, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: 9, width: '100%' },
  ghostBtn: { flex: 1, height: 54, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flex: 1.4, height: 54, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
});
