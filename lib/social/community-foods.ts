import type { ServingUnit } from '../db/schema';
import { supabase } from '../auth/client';
import { currentUserId } from './session';

export type CommunityFoodStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityFood {
  id: string;
  name: string;
  nameEn: string | null;
  brand: string | null;
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  fiberPer100: number | null;
  sodiumPer100: number | null;
  servingUnits: ServingUnit[] | null;
  status: CommunityFoodStatus;
  rejectionReason: string | null;
  reportCount: number;
  createdAt: string;
}

export interface SubmitFoodInput {
  name: string;
  nameEn?: string | null;
  brand?: string | null;
  kcalPer100: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
  fiberPer100?: number | null;
  sodiumPer100?: number | null;
  servingUnits?: ServingUnit[] | null;
}

const SELECT_COLUMNS =
  'id, name, name_en, brand, kcal_per_100, protein_per_100, carb_per_100, fat_per_100, fiber_per_100, sodium_per_100, serving_units, status, rejection_reason, report_count, created_at';

function toCommunityFood(row: Record<string, any>): CommunityFood {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    brand: row.brand,
    kcalPer100: row.kcal_per_100,
    proteinPer100: row.protein_per_100,
    carbPer100: row.carb_per_100,
    fatPer100: row.fat_per_100,
    fiberPer100: row.fiber_per_100,
    sodiumPer100: row.sodium_per_100,
    servingUnits: row.serving_units,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reportCount: row.report_count,
    createdAt: row.created_at,
  };
}

export async function submitFoodForReview(input: SubmitFoodInput): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('community_foods').insert({
    submitted_by: uid,
    name: input.name,
    name_en: input.nameEn ?? null,
    brand: input.brand ?? null,
    kcal_per_100: input.kcalPer100,
    protein_per_100: input.proteinPer100 ?? 0,
    carb_per_100: input.carbPer100 ?? 0,
    fat_per_100: input.fatPer100 ?? 0,
    fiber_per_100: input.fiberPer100 ?? null,
    sodium_per_100: input.sodiumPer100 ?? null,
    serving_units: input.servingUnits ?? null,
  });
  if (error) throw error;
}

export async function browseApprovedFoods(query: string, limit = 30): Promise<CommunityFood[]> {
  await currentUserId();
  let q = supabase.from('community_foods').select(SELECT_COLUMNS).eq('status', 'approved').limit(limit);
  const trimmed = query.trim();
  if (trimmed) q = q.or(`name.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toCommunityFood);
}

export async function getMySubmissions(): Promise<CommunityFood[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('community_foods')
    .select(SELECT_COLUMNS)
    .eq('submitted_by', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCommunityFood);
}

export async function reportFood(foodId: string, reason?: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('community_food_reports').insert({ food_id: foodId, reported_by: uid, reason: reason ?? null });
  if (error) throw error;
}

export async function isModerator(): Promise<boolean> {
  const uid = await currentUserId();
  const { data, error } = await supabase.from('moderators').select('user_id').eq('user_id', uid).maybeSingle();
  if (error) return false;
  return data != null;
}

/** คิวสำหรับ moderator: pending มาก่อน (เก่าสุดก่อน) ตามด้วย approved ที่โดนรายงาน (โดนเยอะสุดก่อน) */
export async function listPendingForReview(): Promise<CommunityFood[]> {
  const [pending, reportedApproved] = await Promise.all([
    supabase.from('community_foods').select(SELECT_COLUMNS).eq('status', 'pending').order('created_at', { ascending: true }),
    supabase
      .from('community_foods')
      .select(SELECT_COLUMNS)
      .eq('status', 'approved')
      .gt('report_count', 0)
      .order('report_count', { ascending: false }),
  ]);
  if (pending.error) throw pending.error;
  if (reportedApproved.error) throw reportedApproved.error;
  return [...(pending.data ?? []), ...(reportedApproved.data ?? [])].map(toCommunityFood);
}

export async function approveFood(id: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('community_foods')
    .update({ status: 'approved', reviewed_by: uid, reviewed_at: new Date().toISOString(), rejection_reason: null })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectFood(id: string, reason: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('community_foods')
    .update({ status: 'rejected', reviewed_by: uid, reviewed_at: new Date().toISOString(), rejection_reason: reason })
    .eq('id', id);
  if (error) throw error;
}
