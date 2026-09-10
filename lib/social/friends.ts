import { supabase } from '../auth/client';
import { currentUserId } from './session';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
  otherDisplayName: string | null;
}

export interface Friend {
  userId: string;
  displayName: string | null;
}

export interface PrivacySettings {
  shareActivity: boolean;
  shareWeight: boolean;
  weightShareMode: 'relative' | 'exact';
  leaderboardOptIn: boolean;
}

export interface FriendWorkout {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  kcalBurned: number;
  localDate: string;
}

export interface FriendWeightTrend {
  trend: 'up' | 'down' | 'flat';
  kgChange30d: number | null;
  weightKg: number | null;
}

/** ส่งคำขอเป็นเพื่อนด้วยอีเมล — match ตรงเป๊ะเท่านั้น (ดู find_user_by_email ใน 0002_friends.sql) */
export async function sendFriendRequest(email: string): Promise<void> {
  const { data: matches, error: findError } = await supabase.rpc('find_user_by_email', {
    target_email: email.trim(),
  });
  if (findError) throw findError;
  const match = matches?.[0];
  if (!match) throw new Error('ไม่พบผู้ใช้ที่ใช้อีเมลนี้');

  const uid = await currentUserId();
  const { error } = await supabase
    .from('friend_requests')
    .insert({ from_user_id: uid, to_user_id: match.user_id });
  if (error) throw error;
}

export async function listPendingRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
  if (error) throw error;

  const rows = data ?? [];
  const otherIds = rows.map((r) => (r.from_user_id === uid ? r.to_user_id : r.from_user_id));
  const nameByUserId = await fetchDisplayNames(otherIds);

  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  for (const r of rows) {
    const isIncoming = r.to_user_id === uid;
    const otherId = isIncoming ? r.from_user_id : r.to_user_id;
    const req: FriendRequest = {
      id: r.id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      status: r.status,
      createdAt: r.created_at,
      otherDisplayName: nameByUserId.get(otherId) ?? null,
    };
    (isIncoming ? incoming : outgoing).push(req);
  }
  return { incoming, outgoing };
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
}

export async function listFriends(): Promise<Friend[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`);
  if (error) throw error;

  const friendIds = (data ?? []).map((f) => (f.user_a_id === uid ? f.user_b_id : f.user_a_id));
  const nameByUserId = await fetchDisplayNames(friendIds);
  return friendIds.map((id) => ({ userId: id, displayName: nameByUserId.get(id) ?? null }));
}

async function fetchDisplayNames(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.user_id, p.display_name]));
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('privacy_settings')
    .select('share_activity, share_weight, weight_share_mode, leaderboard_opt_in')
    .eq('user_id', uid)
    .single();
  if (error) throw error;
  return {
    shareActivity: data.share_activity,
    shareWeight: data.share_weight,
    weightShareMode: data.weight_share_mode,
    leaderboardOptIn: data.leaderboard_opt_in,
  };
}

export async function updatePrivacySettings(patch: Partial<PrivacySettings>): Promise<void> {
  const uid = await currentUserId();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.shareActivity !== undefined) payload.share_activity = patch.shareActivity;
  if (patch.shareWeight !== undefined) payload.share_weight = patch.shareWeight;
  if (patch.weightShareMode !== undefined) payload.weight_share_mode = patch.weightShareMode;
  if (patch.leaderboardOptIn !== undefined) payload.leaderboard_opt_in = patch.leaderboardOptIn;

  const { error } = await supabase.from('privacy_settings').update(payload).eq('user_id', uid);
  if (error) throw error;
}

/** ประวัติ workout ของเพื่อนคนหนึ่ง — RLS (`friends can view shared workouts`) เป็นตัวกรองสิทธิ์จริง */
export async function listFriendActivity(friendId: string, limit = 30): Promise<FriendWorkout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, category, duration_min, kcal_burned, local_date')
    .eq('user_id', friendId)
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    durationMin: w.duration_min,
    kcalBurned: w.kcal_burned,
    localDate: w.local_date,
  }));
}

export async function giveKudos(workoutId: string, toUserId: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from('kudos').insert({ from_user_id: uid, workout_id: workoutId, to_user_id: toUserId });
  if (error) throw error;
}

/** คืน null ถ้ายังไม่ได้เป็นเพื่อนหรือเพื่อนยังไม่เปิดแชร์น้ำหนัก (ฟังก์ชัน server โยน error ทั้งสองเคส) */
export async function getFriendWeightTrend(friendId: string): Promise<FriendWeightTrend | null> {
  const { data, error } = await supabase.rpc('get_friend_weight_trend', { friend_id: friendId });
  if (error) return null;
  const row = data?.[0];
  if (!row) return null;
  return { trend: row.trend, kgChange30d: row.kg_change_30d, weightKg: row.weight_kg };
}
