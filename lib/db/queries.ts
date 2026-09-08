import { eq, desc, like, or, and, gte, lte, isNotNull, sql } from 'drizzle-orm';
import { db } from './client';
import type { ExerciseSet, TemplateItem } from './schema';
import {
  profile,
  foods,
  mealEntries,
  weights,
  workouts,
  workoutPlans,
  workoutPlanCompletions,
  appSettings,
  chatMessages,
  measurements,
  mealTemplates,
  waterLogs,
  type WorkoutPlanDay,
} from './schema';
import { localDateString } from '../nutrition';
import seedFoods from '../../data/foods-th.json';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ---------- Profile ----------

export async function getProfile() {
  const rows = await db.select().from(profile).where(eq(profile.id, 1));
  return rows[0] ?? null;
}

export async function saveProfile(p: Omit<typeof profile.$inferInsert, 'id'>) {
  await db
    .insert(profile)
    .values({ id: 1, ...p })
    .onConflictDoUpdate({ target: profile.id, set: p });
}

// ---------- App settings (key-value, ใช้ได้ก่อนตั้งโปรไฟล์ครบ) ----------

export type ThemePreference = 'system' | 'light' | 'dark';

export async function getThemePreference(): Promise<ThemePreference> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, 'theme_preference'));
  const value = rows[0]?.value;
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setThemePreference(pref: ThemePreference) {
  await db
    .insert(appSettings)
    .values({ key: 'theme_preference', value: pref })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: pref } });
}

// ---------- Weights ----------

export async function getLatestWeight() {
  const rows = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.localDate))
    .limit(1);
  return rows[0] ?? null;
}

/** น้ำหนักของวันที่ระบุเป๊ะ ๆ (ไม่ใช่ล่าสุด) — ใช้ตอนดู Diary ย้อนหลัง */
export async function getWeightForDate(localDate: string) {
  const rows = await db.select().from(weights).where(eq(weights.localDate, localDate));
  return rows[0] ?? null;
}

export async function addOrUpdateWeightToday(weightKg: number, note?: string) {
  const localDate = localDateString();
  const id = `w_${localDate}`;
  await db
    .insert(weights)
    .values({ id, weightKg, note, localDate, recordedAt: new Date() })
    .onConflictDoUpdate({
      target: weights.localDate,
      set: { weightKg, note, recordedAt: new Date() },
    });
}

export async function getWeightHistory(days = 60) {
  const cutoff = localDateString(new Date(Date.now() - days * 86400000));
  return db.select().from(weights).where(gte(weights.localDate, cutoff)).orderBy(weights.localDate);
}

/** น้ำหนักครั้งแรกที่เคยบันทึกไว้ (ทั้งหมด ไม่จำกัดช่วงเวลา) — ใช้เป็นจุดเริ่มต้นคำนวณความคืบหน้าสู่เป้าหมาย */
export async function getEarliestWeight(): Promise<typeof weights.$inferSelect | null> {
  const rows = await db.select().from(weights).orderBy(weights.localDate).limit(1);
  return rows[0] ?? null;
}

// ---------- Foods ----------

/** เติมอาหาร seed ครั้งแรกที่เปิดแอป (ถ้ายังไม่มีข้อมูลเลย) */
/**
 * ซิงก์อาหารตั้งต้นทุกครั้งที่เปิดแอป
 * เดิมเติมเฉพาะตอนตารางว่าง ทำให้เครื่องที่ติดตั้งไปแล้วไม่เคยได้อาหารที่เพิ่มทีหลังเลย
 * ตอนนี้ใช้ upsert แทน — id ของ seed ขึ้นต้นด้วย th_ ส่วนอาหารที่ผู้ใช้สร้างเองขึ้นต้นด้วย
 * user_ หรือ ai_ จึงชนกันไม่ได้ และ createdAt ของแถวเดิมไม่ถูกแตะ
 */
export async function syncSeedFoods() {
  const rows = seedFoods as any[];
  const now = new Date();
  // แบ่งเป็นก้อนกัน parameter เกินเพดานของ SQLite เมื่อฐานข้อมูลโตขึ้นอีก
  const CHUNK = 100;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((f) => ({
      id: f.id,
      name: f.name,
      nameEn: f.nameEn ?? null,
      kcalPer100: f.kcalPer100,
      proteinPer100: f.proteinPer100 ?? 0,
      carbPer100: f.carbPer100 ?? 0,
      fatPer100: f.fatPer100 ?? 0,
      servingUnits: f.servingUnits ?? null,
      source: 'seed' as const,
      createdAt: now,
    }));

    await db
      .insert(foods)
      .values(batch)
      .onConflictDoUpdate({
        target: foods.id,
        set: {
          name: sql`excluded.name`,
          nameEn: sql`excluded.name_en`,
          kcalPer100: sql`excluded.kcal_per_100`,
          proteinPer100: sql`excluded.protein_per_100`,
          carbPer100: sql`excluded.carb_per_100`,
          fatPer100: sql`excluded.fat_per_100`,
          servingUnits: sql`excluded.serving_units`,
          source: sql`excluded.source`,
        },
      });
  }
}

export async function searchFoods(query: string, limit = 30) {
  const q = `%${query.trim()}%`;
  if (!query.trim()) {
    return db.select().from(foods).orderBy(desc(foods.createdAt)).limit(limit);
  }
  return db
    .select()
    .from(foods)
    .where(or(like(foods.name, q), like(foods.nameEn, q)))
    .limit(limit);
}

export async function createUserFood(input: {
  name: string;
  kcalPer100: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
}) {
  const id = `user_${Date.now()}`;
  await db.insert(foods).values({
    id,
    name: input.name,
    kcalPer100: input.kcalPer100,
    proteinPer100: input.proteinPer100 ?? 0,
    carbPer100: input.carbPer100 ?? 0,
    fatPer100: input.fatPer100 ?? 0,
    source: 'user',
    createdAt: new Date(),
  });
  return id;
}

export interface FrequentFood {
  foodId: string;
  name: string;
  kcal: number;
  amountG: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  count: number;
}

/** อาหารที่กินบ่อย ใช้ค่าจากครั้งล่าสุดที่กิน (แตะซ้ำแล้วได้ปริมาณเดิม) เรียงตามจำนวนครั้ง */
export async function getFrequentFoods(limit = 4): Promise<FrequentFood[]> {
  const rows = await db
    .select()
    .from(mealEntries)
    .where(isNotNull(mealEntries.foodId))
    .orderBy(desc(mealEntries.loggedAt))
    .limit(500);

  const byFood = new Map<string, FrequentFood>();
  for (const r of rows) {
    const foodId = r.foodId!;
    const existing = byFood.get(foodId);
    if (existing) {
      existing.count++;
    } else {
      byFood.set(foodId, {
        foodId,
        name: r.name,
        kcal: r.kcal,
        amountG: r.amountG,
        proteinG: r.proteinG,
        carbG: r.carbG,
        fatG: r.fatG,
        count: 1,
      });
    }
  }

  return [...byFood.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

// ---------- Meal entries ----------

export interface NewMealEntry {
  foodId?: string | null;
  name: string;
  mealType: MealType;
  amountG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  estimated?: boolean;
  note?: string;
  photoUri?: string | null;
}

export async function addMealEntry(entry: NewMealEntry) {
  const id = `meal_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const now = new Date();
  await db.insert(mealEntries).values({
    id,
    foodId: entry.foodId ?? null,
    name: entry.name,
    mealType: entry.mealType,
    amountG: entry.amountG,
    kcal: entry.kcal,
    proteinG: entry.proteinG,
    carbG: entry.carbG,
    fatG: entry.fatG,
    estimated: entry.estimated ?? false,
    note: entry.note,
    photoUri: entry.photoUri ?? null,
    loggedAt: now,
    localDate: localDateString(now),
  });
  return id;
}

export async function deleteMealEntry(id: string) {
  await db.delete(mealEntries).where(eq(mealEntries.id, id));
}

export async function getMealEntriesForDate(localDate: string) {
  return db
    .select()
    .from(mealEntries)
    .where(eq(mealEntries.localDate, localDate))
    .orderBy(mealEntries.loggedAt);
}

export interface DayTotals {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export async function getWorkoutsForDate(localDate: string) {
  return db.select().from(workouts).where(eq(workouts.localDate, localDate)).orderBy(desc(workouts.performedAt));
}

export interface NewWorkout {
  name: string;
  category: 'cardio' | 'strength' | 'flexibility' | 'sport' | 'other';
  met?: number;
  durationMin: number;
  kcalBurned: number;
  /** สำหรับเวทเทรนนิ่ง: [{"exercise":"Bench","sets":[{"kg":60,"reps":8}]}] */
  sets?: ExerciseSet[] | null;
  note?: string;
}

export async function addWorkout(entry: NewWorkout) {
  const id = `workout_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const now = new Date();
  await db.insert(workouts).values({
    id,
    name: entry.name,
    category: entry.category,
    met: entry.met,
    durationMin: entry.durationMin,
    kcalBurned: entry.kcalBurned,
    sets: entry.sets ?? null,
    note: entry.note,
    performedAt: now,
    localDate: localDateString(now),
  });
  return id;
}

export async function deleteWorkout(id: string) {
  await db.delete(workouts).where(eq(workouts.id, id));
}

export async function getWorkoutHistory(days = 90) {
  const cutoff = localDateString(new Date(Date.now() - days * 86400000));
  return db.select().from(workouts).where(gte(workouts.localDate, cutoff)).orderBy(desc(workouts.performedAt));
}

// ---------- Workout plans (AI ออกแบบให้) ----------

export interface NewWorkoutPlan {
  title: string;
  rationale: string;
  days: WorkoutPlanDay[];
}

export async function addWorkoutPlan(entry: NewWorkoutPlan) {
  const id = `plan_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await db.insert(workoutPlans).values({
    id,
    title: entry.title,
    rationale: entry.rationale,
    days: entry.days,
    createdAt: new Date(),
  });
  return id;
}

export async function getWorkoutPlans() {
  return db.select().from(workoutPlans).orderBy(desc(workoutPlans.createdAt));
}

export async function getWorkoutPlan(id: string): Promise<typeof workoutPlans.$inferSelect | null> {
  const rows = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
  return rows[0] ?? null;
}

export async function updateWorkoutPlan(
  id: string,
  entry: { title: string; rationale: string; days: WorkoutPlanDay[] }
) {
  await db.update(workoutPlans).set(entry).where(eq(workoutPlans.id, id));
}

export async function deleteWorkoutPlan(id: string) {
  await db.delete(workoutPlanCompletions).where(eq(workoutPlanCompletions.planId, id));
  await db.delete(workoutPlans).where(eq(workoutPlans.id, id));
}

export interface NewWorkoutPlanCompletion {
  planId: string;
  dayIndex: number;
  localDate: string;
  workoutId: string;
}

export async function addWorkoutPlanCompletion(entry: NewWorkoutPlanCompletion) {
  const id = `plancomp_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await db.insert(workoutPlanCompletions).values({ id, ...entry, createdAt: new Date() });
  return id;
}

export async function getWorkoutPlanCompletions(planId: string) {
  return db
    .select()
    .from(workoutPlanCompletions)
    .where(eq(workoutPlanCompletions.planId, planId))
    .orderBy(workoutPlanCompletions.localDate);
}

/** completion ของทุกแผนในช่วงวันที่กำหนด — ใช้สรุปความสมดุลกล้ามเนื้อรายสัปดาห์ (ไม่จำกัดแผนเดียวเหมือน getWorkoutPlanCompletions) */
export async function getWorkoutPlanCompletionsInRange(startDate: string, endDate: string) {
  return db
    .select()
    .from(workoutPlanCompletions)
    .where(and(gte(workoutPlanCompletions.localDate, startDate), lte(workoutPlanCompletions.localDate, endDate)));
}

export async function getTodayTotals(localDate: string): Promise<DayTotals> {
  const rows = await getMealEntriesForDate(localDate);
  return rows.reduce<DayTotals>(
    (acc, r) => ({
      kcal: acc.kcal + r.kcal,
      proteinG: acc.proteinG + r.proteinG,
      carbG: acc.carbG + r.carbG,
      fatG: acc.fatG + r.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  );
}

export interface DayTotalsWithDate extends DayTotals {
  localDate: string;
}

/** ผลรวมโภชนาการต่อวันในช่วงที่กำหนด เติมวันที่ไม่มีข้อมูลด้วยค่า 0 ให้กราฟยังมีครบทุกแท่ง */
export async function getMealTotalsByDateRange(startDate: string, endDate: string): Promise<DayTotalsWithDate[]> {
  const rows = await db
    .select()
    .from(mealEntries)
    .where(and(gte(mealEntries.localDate, startDate), lte(mealEntries.localDate, endDate)));

  const byDate = new Map<string, DayTotals>();
  for (const r of rows) {
    const cur = byDate.get(r.localDate) ?? { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
    cur.kcal += r.kcal;
    cur.proteinG += r.proteinG;
    cur.carbG += r.carbG;
    cur.fatG += r.fatG;
    byDate.set(r.localDate, cur);
  }

  const result: DayTotalsWithDate[] = [];
  let cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    const ds = localDateString(cursor);
    result.push({ localDate: ds, ...(byDate.get(ds) ?? { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 }) });
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return result;
}

// ---------- Chat history ----------
// เก็บแค่บทสนทนาจริง (user/assistant/tool) ไว้ต่อบริบทข้ามการเปิดแอปใหม่
// การ์ดคำสั่งที่ยังไม่กดยืนยัน "ไม่" เก็บ — หายไปตอนปิดแชท ต้องถามใหม่ (ตัดความซับซ้อนเรื่อง tool_call ค้าง)

export interface NewChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | unknown[] | null;
  toolCalls?: unknown;
  toolCallId?: string;
}

export async function saveChatMessage(msg: NewChatMessage) {
  const id = `chat_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const content = typeof msg.content === 'string' ? msg.content : msg.content == null ? '' : JSON.stringify(msg.content);
  await db.insert(chatMessages).values({
    id,
    role: msg.role,
    content,
    toolCalls: (msg.toolCalls ?? null) as any,
    toolCallId: msg.toolCallId ?? null,
    createdAt: new Date(),
  });
}

export async function getChatMessages(limit = 100) {
  const rows = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
  return rows.reverse();
}

export async function clearChatHistory() {
  await db.delete(chatMessages);
}

// ---------- สถิติเวท ----------

/**
 * เซสชันเวทย้อนหลังสำหรับคำนวณสถิติส่วนตัว
 * จำกัดจำนวนเพราะสถิติคำนวณใน JS ทุกครั้งที่เปิดหน้า
 * 200 เซสชันคือประมาณสองปีถ้าเล่นสัปดาห์ละสองครั้ง
 */
export async function getStrengthSessions(limit = 200) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.category, 'strength'))
    .orderBy(desc(workouts.performedAt))
    .limit(limit);
}

/**
 * เซ็ตล่าสุดของท่านั้น ๆ ไว้เติมให้อัตโนมัติตอนบันทึกครั้งถัดไป
 * เก็บหลายท่าไว้ในแถวเดียวเป็น JSON จึงต้องดึงเซสชันมาไล่หาใน JS
 */
export async function getLastSetsForExercise(exercise: string) {
  const key = exercise.trim().toLowerCase();
  if (!key) return null;
  const rows = await getStrengthSessions(40);
  for (const row of rows) {
    const found = (row.sets ?? []).find((e) => e.exercise.trim().toLowerCase() === key);
    if (found && found.sets.length > 0) {
      return { localDate: row.localDate, sets: found.sets };
    }
  }
  return null;
}

/** ชื่อท่าที่เคยบันทึก เรียงจากที่ใช้ล่าสุด ใช้เป็นตัวช่วยเลือกตอนพิมพ์ */
export async function getRecentExerciseNames(limit = 20) {
  const rows = await getStrengthSessions(60);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const e of row.sets ?? []) {
      const name = e.exercise.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ---------- น้ำหนักและสัดส่วนสำหรับกราฟเทรนด์ ----------

/** น้ำหนักตั้งแต่วันที่กำหนด เรียงเก่าไปใหม่ตามแกนกราฟ */
export async function getWeightsSince(fromLocalDate: string) {
  return db
    .select()
    .from(weights)
    .where(gte(weights.localDate, fromLocalDate))
    .orderBy(weights.localDate);
}

export interface MeasurementInput {
  waistCm?: number | null;
  chestCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export async function getLatestMeasurement() {
  const rows = await db.select().from(measurements).orderBy(desc(measurements.localDate)).limit(1);
  return rows[0] ?? null;
}

export async function getMeasurementsSince(fromLocalDate: string) {
  return db
    .select()
    .from(measurements)
    .where(gte(measurements.localDate, fromLocalDate))
    .orderBy(measurements.localDate);
}

export async function addOrUpdateMeasurementToday(input: MeasurementInput) {
  const localDate = localDateString();
  const id = `m_${localDate}`;
  const now = new Date();
  const values = {
    waistCm: input.waistCm ?? null,
    chestCm: input.chestCm ?? null,
    hipCm: input.hipCm ?? null,
    armCm: input.armCm ?? null,
    thighCm: input.thighCm ?? null,
  };
  await db
    .insert(measurements)
    .values({ id, ...values, localDate, recordedAt: now })
    .onConflictDoUpdate({
      target: measurements.localDate,
      set: { ...values, recordedAt: now },
    });
}

// ---------- ซ้ำทั้งมื้อ และมื้อชุด ----------

/** ใส่หลายรายการในครั้งเดียว — index อยู่ใน id ด้วยเพื่อไม่ให้ชนกันภายในชุดเดียว */
export async function addMealEntries(entries: NewMealEntry[]) {
  if (entries.length === 0) return 0;
  const now = new Date();
  const localDate = localDateString(now);
  const stamp = Date.now();
  await db.insert(mealEntries).values(
    entries.map((entry, i) => ({
      id: `meal_${stamp}_${i}_${Math.round(Math.random() * 1e6)}`,
      foodId: entry.foodId ?? null,
      name: entry.name,
      mealType: entry.mealType,
      amountG: entry.amountG,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
      carbG: entry.carbG,
      fatG: entry.fatG,
      estimated: entry.estimated ?? false,
      note: entry.note,
      photoUri: entry.photoUri ?? null,
      loggedAt: now,
      localDate,
    }))
  );
  return entries.length;
}

/**
 * คัดลอกมื้อจากวันก่อนมาลงวันนี้
 * คัดลอกค่าที่คำนวณไว้แล้วตรง ๆ ไม่คำนวณใหม่จาก foods เพราะปริมาณที่กินจริงอยู่ในแถวเดิม
 */
export async function repeatMealsFrom(fromLocalDate: string, mealType: MealType) {
  const rows = await getMealEntriesForDate(fromLocalDate);
  const source = rows.filter((r) => r.mealType === mealType);
  return addMealEntries(
    source.map((r) => ({
      foodId: r.foodId,
      name: r.name,
      mealType,
      amountG: r.amountG,
      kcal: r.kcal,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
      estimated: !!r.estimated,
      note: r.note ?? undefined,
    }))
  );
}

export async function getMealTemplates() {
  return db
    .select()
    .from(mealTemplates)
    .orderBy(desc(mealTemplates.useCount), desc(mealTemplates.createdAt));
}

/** สร้างมื้อชุดจากมื้อที่บันทึกไว้แล้วของวันหนึ่ง */
export async function createTemplateFromMeal(name: string, localDate: string, mealType: MealType) {
  const rows = await getMealEntriesForDate(localDate);
  const items: TemplateItem[] = rows
    .filter((r) => r.mealType === mealType)
    .map((r) => ({
      foodId: r.foodId,
      name: r.name,
      amountG: r.amountG,
      kcal: r.kcal,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
    }));
  if (items.length === 0) return null;

  const id = `tpl_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await db.insert(mealTemplates).values({
    id,
    name,
    mealType,
    items,
    useCount: 0,
    createdAt: new Date(),
  });
  return id;
}

export async function applyMealTemplate(id: string, mealType: MealType) {
  const rows = await db.select().from(mealTemplates).where(eq(mealTemplates.id, id));
  const tpl = rows[0];
  if (!tpl) return 0;

  const count = await addMealEntries(
    tpl.items.map((it) => ({
      foodId: it.foodId,
      name: it.name,
      mealType,
      amountG: it.amountG,
      kcal: it.kcal,
      proteinG: it.proteinG,
      carbG: it.carbG,
      fatG: it.fatG,
    }))
  );

  await db
    .update(mealTemplates)
    .set({ useCount: tpl.useCount + 1, lastUsedAt: new Date() })
    .where(eq(mealTemplates.id, id));

  return count;
}

export async function deleteMealTemplate(id: string) {
  await db.delete(mealTemplates).where(eq(mealTemplates.id, id));
}

// ---------- น้ำดื่ม ----------

export async function getWaterForDate(localDate: string): Promise<number> {
  const rows = await db.select().from(waterLogs).where(eq(waterLogs.localDate, localDate));
  return rows[0]?.ml ?? 0;
}

/**
 * บวก/ลบปริมาณน้ำของวันนี้ คืนยอดรวมใหม่
 * อ่านค่าเดิมมาบวกใน JS แทนการใช้ ml = ml + ? ใน SQL เพราะต้อง clamp ไม่ให้ติดลบ
 * และแอปนี้ใช้คนเดียวจึงไม่มีการเขียนพร้อมกันให้ต้องกังวล
 */
export async function addWaterMl(deltaMl: number, localDate = localDateString()): Promise<number> {
  const current = await getWaterForDate(localDate);
  const next = Math.max(0, Math.min(20000, current + deltaMl));
  const now = new Date();
  await db
    .insert(waterLogs)
    .values({ id: `water_${localDate}`, localDate, ml: next, updatedAt: now })
    .onConflictDoUpdate({
      target: waterLogs.localDate,
      set: { ml: next, updatedAt: now },
    });
  return next;
}

// ---------- ตั้งค่าการเตือน ----------

export interface ReminderSetting {
  enabled: boolean;
  hour: number;
  minute: number;
}

const REMINDER_PREFIX = 'reminder_';

/** เก็บเป็น JSON ใน app_settings เพราะเป็นค่าตั้งไม่กี่ตัว ไม่คุ้มที่จะทำตารางแยก */
export async function getReminderSetting(key: string): Promise<ReminderSetting | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, REMINDER_PREFIX + key));
  const raw = rows[0]?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.enabled !== 'boolean' ||
      typeof parsed?.hour !== 'number' ||
      typeof parsed?.minute !== 'number'
    ) {
      return null;
    }
    return parsed as ReminderSetting;
  } catch {
    // ค่าเสียหายให้ถือว่ายังไม่เคยตั้ง ดีกว่าทำแอปพังตอนเปิดหน้า
    return null;
  }
}

export async function saveReminderSetting(key: string, setting: ReminderSetting) {
  await db
    .insert(appSettings)
    .values({ key: REMINDER_PREFIX + key, value: JSON.stringify(setting) })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: JSON.stringify(setting) },
    });
}
