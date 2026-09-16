import { getProfile, getLatestWeight, getMealEntriesForDate, getWorkoutsForDate, getWorkoutProfile, getMealTotalsByDateRange, getHealthProfile } from '../db/queries';
import { sumTotals } from '../store';
import { computeGoals, DEFAULT_GOALS } from '../goals';
import { localDateString, ACTIVITY_LEVELS } from '../nutrition';
import { addDays } from '../dates';
import { WORKOUT_EQUIPMENT, WORKOUT_EXPERIENCE, WORKOUT_LOCATIONS } from '../workout-profile';

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
  prioritizeMuscle: boolean;
  workoutProfileComplete: boolean;
  workoutExperience: string;
  workoutLocation: string;
  workoutEquipment: string;
  workoutDaysPerWeek: number;
  workoutMinutesPerSession: number;
  injuryNotes: string;
  workoutPreferences: string;
  /** เฉลี่ยเฉพาะวันที่มีบันทึกจริงใน 7 วันล่าสุด — null ถ้าไม่มีวันไหนบันทึกเลย */
  avgKcal7d: number | null;
  avgProtein7d: number | null;
  /** จำนวนวันที่มีบันทึกมื้ออาหารจริงใน 7 วันล่าสุด (จาก 7) — ใช้เช็คว่าข้อมูลพอจะสรุปเทรนด์ไหม */
  loggingDays7d: number;
  /** แพ้อาหาร/มังสวิรัติ/ฮาลาล ฯลฯ — ผู้ใช้กรอกเองในหน้าแก้ไขโปรไฟล์ */
  dietaryRestrictions: string;
  /** โรคประจำตัว/ยาที่กินอยู่/ตั้งครรภ์ ฯลฯ — ให้ AI ใช้เพื่อ "ระวัง" ไม่ใช่วินิจฉัยหรือรักษา */
  medicalConditions: string;
}

/** ดึงบริบทผู้ใช้ปัจจุบันมาแปะใน system prompt ตรง ๆ แทนที่จะให้ AI เรียก tool ไปดึงเอง (ประหยัด round trip) */
export async function buildUserContext(): Promise<UserContext> {
  const today = localDateString();
  const [profile, weight, entries, workouts, workoutProfileResult, last7DaysTotals, healthProfile] = await Promise.all([
    getProfile(),
    getLatestWeight(),
    getMealEntriesForDate(today),
    getWorkoutsForDate(today),
    getWorkoutProfile(),
    getMealTotalsByDateRange(addDays(today, -6), today),
    getHealthProfile(),
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
  const workoutProfile = workoutProfileResult.profile;
  const experience = WORKOUT_EXPERIENCE.find((item) => item.key === workoutProfile.experience)?.label ?? workoutProfile.experience;
  const location = WORKOUT_LOCATIONS.find((item) => item.key === workoutProfile.location)?.label ?? workoutProfile.location;
  const equipment = workoutProfile.equipment
    .map((key) => WORKOUT_EQUIPMENT.find((item) => item.key === key)?.label ?? key)
    .join(', ');

  // นับเฉพาะวันที่มี kcal > 0 เป็น "บันทึกแล้ว" — เฉลี่ยเอาเฉพาะวันเหล่านั้น ไม่งั้นวันที่ไม่ได้บันทึก
  // จะฉุดค่าเฉลี่ยลงต่ำผิดปกติจนตีความเป็นเทรนด์ผิด ๆ
  const loggedDays = last7DaysTotals.filter((d) => d.kcal > 0);
  const avgKcal7d = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.kcal, 0) / loggedDays.length) : null;
  const avgProtein7d = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.proteinG, 0) / loggedDays.length)
    : null;

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
    prioritizeMuscle: profile?.prioritizeMuscle ?? false,
    workoutProfileComplete: workoutProfileResult.completed,
    workoutExperience: experience,
    workoutLocation: location,
    workoutEquipment: equipment,
    workoutDaysPerWeek: workoutProfile.daysPerWeek,
    workoutMinutesPerSession: workoutProfile.minutesPerSession,
    injuryNotes: workoutProfile.injuryNotes,
    workoutPreferences: workoutProfile.preferenceNotes,
    avgKcal7d,
    avgProtein7d,
    loggingDays7d: loggedDays.length,
    dietaryRestrictions: healthProfile.dietaryRestrictions,
    medicalConditions: healthProfile.medicalConditions,
  };
}
