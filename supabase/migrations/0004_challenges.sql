-- Phase 3 ของฟีเจอร์โซเชียล — Challenge / ตารางอันดับ (เปิด/ปิดได้เสมอ ค่าตั้งต้นปิด)
-- ต้องรัน 0001_social_foundation.sql (privacy_settings, profiles) และ 0003_community_foods.sql
-- (moderators — ใช้ allowlist เดียวกันเป็นคนสร้าง challenge) ก่อนไฟล์นี้
--
-- รันผ่าน Supabase SQL editor ของ numi-api.enablebrain.com — apply เองจากเครื่อง dev ไม่ได้
--
-- ไม่มีหน้าสร้าง challenge ในแอป (ตามที่ตกลงกันไว้) — สร้างเองผ่าน SQL editor เช่น:
--   insert into public.challenges (title, metric, starts_at, ends_at)
--   values ('ท้าออกกำลังกายสัปดาห์นี้', 'kcal_burned', now(), now() + interval '7 days');

-- ============================================================
-- challenges — เนื้อหาไม่อ่อนไหว (ชื่อ/ช่วงวัน/metric) ให้ authenticated ทุกคนอ่านได้
-- สร้าง/แก้ไขได้เฉพาะ moderator เท่านั้น
-- ============================================================
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  metric text not null check (metric in ('kcal_burned', 'workout_minutes', 'workout_count')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.challenges enable row level security;

create policy "anyone authenticated can browse challenges"
  on public.challenges for select
  to authenticated
  using (true);

create policy "moderators manage challenges"
  on public.challenges for all
  to authenticated
  using (exists (select 1 from public.moderators m where m.user_id = auth.uid()))
  with check (exists (select 1 from public.moderators m where m.user_id = auth.uid()));

-- ============================================================
-- get_leaderboard — คิดคะแนนจาก workouts สด ๆ ทุกครั้งที่เรียก ไม่มีตารางเก็บผลแยก
-- กรองเฉพาะผู้ใช้ที่ privacy_settings.leaderboard_opt_in = true ณ เวลาที่เรียก (ปิดแล้วหายทันที
-- ในการเรียกครั้งถัดไป ไม่ต้องมี cleanup job) คืนแค่ user_id/display_name/score/rank
-- ไม่คืนแถว workouts ดิบเลยแม้แต่แถวเดียว — เหมือน pattern get_friend_weight_trend ใน 0002_friends.sql
-- จำกัดไว้ 50 อันดับแรก (rank คำนวณจากอันดับจริงทั้งหมดก่อนตัด ไม่ใช่อันดับใน 50 แถวที่คืนมา)
-- ============================================================
create or replace function public.get_leaderboard(p_challenge_id uuid)
returns table (user_id uuid, display_name text, score numeric, rank bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  ch public.challenges%rowtype;
begin
  select * into ch from public.challenges where id = p_challenge_id;
  if ch.id is null then
    raise exception 'challenge not found';
  end if;

  return query
    with scored as (
      select
        w.user_id as uid,
        case ch.metric
          when 'kcal_burned' then sum(w.kcal_burned)
          when 'workout_minutes' then sum(w.duration_min)
          when 'workout_count' then count(*)::numeric
        end as points
      from public.workouts w
      where w.deleted_at is null
        and w.performed_at >= ch.starts_at
        and w.performed_at <= ch.ends_at
        and exists (
          select 1 from public.privacy_settings ps
          where ps.user_id = w.user_id and ps.leaderboard_opt_in = true
        )
      group by w.user_id
    )
    select
      s.uid,
      p.display_name,
      s.points,
      rank() over (order by s.points desc)
    from scored s
    join public.profiles p on p.user_id = s.uid
    order by s.points desc
    limit 50;
end;
$$;

grant execute on function public.get_leaderboard(uuid) to authenticated;
