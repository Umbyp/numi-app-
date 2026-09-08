import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { cardShadow } from '../lib/theme';
import { type } from '../lib/fonts';
import { Mascot } from './mascot';

/** ปุ่ม Numi AI ลอยมุมขวาล่างทุกหน้าแท็บ กดแล้วเปิดแชทเป็นโมดัล — จุดเข้าแชทเดียวตอนนี้ (ไม่มีแท็บแชทแยกแล้ว) */
export function FloatingAIButton({ bottomOffset = 100 }: { bottomOffset?: number }) {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  return (
    <Pressable
      style={[styles.btn, { bottom: bottomOffset, backgroundColor: c.surface, borderColor: c.brand }, cardShadow(scheme)]}
      onPress={() => router.push('/chat')}
    >
      <Mascot size={48} />
      <View style={[styles.aiBadge, { backgroundColor: c.text }]}>
        <Text style={[type.badge, { color: c.bg, fontSize: 9 }]}>AI</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
