import { eq, desc, like, or } from 'drizzle-orm';
import { db } from './client';
import { profile, foods, mealEntries, weights } from './schema';
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

// ---------- Weights ----------

export async function getLatestWeight() {
  const rows = await db
    .select()
    .from(weights)
    .orderBy(desc(weights.localDate))
    .limit(1);
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
