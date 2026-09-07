import { getProfile, getLatestWeight, getMealEntriesForDate, getWorkoutsForDate } from '../db/queries';
import { sumTotals } from '../store';
import { computeGoals, DEFAULT_GOALS } from '../goals';
import { localDateString, ACTIVITY_LEVELS } from '../nutrition';

const GOAL_TYPE_LABEL: Record<'lose' | 'maintain' | 'gain', string> = {
  lose: 'ลดน้ำหนัก',
  maintain: 'คงน้ำหนัก',
  gain: 'เพิ่มน้ำหนัก',
};

export interface UserContext {
  today: string;
  targetKcal: number;
  targetProtein: number;
  targetCarb: number;
  targetFat: number;
  consumedKcal: number;
  consumedProtein: number;
  consumedCarb: number;
  consumedFat: number;
  latestWeight: number | null;
  workoutsToday: string;
  calorieFloor: number;
  age: number | null;
  heightCm: number | null;
  sexLabel: string;
  activityLevelLabel: string;
  goalTypeLabel: string;
  bmr: number;
  tdee: number;
}

/** ดึงบริบทผู้ใช้ปัจจุบันมาแปะใน system prompt ตรง ๆ แทนที่จะให้ AI เรียก tool ไปดึงเอง (ประหยัด round trip) */
export async function buildUserContext(): Promise<UserContext> {
  const today = localDateString();
  const [profile, weight, entries, workouts] = await Promise.all([
    getProfile(),
    getLatestWeight(),
    getMealEntriesForDate(today),
    getWorkoutsForDate(today),
  ]);

  const weightKg = weight?.weightKg ?? 70;
  const goals = profile ? computeGoals(profile, weightKg) : DEFAULT_GOALS;
  const consumed = sumTotals(entries);
  const calorieFloor = profile?.sex === 'male' ? 1500 : 1200;

  const activityLevel = ACTIVITY_LEVELS.reduce((closest, level) =>
    profile && Math.abs(level.value - profile.activityLevel) < Math.abs(closest.value - profile.activityLevel)
      ? level
      : closest
  );

  return {
    today,
    targetKcal: goals.kcalTarget,
    targetProtein: goals.proteinG,
    targetCarb: goals.carbG,
    targetFat: goals.fatG,
    consumedKcal: Math.round(consumed.kcal),
    consumedProtein: Math.round(consumed.proteinG),
    consumedCarb: Math.round(consumed.carbG),
    consumedFat: Math.round(consumed.fatG),
    latestWeight: weight?.weightKg ?? null,
    workoutsToday: workouts.map((w) => `${w.name} ${w.durationMin}นาที (-${Math.round(w.kcalBurned)}kcal)`).join(', '),
    calorieFloor,
    age: profile ? new Date().getFullYear() - profile.birthYear : null,
    heightCm: profile?.heightCm ?? null,
    sexLabel: profile ? (profile.sex === 'male' ? 'ชาย' : 'หญิง') : 'ไม่ทราบ',
    activityLevelLabel: profile ? activityLevel.label : 'ไม่ทราบ',
    goalTypeLabel: profile ? GOAL_TYPE_LABEL[profile.goalType] : 'ไม่ทราบ',
    bmr: goals.bmr,
    tdee: goals.tdee,
  };
}
