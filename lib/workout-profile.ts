export const WORKOUT_EXPERIENCE = [
  { key: 'beginner', label: 'เริ่มต้น' },
  { key: 'intermediate', label: 'พอมีพื้นฐาน' },
  { key: 'advanced', label: 'ฝึกสม่ำเสมอ' },
] as const;

export const WORKOUT_LOCATIONS = [
  { key: 'home', label: 'ที่บ้าน' },
  { key: 'gym', label: 'ฟิตเนส' },
  { key: 'outdoors', label: 'กลางแจ้ง' },
  { key: 'mixed', label: 'สลับได้' },
] as const;

export const WORKOUT_EQUIPMENT = [
  { key: 'bodyweight', label: 'ไม่ใช้อุปกรณ์' },
  { key: 'dumbbells', label: 'ดัมเบล' },
  { key: 'bands', label: 'ยางยืด' },
  { key: 'barbell', label: 'บาร์เบล' },
  { key: 'machines', label: 'เครื่องเล่น' },
] as const;

export type WorkoutExperience = (typeof WORKOUT_EXPERIENCE)[number]['key'];
export type WorkoutLocation = (typeof WORKOUT_LOCATIONS)[number]['key'];
export type WorkoutEquipment = (typeof WORKOUT_EQUIPMENT)[number]['key'];

export interface WorkoutProfile {
  experience: WorkoutExperience;
  location: WorkoutLocation;
  equipment: WorkoutEquipment[];
  daysPerWeek: number;
  minutesPerSession: number;
  injuryNotes: string;
  preferenceNotes: string;
}

export const DEFAULT_WORKOUT_PROFILE: WorkoutProfile = {
  experience: 'beginner',
  location: 'home',
  equipment: ['bodyweight'],
  daysPerWeek: 3,
  minutesPerSession: 30,
  injuryNotes: '',
  preferenceNotes: '',
};

export function isWorkoutProfile(value: unknown): value is WorkoutProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<WorkoutProfile>;
  return (
    WORKOUT_EXPERIENCE.some((item) => item.key === profile.experience) &&
    WORKOUT_LOCATIONS.some((item) => item.key === profile.location) &&
    Array.isArray(profile.equipment) && profile.equipment.length > 0 &&
    profile.equipment.every((item) => WORKOUT_EQUIPMENT.some((option) => option.key === item)) &&
    typeof profile.daysPerWeek === 'number' && profile.daysPerWeek >= 1 && profile.daysPerWeek <= 7 &&
    typeof profile.minutesPerSession === 'number' && profile.minutesPerSession >= 10 && profile.minutesPerSession <= 180 &&
    typeof profile.injuryNotes === 'string' && typeof profile.preferenceNotes === 'string'
  );
}
