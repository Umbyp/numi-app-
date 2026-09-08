import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';

const PRESETS = [60, 90, 120, 180];

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * นาฬิกาพักระหว่างเซ็ต
 * นับถอยหลังจากเวลาปลายทางจริง (Date.now) ไม่ใช่ลบทีละวินาที
 * เพราะ JS timer ถูกหน่วงตอนแอปไปอยู่เบื้องหลัง แล้วเวลาจะเพี้ยนสะสม
 */
export function RestTimer() {
  const c = useTheme();
  const [preset, setPreset] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [running]);

  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    const from = remaining > 0 ? remaining : preset;
    setRemaining(from);
    endRef.current = Date.now() + from * 1000;
    setRunning(true);
  }

  function reset(to = preset) {
    setRunning(false);
    setPreset(to);
    setRemaining(to);
  }

  const done = remaining === 0;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.head}>
        <Text style={[styles.time, { color: done ? c.primary : c.text }]}>{mmss(remaining)}</Text>
        <View style={styles.controls}>
          <Pressable
            onPress={toggle}
            style={[styles.iconBtn, { backgroundColor: c.primary }]}
            hitSlop={6}
          >
            {running ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
          </Pressable>
          <Pressable
            onPress={() => reset()}
            style={[styles.iconBtn, { backgroundColor: c.ghostBg }]}
            hitSlop={6}
          >
            <RotateCcw size={16} color={c.subtext} />
          </Pressable>
        </View>
      </View>

      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const active = p === preset;
          return (
            <Pressable
              key={p}
              onPress={() => reset(p)}
              style={[
                styles.preset,
                { borderColor: c.border },
                active && { backgroundColor: c.primary, borderColor: c.primary },
              ]}
            >
              <Text style={{ color: active ? '#fff' : c.subtext, fontSize: 12 }}>{mmss(p)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: 8 },
  preset: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
