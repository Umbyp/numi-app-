import {
  searchFoods,
  addMealEntries,
  addWorkout,
  addOrUpdateWeightToday,
  getMealEntriesForDate,
  type MealType,
} from '../db/queries';
import { calcKcalBurned, localDateString } from '../nutrition';
import { findActivity } from '../mets';
import { getLatestWeight } from '../db/queries';
import {
  addMealSchema,
  logWorkoutSchema,
  logWeightSchema,
  searchFoodSchema,
} from './validators';

/**
 * ตัวเดียวที่เขียน DB จริง — AI ไม่เคยแตะฐานข้อมูลเอง มันแค่เสนอ argument มา
 * ทุกเคส parse ซ้ำอีกรอบตรงนี้ด้วย เพราะผู้ใช้แก้ค่าในการ์ดได้ก่อนกดยืนยัน
 */
export async function executeToolCall(name: string, args: unknown): Promise<string> {
  switch (name) {
    case 'search_food': {
      const { queries } = searchFoodSchema.parse(args);
      const results = await Promise.all(queries.map((q) => searchFoods(q, 8)));
      const flat = results.flat().slice(0, 20).map((f) => ({
        food_id: f.id,
        name: f.name,
        kcal_per_100g: f.kcalPer100,
        protein_per_100g: f.proteinPer100,
        carb_per_100g: f.carbPer100,
        fat_per_100g: f.fatPer100,
        serving_units: f.servingUnits,
      }));
      if (flat.length === 0) return 'ไม่พบอาหารที่ค้นในฐานข้อมูล ให้ประมาณค่าแล้วตั้ง estimated: true';
      return JSON.stringify(flat);
    }

    case 'add_meal': {
      const data = addMealSchema.parse(args);
      await addMealEntries(
        data.items.map((it) => ({
          foodId: it.food_id ?? null,
          name: it.name,
          mealType: data.meal_type as MealType,
          amountG: it.amount_g,
          kcal: it.kcal,
          proteinG: it.protein_g,
          carbG: it.carb_g,
          fatG: it.fat_g,
          estimated: it.estimated,
          note: data.note,
        }))
      );
      const total = data.items.reduce((s, i) => s + i.kcal, 0);
      const todayEntries = await getMealEntriesForDate(localDateString());
      const consumed = todayEntries.reduce((s, r) => s + r.kcal, 0);
      return `บันทึกแล้ว ${data.items.length} รายการ รวม ${Math.round(total)} kcal วันนี้กินไปทั้งหมด ${Math.round(consumed)} kcal`;
    }

    case 'log_workout': {
      const data = logWorkoutSchema.parse(args);
      const weight = await getLatestWeight();
      const weightKg = weight?.weightKg ?? 70;
      const activity = data.met_key ? findActivity(data.met_key) : undefined;
      const met = activity?.met;
      const kcal =
        data.kcal_burned ??
        (met ? calcKcalBurned(met, weightKg, data.duration_min) : 0);

      await addWorkout({
        name: data.name,
        category: activity?.category ?? 'other',
        met: met ?? null,
        durationMin: data.duration_min,
        kcalBurned: kcal,
        distanceKm: data.distance_km ?? null,
        note: data.note ?? null,
      });
      return `บันทึกแล้ว ${data.name} ${data.duration_min} นาที เผาไป ${Math.round(kcal)} kcal`;
    }

    case 'log_weight': {
      const data = logWeightSchema.parse(args);
      await addOrUpdateWeightToday(data.weight_kg, undefined, data.body_fat_pct ?? null);
      return `บันทึกน้ำหนัก ${data.weight_kg} kg แล้ว`;
    }

    default:
      return `ไม่รู้จัก tool: ${name}`;
  }
}
