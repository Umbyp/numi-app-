import { searchFoods, addMealEntry, getMealEntriesForDate, getProfile, getLatestWeight, addWorkoutPlan } from '../db/queries';
import { sumTotals } from '../store';
import { computeGoals, DEFAULT_GOALS } from '../goals';
import { localDateString } from '../nutrition';
import { READ_ONLY_TOOLS } from './tools';
import { addMealSchema, workoutPlanSchema } from './validators';

export const needsConfirmation = (name: string) => !READ_ONLY_TOOLS.has(name);

async function getRemainingKcal(localDate: string): Promise<number> {
  const [profile, weight, entries] = await Promise.all([
    getProfile(),
    getLatestWeight(),
    getMealEntriesForDate(localDate),
  ]);
  const goals = profile ? computeGoals(profile, weight?.weightKg ?? 70) : DEFAULT_GOALS;
  const consumed = sumTotals(entries);
  return Math.round(goals.kcalTarget - consumed.kcal);
}

/** รันจริงหลังผู้ใช้กดยืนยันการ์ด (หรือทันทีสำหรับ read-only tool) — จุดเดียวที่เขียนลง DB */
export async function executeToolCall(name: string, args: unknown): Promise<string> {
  switch (name) {
    case 'search_food': {
      const { queries } = args as { queries: string[] };
      const results = await Promise.all(queries.map((q) => searchFoods(q, 8)));
      const flat = results.flat().slice(0, 15);
      return JSON.stringify(
        flat.map((f) => ({
          id: f.id,
          name: f.name,
          kcal_per_100: f.kcalPer100,
          protein_per_100: f.proteinPer100,
          carb_per_100: f.carbPer100,
          fat_per_100: f.fatPer100,
          serving_units: f.servingUnits,
        }))
      );
    }

    case 'add_meal': {
      const data = addMealSchema.parse(args);
      const date = data.date ?? localDateString();
      for (const item of data.items) {
        await addMealEntry({
          foodId: item.food_id ?? null,
          name: item.name,
          mealType: data.meal_type,
          amountG: item.amount_g,
          kcal: item.kcal,
          proteinG: item.protein_g,
          carbG: item.carb_g,
          fatG: item.fat_g,
          estimated: item.estimated,
          note: data.note,
        });
      }
      const total = data.items.reduce((s, i) => s + i.kcal, 0);
      const remaining = await getRemainingKcal(date);
      return `บันทึกสำเร็จ รวม ${Math.round(total)} kcal เหลือวันนี้ ${remaining} kcal`;
    }

    case 'propose_workout_plan': {
      const data = workoutPlanSchema.parse(args);
      await addWorkoutPlan({
        title: data.title,
        rationale: data.rationale,
        days: data.days.map((d) => ({
          label: d.label,
          dayType: d.day_type,
          warmup: d.warmup,
          duringNote: d.during_note,
          cooldown: d.cooldown,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            category: e.category,
            met: e.met,
            durationMin: e.duration_min,
            sets: e.sets,
            reps: e.reps,
            restSec: e.rest_sec,
            note: e.note,
          })),
        })),
      });
      return `บันทึกแผนแล้ว ดูได้ที่ บัญชี > แผนออกกำลังกาย`;
    }

    default:
      return `ไม่รู้จัก tool: ${name}`;
  }
}
