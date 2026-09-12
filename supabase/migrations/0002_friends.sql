-- Phase 1 ของฟีเจอร์โซเชียล — เพื่อน + แชร์กิจกรรม + ความเป็นส่วนตัวของน้ำหนัก
-- ต้องรัน 0001_social_foundation.sql ก่อนไฟล์นี้ (ต้องมี public.profiles และ public.privacy_settings แล้ว)
--
-- รันผ่าน Supabase SQL editor ของ numi-api.enablebrain.com — apply เองจากเครื่อง dev ไม่ได้

-- ============================================================
-- friend_requests
-- ============================================================
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user_id <> to_user_id)
);

-- กันส่งคำขอซ้ำระหว่างคนสองคนเดียวกันตอนยังมีคำขอ pending ค้างอยู่ (ไม่สนทิศทาง)
create unique index if not exists friend_requests_pending_pair_unique
  on public.friend_requests (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id))
  where status = 'pending';

alter table public.friend_requests enable row level security;

create policy "see requests you sent or received"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() in (from_user_id, to_user_id));

create policy "send a friend request"
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = from_user_id);

-- แก้ไขได้แค่ decline (ฝั่งผู้รับ) หรือ cancel (ฝั่งผู้ส่ง) ของคำขอที่ยัง pending อยู่เท่านั้น
-- 'accepted' ตั้งได้ทางเดียวผ่าน accept_friend_request() ด้านล่าง เพื่อให้สร้าง friendship คู่กันแบบอะตอมิก
create policy "respond to a pending request"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() in (from_user_id, to_user_id) and status = 'pending')
  with check (
    (auth.uid() = to_user_id and status = 'declined')
    or (auth.uid() = from_user_id and status = 'cancelled')
  );

-- ============================================================
-- friendships — เก็บทิศทางเดียว (user_a_id < user_b_id) กันแถวซ้ำสองทิศทาง
-- ============================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

alter table public.friendships enable row level security;

create policy "see your own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

-- ไม่มี insert/update/delete policy ให้ client โดยตรง — สร้างได้ทางเดียวผ่าน
-- accept_friend_request() (security definer) เพื่อให้ผูกกับการอัปเดต friend_requests เสมอ

-- ============================================================
-- accept_friend_request — อัปเดตคำขอ + สร้าง friendship ในทรานแซกชันเดียว
-- ============================================================
create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
  a uuid;
  b uuid;
begin
  select * into req from public.friend_requests where id = request_id for update;

  if req.id is null then
    raise exception 'friend request not found';
  end if;
  if req.to_user_id <> auth.uid() then
    raise exception 'not authorized to accept this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.friend_requests
    set status = 'accepted', responded_at = now()
    where id = request_id;

  if req.from_user_id < req.to_user_id then
    a := req.from_user_id; b := req.to_user_id;
  else
    a := req.to_user_id; b := req.from_user_id;
  end if;

  insert into public.friendships (user_a_id, user_b_id)
  values (a, b)
  on conflict (user_a_id, user_b_id) do nothing;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

-- ============================================================
-- find_user_by_email — จับคู่อีเมลแบบตรงเป๊ะเท่านั้น ไม่ list/ไม่ partial match
-- กัน enumerate อีเมลผู้ใช้คนอื่นในระบบ
-- ============================================================
create or replace function public.find_user_by_email(target_email text)
returns table (user_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.user_id, p.display_name
    from auth.users u
    join public.profiles p on p.user_id = u.id
    where lower(u.email) = lower(target_email)
      and u.id <> auth.uid()
    limit 1;
end;
$$;

grant execute on function public.find_user_by_email(text) to authenticated;

-- ============================================================
-- kudos — ให้กำลังใจ workout ของเพื่อน คนละครั้งต่อ workout
-- ============================================================
create table if not exists public.kudos (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  workout_id text not null,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user_id, workout_id)
);

alter table public.kudos enable row level security;

create policy "see kudos you gave or received"
  on public.kudos for select
  to authenticated
  using (auth.uid() in (from_user_id, to_user_id));

-- เช็คครบใน WITH CHECK เอง ไม่พึ่ง client gate: ต้องเป็นเพื่อนกันจริง, เจ้าของ workout เปิดแชร์กิจกรรม,
-- และ workout นั้นมีอยู่จริงเป็นของ to_user_id (กัน kudos ยิงใส่ workout ที่ลบไปแล้ว/ไม่ใช่ของคนนั้น)
create policy "give kudos to a friend's shared workout"
  on public.kudos for insert
  to authenticated
  with check (
    auth.uid() = from_user_id
    and from_user_id <> to_user_id
    and exists (
      select 1 from public.friendships f
      where least(from_user_id, to_user_id) = f.user_a_id
        and greatest(from_user_id, to_user_id) = f.user_b_id
    )
    and exists (
      select 1 from public.privacy_settings ps
      where ps.user_id = to_user_id and ps.share_activity = true
    )
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = to_user_id and w.deleted_at is null
    )
  );

-- ============================================================
-- workouts — เพิ่ม policy ใหม่ให้เพื่อนอ่านได้แบบมีเงื่อนไข
-- (ไม่แตะ/ไม่ลบ policy เดิมที่ให้เจ้าของอ่าน-เขียนแถวตัวเอง — policy หลายอันบน select จะ OR กัน)
-- ============================================================
create policy "friends can view shared workouts"
  on public.workouts for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.friendships f
      where least(user_id, auth.uid()) = f.user_a_id
        and greatest(user_id, auth.uid()) = f.user_b_id
    )
    and exists (
      select 1 from public.privacy_settings ps
      where ps.user_id = workouts.user_id and ps.share_activity = true
    )
  );

-- ============================================================
-- get_friend_weight_trend — จุดเดียวที่ข้อมูลน้ำหนักของคนอื่นไหลออกได้
-- ไม่มี RLS ใด ๆ เปิดให้ตาราง weights ตรง ๆ สำหรับผู้ใช้อื่น — ผ่านฟังก์ชันนี้เท่านั้น
-- เช็คสองชั้น: (1) ต้องเป็นเพื่อนที่ accepted แล้ว (2) friend ต้องเปิด share_weight เอง
-- คืนตัวเลขจริง (weight_kg) เฉพาะตอน weight_share_mode='exact' เท่านั้น ไม่งั้นคืนแค่แนวโน้ม
-- ============================================================
create or replace function public.get_friend_weight_trend(friend_id uuid)
returns table (trend text, kg_change_30d numeric, weight_kg numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  is_friend boolean;
  privacy public.privacy_settings%rowtype;
  latest numeric;
  past numeric;
begin
  select exists (
    select 1 from public.friendships f
    where least(auth.uid(), friend_id) = f.user_a_id
      and greatest(auth.uid(), friend_id) = f.user_b_id
  ) into is_friend;

  if not is_friend then
    raise exception 'not friends with this user';
  end if;

  select * into privacy from public.privacy_settings where user_id = friend_id;

  if privacy.user_id is null or privacy.share_weight is not true then
    raise exception 'this user does not share weight progress';
  end if;

  select w.weight_kg into latest
  from public.weights w
  where w.user_id = friend_id and w.deleted_at is null
  order by w.local_date desc
  limit 1;

  select w.weight_kg into past
  from public.weights w
  where w.user_id = friend_id and w.deleted_at is null
    and w.local_date <= (current_date - interval '30 days')::date::text
  order by w.local_date desc
  limit 1;

  return query select
    case
      when past is null or latest is null then 'flat'
      when latest < past - 0.1 then 'down'
      when latest > past + 0.1 then 'up'
      else 'flat'
    end as trend,
    case when past is not null and latest is not null then round((latest - past)::numeric, 1) else null end as kg_change_30d,
    case when privacy.weight_share_mode = 'exact' then latest else null end as weight_kg;
end;
$$;

grant execute on function public.get_friend_weight_trend(uuid) to authenticated;
