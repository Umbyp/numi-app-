import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getFoodEmoji } from '../lib/food-icon';

interface Props {
  name: string;
  photoUri?: string | null;
  size?: number;
}

/** ไอคอน/รูปอาหาร — โชว์รูปจริงถ้ามี (ถ่ายมาจาก AI vision) ไม่งั้น fallback เป็นอีโมจิตามหมวดอาหาร */
export function FoodVisual({ name, photoUri, size = 32 }: Props) {
  const c = useTheme();

  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 4 }} />;
  }

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 4, backgroundColor: c.surfaceAlt }]}>
      <Text style={{ fontSize: size * 0.55 }}>{getFoodEmoji(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
