import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { fontFamily } from '../lib/fonts';

const TINTS = ['brandTint', 'dinnerBg', 'carbBg', 'fatBg'] as const;
const TEXTS = ['brand', 'dinner', 'carbText', 'fatText'] as const;

/** hash ง่าย ๆ ของชื่อ ให้สีเดิมทุกครั้งสำหรับคนเดิม แต่กระจายสีต่างกันระหว่างคน */
function tintIndex(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % TINTS.length;
}

interface Props {
  name: string;
  size?: number;
}

/** อวาตาร์ตัวอักษรแรกของชื่อ/อีเมล — ใช้แทนรูปโปรไฟล์จริงในหน้าเพื่อน/ตารางอันดับ */
export function PersonAvatar({ name, size = 42 }: Props) {
  const c = useTheme();
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  const idx = tintIndex(name);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2, backgroundColor: c[TINTS[idx]] }]}>
      <Text style={{ fontFamily: fontFamily(800), fontSize: size * 0.38, color: c[TEXTS[idx]] }}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
