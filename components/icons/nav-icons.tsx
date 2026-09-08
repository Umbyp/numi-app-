import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Dumbbell } from 'lucide-react-native';

interface IconProps {
  color: string;
  size?: number;
}

interface TabIconProps extends IconProps {
  active?: boolean;
}

// ไอคอนแท็บล่าง + ไอคอนประกอบการ์ด พอร์ตมาจาก Numi Design System v2 ตรง ๆ

export function DashboardIcon({ color, size = 22, active }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Path
        d="M3 10l8-6.6 8 6.6v8.2a1 1 0 01-1 1h-4.4v-5.4H8.4v5.4H4a1 1 0 01-1-1z"
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DiaryIcon({ color, size = 22, active }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Rect x={2.6} y={4.4} width={16.8} height={15} rx={3.4} fill={active ? color : 'none'} stroke={active ? 'none' : color} strokeWidth={1.9} />
      <Path d="M2.6 8.6h16.8" stroke={active ? '#FFFFFF' : color} strokeWidth={1.9} />
      <Path d="M7 2.6v3.4M15 2.6v3.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function InsightsIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Rect x={3} y={11} width={4} height={8} rx={1.6} fill={color} />
      <Rect x={9} y={6.5} width={4} height={12.5} rx={1.6} fill={color} />
      <Rect x={15} y={9} width={4} height={10} rx={1.6} fill={color} />
    </Svg>
  );
}

/** เพิ่มทีหลังนอกเหนือจาก Numi Design System v2 — ใช้ lucide ตรง ๆ แทนพอร์ต SVG ใหม่ */
export function WorkoutPlanIcon({ color, size = 22 }: TabIconProps) {
  return <Dumbbell color={color} size={size} strokeWidth={1.9} />;
}

export function AccountIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Circle cx={11} cy={7.4} r={3.6} fill={color} />
      <Path d="M3.8 19c0-3.6 3.2-5.6 7.2-5.6s7.2 2 7.2 5.6" fill={color} />
    </Svg>
  );
}

export function ActivityIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M2 8v4M5 6v8M15 6v8M18 8v4M6.5 10h7" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function GoalIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={7.4} fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx={10} cy={10} r={3.2} fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx={10} cy={10} r={0.9} fill={color} />
    </Svg>
  );
}

export function ScaleIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 2.6a7.4 7.4 0 100 14.8 7.4 7.4 0 000-14.8z" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M10 10l3-2.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function FoodIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M5.4 2.6v5.2M7.6 2.6v5.2M6.5 8.2v9.2M6.5 8.2c-1.6 0-2.6-.6-2.6-2V2.6M6.5 8.2c1.6 0 2.6-.6 2.6-2V2.6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M14.6 17.4v-6.2c-1.8-.4-2.6-1.9-2.6-4.2 0-2.6 1.2-4.4 2.6-4.4s2.6 1.8 2.6 4.4c0 2.3-.8 3.8-2.6 4.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CameraIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.4} y={6} width={19.2} height={14} rx={4} fill="none" stroke={color} strokeWidth={1.9} />
      <Circle cx={12} cy={13} r={4} fill="none" stroke={color} strokeWidth={1.9} />
      <Path d="M8.6 6l1.4-2.2h4L15.4 6" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    </Svg>
  );
}

export function BarcodeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 6v12M7.4 6v12M10.4 6v12M14 6v12M17 6v12M20 6v12" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}
