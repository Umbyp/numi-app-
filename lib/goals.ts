import { calcBMR, calcTDEE, calcCalorieTarget, calcMacroTargets } from './nutrition';
import type { profile as profileTable } from './db/schema';

type Profile = typeof profileTable.$inferSelect;

export interface Goals {
  kcalTarget: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  clamped: boolean;
  bmr: number;
  tdee: number;
}

export const DEFAULT_GOALS: Goals = {
  kcalTarget: 2000,
  proteinG: 150,
  carbG: 200,
  fatG: 67,
  clamped: false,
  bmr: 0,
  tdee: 0,
};

/** คำนวณเป้าหมายแคลอรี่/มาโครวันนี้จากโปรไฟล์ + น้ำหนักล่าสุด ใช้ร่วมกันทั้ง store และ AI context */
export function computeGoals(p: Profile, weightKg: number): Goals {
  const age = new Date().getFullYear() - p.birthYear;
  const bmr = calcBMR({ sex: p.sex, weightKg, heightCm: p.heightCm, age });
  const tdee = calcTDEE(bmr, p.activityLevel);
  const { target, clamped } = p.manualKcal
    ? { target: p.manualKcal, clamped: false }
    : calcCalorieTarget({ tdee, weeklyRateKg: p.weeklyRateKg, sex: p.sex });
  const macros = calcMacroTargets(target, {
    protein: p.proteinPct,
    carb: p.carbPct,
    fat: p.fatPct,
  });
  return { kcalTarget: target, ...macros, clamped, bmr, tdee };
}
