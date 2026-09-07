import { create } from 'zustand';
import {
  getProfile,
  getLatestWeight,
  getMealEntriesForDate,
  getThemePreference,
  setThemePreference as saveThemePreference,
  type DayTotals,
  type ThemePreference,
} from './db/queries';
import { localDateString } from './nutrition';
import { computeGoals, DEFAULT_GOALS, type Goals } from './goals';
import type { profile as profileTable, mealEntries as mealEntriesTable } from './db/schema';

type Profile = typeof profileTable.$inferSelect;
type MealEntry = typeof mealEntriesTable.$inferSelect;

interface NumiState {
  loaded: boolean;
  profile: Profile | null;
  latestWeightKg: number | null;
  todayEntries: MealEntry[];
  goals: Goals | null;
  themePreference: ThemePreference;
  refresh: () => Promise<void>;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

export const useNumiStore = create<NumiState>((set) => ({
  loaded: false,
  profile: null,
  latestWeightKg: null,
  todayEntries: [],
  goals: null,
  themePreference: 'system',
  refresh: async () => {
    const [p, w, entries, themePreference] = await Promise.all([
      getProfile(),
      getLatestWeight(),
      getMealEntriesForDate(localDateString()),
      getThemePreference(),
    ]);
    const weightKg = w?.weightKg ?? 70;
    const goals = p ? computeGoals(p, weightKg) : DEFAULT_GOALS;
    set({
      loaded: true,
      profile: p,
      latestWeightKg: w?.weightKg ?? null,
      todayEntries: entries,
      goals,
      themePreference,
    });
  },
  setThemePreference: async (pref) => {
    set({ themePreference: pref });
    await saveThemePreference(pref);
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
