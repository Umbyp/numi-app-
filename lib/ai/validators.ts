// ตรวจ argument ที่ AI ส่งมาก่อนเอาไป render การ์ดเสมอ
// AI ส่งค่าประหลาดมาได้ ทั้งติดลบ ทั้งเกินจริง ถ้าไม่กันไว้ข้อมูลเสียจะเข้า DB
import { z } from 'zod';

const mealItemSchema = z.object({
  food_id: z.string().optional(),
  name: z.string().min(1).max(120),
  amount_g: z.number().positive().max(5000),
  kcal: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(500).default(0),
  carb_g: z.number().min(0).max(1000).default(0),
  fat_g: z.number().min(0).max(500).default(0),
  estimated: z.boolean().default(true),
});

export const addMealSchema = z.object({
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  items: z.array(mealItemSchema).min(1).max(20),
  note: z.string().max(500).optional(),
});

export const logWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  met_key: z.string().max(60).optional(),
  duration_min: z.number().positive().max(600),
  kcal_burned: z.number().min(0).max(5000).optional(),
  distance_km: z.number().min(0).max(500).optional(),
  note: z.string().max(500).optional(),
});

export const logWeightSchema = z.object({
  weight_kg: z.number().min(20).max(400),
  body_fat_pct: z.number().min(1).max(70).optional(),
});

export const searchFoodSchema = z.object({
  queries: z.array(z.string().min(1).max(100)).min(1).max(10),
});

export const VALIDATORS = {
  search_food: searchFoodSchema,
  add_meal: addMealSchema,
  log_workout: logWorkoutSchema,
  log_weight: logWeightSchema,
} as const;

export type AddMealArgs = z.infer<typeof addMealSchema>;
export type LogWorkoutArgs = z.infer<typeof logWorkoutSchema>;
export type LogWeightArgs = z.infer<typeof logWeightSchema>;

/** ข้อความสั้น ๆ ที่ส่งกลับให้ AI แก้ ไม่ใช่ dump ทั้ง stack */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join('; ');
}
