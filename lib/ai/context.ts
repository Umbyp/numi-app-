import {
  getProfile,
  getLatestWeight,
  getMealEntriesForDate,
  getWorkoutsForDate,
} from '../db/queries';
import {
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcMacroTargets,
  localDateString,
} from '../nutrition';
import type { UserContext } from './prompt';

/**
 * ดึงบริบทของผู้ใช้มาแปะใน system prompt ตั้งแต่แรก
 * ข้อมูลชุดนี้เล็กและเกือบทุกคำถามต้องใช้ ดึงมาก่อนจึงคุ้มกว่าให้ AI เรียก tool ไปถามอีกรอบ
 */
export async function buildUserContext(): Promise<UserContext> {
  const today = localDateString();
  const [profile, weight, entries, sessions] = await Promise.all([
    getProfile(),
    getLatestWeight(),
    getMealEntriesForDate(today),
    getWorkoutsForDate(today),
  ]);

  const consumed = entries.reduce(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      proteinG: acc.proteinG + r.proteinG,
      carbG: acc.carbG + r.carbG,
      fatG: acc.fatG + r.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  );

  const burnedKcal = sessions.reduce((s, w) => s + w.kcalBurned, 0);
  const weightKg = weight?.weightKg ?? 70;

  // ไม่มีโปรไฟล์ก็ยังคุยได้ ใช้ค่ากลาง ๆ ไปก่อน แต่ยังคงพื้นแคลอรี่ขั้นต่ำไว้
  if (!profile) {
    return {
      today,
      targetKcal: 2000,
      targetProtein: 150,
      targetCarb: 200,
      targetFat: 67,
      consumed,
      burnedKcal,
      latestWeightKg: weight?.weightKg ?? null,
      calorieFloor: 1200,
      addExerciseKcal: false,
    };
  }

  const age = new Date().getFullYear() - profile.birthYear;
  const bmr = calcBMR({ sex: profile.sex, weightKg, heightCm: profile.heightCm, age });
  const tdee = calcTDEE(bmr, profile.activityLevel);
  const { target, floor } = calcCalorieTarget({
    tdee,
    weeklyRateKg: profile.weeklyRateKg,
    sex: profile.sex,
  });
  const targetKcal = profile.manualKcal ?? target;
  const macros = calcMacroTargets(targetKcal, {
    protein: profile.proteinPct,
    carb: profile.carbPct,
    fat: profile.fatPct,
  });

  return {
    today,
    targetKcal,
    targetProtein: macros.proteinG,
    targetCarb: macros.carbG,
    targetFat: macros.fatG,
    consumed,
    burnedKcal,
    latestWeightKg: weight?.weightKg ?? null,
    calorieFloor: floor,
    addExerciseKcal: !!profile.addExerciseKcal,
  };
}
