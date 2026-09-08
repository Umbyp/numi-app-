import { eq, desc, asc, like, or, gte, sql } from 'drizzle-orm';
import { db } from './client';
import {
  profile,
  foods,
  mealEntries,
  weights,
  measurements,
  workouts,
  mealTemplates,
} from './schema';
import { localDateString } from '../nutrition';
import type { ExerciseSet, TemplateItem } from './schema';
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

// ---------- Weights ----------

export async function getLatestWeight() {
  const rows = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.localDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function addOrUpdateWeightToday(
  weightKg: number,
  note?: string,
  bodyFatPct?: number | null
) {
  const localDate = localDateString();
  const id = `w_${localDate}`;
  const now = new Date();
  await db
    .insert(weights)
    .values({ id, weightKg, bodyFatPct: bodyFatPct ?? null, note, localDate, recordedAt: now })
    .onConflictDoUpdate({
      target: weights.localDate,
      set: { weightKg, bodyFatPct: bodyFatPct ?? null, note, recordedAt: now },
    });
}

/** น้ำหนักทั้งหมดตั้งแต่วันที่กำหนด เรียงจากเก่าไปใหม่ตามแกนกราฟ */
export async function getWeightsSince(fromLocalDate: string) {
  return db
    .select()
    .from(weights)
    .where(gte(weights.localDate, fromLocalDate))
    .orderBy(asc(weights.localDate));
}

// ---------- Measurements ----------

export interface MeasurementInput {
  waistCm?: number | null;
  chestCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export async function getLatestMeasurement() {
  const rows = await db
    .select()
    .from(measurements)
    .orderBy(desc(measurements.localDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMeasurementsSince(fromLocalDate: string) {
  return db
    .select()
    .from(measurements)
    .where(gte(measurements.localDate, fromLocalDate))
    .orderBy(asc(measurements.localDate));
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

// ---------- Foods ----------

/** เติมอาหาร seed ครั้งแรกที่เปิดแอป (ถ้ายังไม่มีข้อมูลเลย) */
export async function seedFoodsIfEmpty() {
  const rows = await db.select({ id: foods.id }).from(foods).limit(1);
  if (rows.length > 0) return;

  await db.insert(foods).values(
    (seedFoods as any[]).map((f) => ({
      id: f.id,
      name: f.name,
      nameEn: f.nameEn ?? null,
      kcalPer100: f.kcalPer100,
      proteinPer100: f.proteinPer100 ?? 0,
      carbPer100: f.carbPer100 ?? 0,
      fatPer100: f.fatPer100 ?? 0,
      servingUnits: f.servingUnits ?? null,
      source: 'seed' as const,
      createdAt: new Date(),
    }))
  );
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

export interface DaySummary extends DayTotals {
  localDate: string;
  entryCount: number;
}

/**
 * รวมยอดของแต่ละวันในหนึ่งครั้ง — ให้ SQLite เป็นคนรวมแทนที่จะดึงทุกแถวมารวมใน JS
 * เรียงจากใหม่ไปเก่าเพราะรายการในหน้าประวัติเริ่มจากวันล่าสุด
 */
export async function getDaySummariesSince(fromLocalDate: string): Promise<DaySummary[]> {
  const rows = await db
    .select({
      localDate: mealEntries.localDate,
      kcal: sql<number>`sum(${mealEntries.kcal})`,
      proteinG: sql<number>`sum(${mealEntries.proteinG})`,
      carbG: sql<number>`sum(${mealEntries.carbG})`,
      fatG: sql<number>`sum(${mealEntries.fatG})`,
      entryCount: sql<number>`count(*)`,
    })
    .from(mealEntries)
    .where(gte(mealEntries.localDate, fromLocalDate))
    .groupBy(mealEntries.localDate)
    .orderBy(desc(mealEntries.localDate));

  return rows.map((r) => ({
    localDate: r.localDate,
    kcal: Number(r.kcal ?? 0),
    proteinG: Number(r.proteinG ?? 0),
    carbG: Number(r.carbG ?? 0),
    fatG: Number(r.fatG ?? 0),
    entryCount: Number(r.entryCount ?? 0),
  }));
}

// ---------- Workouts ----------

export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility' | 'sport' | 'other';

export interface NewWorkout {
  name: string;
  category: WorkoutCategory;
  met?: number | null;
  durationMin: number;
  kcalBurned: number;
  sets?: ExerciseSet[] | null;
  distanceKm?: number | null;
  avgHr?: number | null;
  note?: string | null;
}

export async function addWorkout(input: NewWorkout) {
  const id = `wo_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const now = new Date();
  await db.insert(workouts).values({
    id,
    name: input.name,
    category: input.category,
    met: input.met ?? null,
    durationMin: input.durationMin,
    kcalBurned: input.kcalBurned,
    sets: input.sets ?? null,
    distanceKm: input.distanceKm ?? null,
    avgHr: input.avgHr ?? null,
    note: input.note ?? null,
    performedAt: now,
    localDate: localDateString(now),
  });
  return id;
}

export async function deleteWorkout(id: string) {
  await db.delete(workouts).where(eq(workouts.id, id));
}

export async function getWorkoutsForDate(localDate: string) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.localDate, localDate))
    .orderBy(workouts.performedAt);
}

export async function getWorkoutsSince(fromLocalDate: string) {
  return db
    .select()
    .from(workouts)
    .where(gte(workouts.localDate, fromLocalDate))
    .orderBy(desc(workouts.performedAt));
}

/**
 * เซ็ตล่าสุดของท่านั้น ๆ ไว้เติมให้อัตโนมัติตอนบันทึกครั้งถัดไป
 * เก็บหลายท่าไว้ในแถวเดียวเป็น JSON จึงต้องดึงเซสชันเวทมาไล่หาใน JS
 * ดึงแค่ 40 เซสชันล่าสุดก็พอ ถ้าไม่เจอในนั้นแปลว่านานเกินกว่าจะเอามาเติมให้
 */
export async function getLastSetsForExercise(exercise: string) {
  const key = exercise.trim().toLowerCase();
  if (!key) return null;
  const rows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.category, 'strength'))
    .orderBy(desc(workouts.performedAt))
    .limit(40);

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
  const rows = await db
    .select({ sets: workouts.sets })
    .from(workouts)
    .where(eq(workouts.category, 'strength'))
    .orderBy(desc(workouts.performedAt))
    .limit(60);

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

// ---------- กินซ้ำ / รายการล่าสุด / มื้อชุด ----------

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
export async function repeatMealsFrom(
  fromLocalDate: string,
  mealType: MealType,
  toMealType: MealType = mealType
) {
  const rows = await getMealEntriesForDate(fromLocalDate);
  const source = rows.filter((r) => r.mealType === mealType);
  return addMealEntries(
    source.map((r) => ({
      foodId: r.foodId,
      name: r.name,
      mealType: toMealType,
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

export interface RecentFood {
  foodId: string | null;
  name: string;
  amountG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  estimated: boolean;
  lastMealType: MealType;
}

/**
 * อาหารที่เพิ่งกิน เก็บปริมาณครั้งล่าสุดไว้ด้วย จะได้กดครั้งเดียวแล้วบันทึกได้เลย
 * ดึงมา 150 แถวแล้วตัดชื่อซ้ำใน JS แทนการ group by ใน SQL
 * เพราะ SQLite ต้องพึ่งพฤติกรรม bare column กับ max() ซึ่งอ่านยากและพลาดง่าย
 */
export async function getRecentFoods(limit = 20): Promise<RecentFood[]> {
  const rows = await db
    .select()
    .from(mealEntries)
    .orderBy(desc(mealEntries.loggedAt))
    .limit(150);

  const seen = new Set<string>();
  const out: RecentFood[] = [];
  for (const r of rows) {
    const key = `${r.foodId ?? ''}|${r.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      foodId: r.foodId,
      name: r.name,
      amountG: r.amountG,
      kcal: r.kcal,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
      estimated: !!r.estimated,
      lastMealType: r.mealType as MealType,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getMealTemplates() {
  return db
    .select()
    .from(mealTemplates)
    .orderBy(desc(mealTemplates.useCount), desc(mealTemplates.createdAt));
}

export async function createMealTemplate(input: {
  name: string;
  mealType: MealType | null;
  items: TemplateItem[];
}) {
  const id = `tpl_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await db.insert(mealTemplates).values({
    id,
    name: input.name,
    mealType: input.mealType,
    items: input.items,
    useCount: 0,
    createdAt: new Date(),
  });
  return id;
}

/** สร้างมื้อชุดจากมื้อที่บันทึกไว้แล้วของวันหนึ่ง */
export async function createTemplateFromMeal(
  name: string,
  localDate: string,
  mealType: MealType
) {
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
  return createMealTemplate({ name, mealType, items });
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
