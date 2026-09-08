import { create } from 'zustand';
import {
  getProfile,
  getLatestWeight,
  getMealEntriesForDate,
  getWorkoutsForDate,
  type DayTotals,
} from './db/queries';
import {
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcMacroTargets,
  localDateString,
} from './nutrition';
import type {
  profile as profileTable,
  mealEntries as mealEntriesTable,
  workouts as workoutsTable,
} from './db/schema';

type Profile = typeof profileTable.$inferSelect;
type MealEntry = typeof mealEntriesTable.$inferSelect;
type Workout = typeof workoutsTable.$inferSelect;

interface Goals {
  kcalTarget: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  clamped: boolean;
}

interface NumiState {
  loaded: boolean;
  profile: Profile | null;
  latestWeightKg: number | null;
  todayEntries: MealEntry[];
  todayWorkouts: Workout[];
  goals: Goals | null;
  refresh: () => Promise<void>;
}

const DEFAULT_GOALS: Goals = {
  kcalTarget: 2000,
  proteinG: 150,
  carbG: 200,
  fatG: 67,
  clamped: false,
};

function computeGoals(p: Profile, weightKg: number): Goals {
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
  return { kcalTarget: target, ...macros, clamped };
}

export const useNumiStore = create<NumiState>((set) => ({
  loaded: false,
  profile: null,
  latestWeightKg: null,
  todayEntries: [],
  todayWorkouts: [],
  goals: null,
  refresh: async () => {
    const today = localDateString();
    const [p, w, entries, sessions] = await Promise.all([
      getProfile(),
      getLatestWeight(),
      getMealEntriesForDate(today),
      getWorkoutsForDate(today),
    ]);
    const weightKg = w?.weightKg ?? 70;
    const goals = p ? computeGoals(p, weightKg) : DEFAULT_GOALS;
    set({
      loaded: true,
      profile: p,
      latestWeightKg: w?.weightKg ?? null,
      todayEntries: entries,
      todayWorkouts: sessions,
      goals,
    });
  },
}));

export function sumTotals(entries: MealEntry[]): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      proteinG: acc.proteinG + r.proteinG,
      carbG: acc.carbG + r.carbG,
      fatG: acc.fatG + r.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  );
}

export function sumBurned(sessions: { kcalBurned: number }[]): number {
  return sessions.reduce((s, w) => s + w.kcalBurned, 0);
}

/**
 * เป้าหมายที่ใช้จริงในหน้า Today
 * การบวกแคลอรี่ที่เผากลับเข้าไปเป็นเรื่องที่คนเถียงกัน (เครื่องวัดมักประเมินสูงเกินจริง)
 * จึงทำเป็นตัวเลือกใน profile.addExerciseKcal และปิดไว้เป็นค่าเริ่มต้น
 */
export function targetWithExercise(
  kcalTarget: number,
  burnedKcal: number,
  addExerciseKcal: boolean | null | undefined
): number {
  return addExerciseKcal ? Math.round(kcalTarget + burnedKcal) : kcalTarget;
}
