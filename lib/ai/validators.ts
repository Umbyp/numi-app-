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
  warmup: z.string().max(500).optional(),
  during_note: z.string().max(500).optional(),
  cooldown: z.string().max(500).optional(),
  exercises: z.array(workoutPlanExerciseSchema).min(1).max(15),
});

export const workoutPlanSchema = z.object({
  title: z.string().min(1).max(120),
  rationale: z.string().min(1).max(1000),
  days: z.array(workoutPlanDaySchema).min(1).max(14),
});

export type WorkoutPlanArgs = z.infer<typeof workoutPlanSchema>;

export const VALIDATORS = {
  add_meal: addMealSchema,
  propose_workout_plan: workoutPlanSchema,
} as const;
