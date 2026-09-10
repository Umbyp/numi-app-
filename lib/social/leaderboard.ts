import { supabase } from '../auth/client';

export type ChallengeMetric = 'kcal_burned' | 'workout_minutes' | 'workout_count';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: ChallengeMetric;
  startsAt: string;
  endsAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  score: number;
  rank: number;
}

/** ไม่มีหน้าสร้าง challenge ในแอป — moderator เพิ่มเองผ่าน SQL editor (ดู 0004_challenges.sql) */
export async function listActiveChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, description, metric, starts_at, ends_at')
    .gt('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    metric: row.metric,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
}

/** คืนแค่ 50 อันดับแรก (จำกัดไว้ฝั่ง server ใน get_leaderboard) — เฉพาะคนที่เปิด leaderboard_opt_in */
export async function getLeaderboard(challengeId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_challenge_id: challengeId });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    displayName: row.display_name,
    score: row.score,
    rank: row.rank,
  }));
}
