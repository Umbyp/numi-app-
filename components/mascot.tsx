import { Image, type ImageStyle, type StyleProp } from 'react-native';
import type { MascotPose } from '../lib/mascot-pose';

interface Props {
  size?: number;
  /** ท่าตามสถานะ ดู lib/mascot-pose.ts */
  pose?: MascotPose;
  style?: StyleProp<ImageStyle>;
}

/**
 * โลโก้แมวมาสคอตของ Numi
 *
 * require ต้องเป็น path คงที่ทั้งหมด Metro จึงจะรวมรูปเข้า bundle ได้
 * เขียน require(`../assets/mascot-${pose}.png`) ไม่ได้
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const SOURCES: Record<MascotPose, ReturnType<typeof require>> = {
  idle: require('../assets/mascot.png'),
  start: require('../assets/mascot-start.png'),
  rest: require('../assets/mascot-rest.png'),
  goal: require('../assets/mascot-goal.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export function Mascot({ size = 44, pose = 'idle', style }: Props) {
  return (
    <Image source={SOURCES[pose]} style={[{ width: size, height: size }, style]} resizeMode="contain" />
  );
}
