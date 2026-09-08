import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export interface ServingUnit {
  label: string;
  grams: number;
}

export interface ExerciseSet {
  exercise: string;
  sets: { kg: number; reps: number }[];
}

// โปรไฟล์ — มีแถวเดียว id = 1 เสมอ เพราะเป็นแอปใช้คนเดียว
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  sex: text('sex', { enum: ['male', 'female'] }).notNull(),
  birthYear: integer('birth_year').notNull(),
  heightCm: real('height_cm').notNull(),
  activityLevel: real('activity_level').notNull().default(1.375),
  goalType: text('goal_type', { enum: ['lose', 'maintain', 'gain'] }).notNull(),
  // อัตราเปลี่ยนน้ำหนักต่อสัปดาห์ (kg) ค่าบวก = ขึ้น, ลบ = ลง
  weeklyRateKg: real('weekly_rate_kg').notNull().default(-0.5),
  // เป้าหมายที่ล็อกไว้เอง ถ้า null = คำนวณอัตโนมัติจาก TDEE
  manualKcal: integer('manual_kcal'),
  proteinPct: real('protein_pct').notNull().default(0.3),
  carbPct: real('carb_pct').notNull().default(0.4),
  fatPct: real('fat_pct').notNull().default(0.3),
  // หักแคลอรี่ที่ออกกำลังกายออกจากเป้าหมายหรือไม่
  addExerciseKcal: integer('add_exercise_kcal', { mode: 'boolean' }).notNull().default(false),
});

// อาหารในคลัง — ทั้งที่มาจาก seed และที่ผู้ใช้สร้างเอง
export const foods = sqliteTable('foods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  brand: text('brand'),
  // เก็บต่อ 100 g เสมอ เพื่อให้สเกลได้ทุกปริมาณ
  kcalPer100: real('kcal_per_100').notNull(),
  proteinPer100: real('protein_per_100').notNull().default(0),
  carbPer100: real('carb_per_100').notNull().default(0),
  fatPer100: real('fat_per_100').notNull().default(0),
  fiberPer100: real('fiber_per_100').default(0),
  sodiumPer100: real('sodium_per_100').default(0),
  // หน่วยที่คนไทยใช้จริง เช่น [{"label":"1 จาน","grams":320}]
  servingUnits: text('serving_units', { mode: 'json' }).$type<ServingUnit[]>(),
  source: text('source', { enum: ['seed', 'user', 'ai'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const mealEntries = sqliteTable('meal_entries', {
  id: text('id').primaryKey(),
  foodId: text('food_id').references(() => foods.id),
  // snapshot ชื่อไว้ เผื่อ food ถูกลบหรือแก้ทีหลัง ประวัติจะได้ไม่เพี้ยน
  name: text('name').notNull(),
  mealType: text('meal_type', {
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
  }).notNull(),
  amountG: real('amount_g').notNull(),
  kcal: real('kcal').notNull(),
  proteinG: real('protein_g').notNull().default(0),
  carbG: real('carb_g').notNull().default(0),
  fatG: real('fat_g').notNull().default(0),
  // true = AI ประมาณให้ ไม่ได้มาจาก food DB — แสดงไอคอนเตือนใน UI
  estimated: integer('estimated', { mode: 'boolean' }).notNull().default(false),
  photoUri: text('photo_uri'),
  note: text('note'),
  loggedAt: integer('logged_at', { mode: 'timestamp' }).notNull(),
  // YYYY-MM-DD ตาม timezone เครื่อง ใช้ group by วัน
  localDate: text('local_date').notNull(),
});

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', {
    enum: ['cardio', 'strength', 'flexibility', 'sport', 'other'],
  }).notNull(),
  met: real('met'),
  durationMin: real('duration_min').notNull(),
  kcalBurned: real('kcal_burned').notNull(),
  // สำหรับเวทเทรนนิ่ง: [{"exercise":"Bench","sets":[{"kg":60,"reps":8}]}]
  sets: text('sets', { mode: 'json' }).$type<ExerciseSet[]>(),
  distanceKm: real('distance_km'),
  avgHr: integer('avg_hr'),
  note: text('note'),
  performedAt: integer('performed_at', { mode: 'timestamp' }).notNull(),
  localDate: text('local_date').notNull(),
});

export const weights = sqliteTable('weights', {
  id: text('id').primaryKey(),
  weightKg: real('weight_kg').notNull(),
  bodyFatPct: real('body_fat_pct'),
  note: text('note'),
  localDate: text('local_date').notNull().unique(), // วันละครั้ง
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
});

// สัดส่วนร่างกาย — วันละครั้งเหมือน weights เพราะวัดถี่กว่านั้นไม่มีความหมาย
export const measurements = sqliteTable('measurements', {
  id: text('id').primaryKey(),
  waistCm: real('waist_cm'),
  chestCm: real('chest_cm'),
  hipCm: real('hip_cm'),
  armCm: real('arm_cm'),
  thighCm: real('thigh_cm'),
  note: text('note'),
  localDate: text('local_date').notNull().unique(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
});

// รายการหนึ่งชิ้นในมื้อชุด — เก็บค่าที่คำนวณแล้วไว้เลย
// เพราะถ้าอ้างอิงกลับไปที่ foods อย่างเดียว พอผู้ใช้แก้ค่าอาหารทีหลัง มื้อชุดจะเพี้ยนตาม
export interface TemplateItem {
  foodId: string | null;
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

// มื้อชุด — ชุดอาหารที่กินซ้ำบ่อย กดครั้งเดียวได้ทั้งมื้อ
export const mealTemplates = sqliteTable('meal_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // มื้อที่ใช้บ่อย ใช้เป็นค่าตั้งต้นตอนกด null = ใช้ได้ทุกมื้อ
  mealType: text('meal_type', {
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
  }),
  items: text('items', { mode: 'json' }).$type<TemplateItem[]>().notNull(),
  useCount: integer('use_count').notNull().default(0),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  role: text('role', { enum: ['user', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull(),
  // tool_calls ดิบจาก AI เก็บไว้เพื่อ render การ์ดซ้ำตอน scroll กลับ
  toolCalls: text('tool_calls', { mode: 'json' }),
  toolCallId: text('tool_call_id'),
  // pending = ยังไม่กด, confirmed = บันทึกแล้ว, dismissed = ยกเลิก
  cardStatus: text('card_status', {
    enum: ['pending', 'confirmed', 'dismissed'],
  }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
