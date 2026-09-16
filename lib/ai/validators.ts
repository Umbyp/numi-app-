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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(mealItemSchema).min(1).max(20),
  note: z.string().max(500).optional(),
});

export type AddMealArgs = z.infer<typeof addMealSchema>;

const workoutPlanExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(['cardio', 'strength', 'flexibility', 'sport', 'other']),
  met: z.number().positive().max(20),
  duration_min: z.number().positive().max(180),
  sets: z.number().int().positive().max(20).optional(),
  reps: z.string().max(30).optional(),
  rest_sec: z.number().int().min(0).max(600).optional(),
  muscle_group: z.enum(['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full_body', 'cardio']).optional(),
  note: z.string().max(300).optional(),
});

const workoutPlanDaySchema = z.object({
  label: z.string().min(1).max(120),
  day_type: z.enum(['cardio', 'strength', 'both']),
  // บังคับให้มีเนื้อหาจริง (ไม่ใช่แค่ "warm-up 5 นาที") — ผู้ใช้ต้องได้คำแนะนำที่ทำตามได้จริง
  // ไม่ครบก็ safeParse fail แล้วระบบขอให้ AI ส่งใหม่เอง (ดู lib/hooks/use-chat.ts) ผู้ใช้ไม่เห็นความผิดพลาดนี้เลย
  warmup: z.string().min(25).max(500),
  during_note: z.string().max(500).optional(),
  cooldown: z.string().min(25).max(500),
  exercises: z.array(workoutPlanExerciseSchema).min(1).max(15),
});

export const workoutPlanSchema = z.object({
  title: z.string().min(1).max(120),
  rationale: z.string().min(1).max(1000),
  days: z.array(workoutPlanDaySchema).min(1).max(7),
});

export type WorkoutPlanArgs = z.infer<typeof workoutPlanSchema>;

/** กฎที่สัมพันธ์กันหลายฟิลด์ แยกจาก Zod เพื่อให้ type ของ tool schema เรียบและตรวจซ้ำได้ทุกจุดที่บันทึก */
export function validateWorkoutPlan(plan: unknown): string | null {
  const typedPlan = plan as WorkoutPlanArgs;
  let totalMinutes = 0;
  for (const day of typedPlan.days) {
    for (const exercise of day.exercises) {
      totalMinutes += exercise.duration_min;
      if (exercise.category === 'strength') {
        if (exercise.sets == null || exercise.sets < 2) return `ท่าเวท "${exercise.name}" ต้องมีอย่างน้อย 2 เซต`;
        if (!exercise.reps?.trim()) return `ท่าเวท "${exercise.name}" ต้องระบุจำนวนครั้ง`;
        if (exercise.rest_sec == null || exercise.rest_sec < 30) return `ท่าเวท "${exercise.name}" ต้องระบุเวลาพักอย่างน้อย 30 วินาที`;
        if (!exercise.muscle_group || exercise.muscle_group === 'cardio') return `ท่าเวท "${exercise.name}" ต้องระบุกลุ่มกล้ามเนื้อ`;
      }
      if (exercise.category === 'cardio' && !exercise.note?.trim()) return `คาร์ดิโอ "${exercise.name}" ต้องระบุระดับความหนักหรือแนวทางการทำ`;
    }
  }
  return totalMinutes > 720 ? 'แผนรวมต่อสัปดาห์ยาวเกิน 12 ชั่วโมง' : null;
}

export const askChoiceSchema = z.object({
  question: z.string().max(200).optional(),
  options: z.array(z.string().min(1).max(80)).min(2).max(6),
});

export type AskChoiceArgs = z.infer<typeof askChoiceSchema>;

export const VALIDATORS = {
  add_meal: addMealSchema,
  propose_workout_plan: workoutPlanSchema,
  ask_choice: askChoiceSchema,
} as const;

/**
 * บางโมเดล hallucinate ชื่อ tool เพี้ยนไปจากที่ประกาศไว้จริง (เช่น "ProposeWorkoutPlanDays"
 * แทน "propose_workout_plan") และไม่ยอมกลับมาเรียกถูกแม้จะบอกชื่อที่ถูกต้องไปแล้วก็ตาม
 * (เจอจริงจากบทสนทนาที่โมเดลพยายามซ้ำแล้วยังผิดชื่อเดิม สุดท้ายก็เลิกเรียก tool ไปเฉย ๆ)
 * เลยกันไว้ด้วยการเทียบชื่อแบบตัดตัวพิมพ์เล็ก-ใหญ่และสัญลักษณ์ทิ้งก่อน ถ้าเข้าเค้าก็ถือว่าใช่เลย
 * ไม่ต้องรอให้โมเดลแก้ไขเอง
 */
export function resolveToolName(rawName: string): keyof typeof VALIDATORS | undefined {
  if (rawName in VALIDATORS) return rawName as keyof typeof VALIDATORS;
  const simplify = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const target = simplify(rawName);
  return (Object.keys(VALIDATORS) as (keyof typeof VALIDATORS)[]).find((k) => target.includes(simplify(k)));
}
