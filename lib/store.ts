import { create } from 'zustand';
import {
  getProfile,
  getLatestWeight,
  getMealEntriesForDate,
  type DayTotals,
} from './db/queries';
import {
  calcBMR,
  calcTDEE,
  calcCalorieTarget,
  calcMacroTargets,
  localDateString,
} from './nutrition';
import type { profile as profileTable, mealEntries as mealEntriesTable } from './db/schema';

type Profile = typeof profileTable.$inferSelect;
type MealEntry = typeof mealEntriesTable.$inferSelect;

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
  goals: null,
  refresh: async () => {
    const [p, w, entries] = await Promise.all([
      getProfile(),
      getLatestWeight(),
      getMealEntriesForDate(localDateString()),
    ]);
    const weightKg = w?.weightKg ?? 70;
    const goals = p ? computeGoals(p, weightKg) : DEFAULT_GOALS;
    set({
      loaded: true,
      profile: p,
      latestWeightKg: w?.weightKg ?? null,
      todayEntries: entries,
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
