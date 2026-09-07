import Svg, { Circle, Path } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

// ไอคอนพอร์ตมาจาก Numi Design System ตรง ๆ (viewBox 0 0 16 16) — เส้นเดียวกันทั้งระบบ, สีเดียวต่อไอคอน

export function BreakfastIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx={8} cy={9.5} r={3.1} fill={color} />
      <Path
        d="M8 2.6v1.7M3.4 4.6l1.2 1.2M12.6 4.6l-1.2 1.2M1.6 13.2h12.8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LunchIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={3.2} fill={color} />
      <Path
        d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DinnerIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M12.4 10.2A5.6 5.6 0 018.3 1.6a6.4 6.4 0 104.1 8.6z" fill={color} />
    </Svg>
  );
}

export function SnackIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={6} fill="none" stroke={color} strokeWidth={1.5} />
      <Circle cx={6.2} cy={6.4} r={1} fill={color} />
      <Circle cx={9.9} cy={7.2} r={1} fill={color} />
      <Circle cx={7.4} cy={10} r={1} fill={color} />
    </Svg>
  );
}

export function MealTypeIcon({ type, color, size }: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; color: string; size?: number }) {
  switch (type) {
    case 'breakfast':
      return <BreakfastIcon color={color} size={size} />;
    case 'lunch':
      return <LunchIcon color={color} size={size} />;
    case 'dinner':
      return <DinnerIcon color={color} size={size} />;
    case 'snack':
      return <SnackIcon color={color} size={size} />;
  }
}
