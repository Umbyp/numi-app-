import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { type } from '../lib/fonts';
import { radius, pillShadow, MIN_TOUCH } from '../lib/theme';

/**
 * ทางเข้าแชท Numi บนหัวหน้าจอ
 * เดิมเป็นปุ่มลอยมุมขวาล่างคู่กับปุ่มเพิ่มด่วนมุมซ้ายล่าง สองปุ่มขนาดเท่ากันแย่งกันเป็น primary
 * และทำให้โซนล่างมีเป้ากดถึงเจ็ดอัน ย้ายขึ้นมาไว้หัวจอแทน
 */
export function AskNumiButton() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/chat')}
      style={[styles.btn, { backgroundColor: c.surface }, pillShadow(scheme)]}
      hitSlop={6}
    >
      <Mascot size={30} />
      <View>
        <Text style={[type.row, { color: c.text, fontSize: 12.5 }]}>ถาม Numi</Text>
        <Text style={[type.label, { color: c.muted, fontSize: 10 }]}>เห็นบันทึกวันนี้</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
  },
});
