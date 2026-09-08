import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** โลโก้แมวมาสคอตของ Numi — ใช้แทนวงกลมเส้นประ "มาสคอต" เดิมทุกจุด */
export function Mascot({ size = 44, style }: Props) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    <Image source={require('../assets/mascot.png')} style={[{ width: size, height: size }, style]} resizeMode="contain" />
  );
}
