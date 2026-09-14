-- Phase 0 ของฟีเจอร์โซเชียล (เพื่อน/ฐานอาหารชุมชน/ตารางอันดับ) — ดู
-- /Users/benyaporn/.claude/plans/ethereal-mapping-sonnet.md สำหรับบริบทเต็ม
--
-- รันไฟล์นี้ผ่าน Supabase SQL editor ของโปรเจกต์ numi-api.enablebrain.com ก่อนใช้ฟีเจอร์เพื่อน
-- (ไฟล์นี้ apply ไม่ได้จากเครื่อง dev — ต้องรันเองแล้วค่อยทดสอบแอป)

-- ============================================================
-- profiles — ใช้แสดงชื่อผู้ใช้ตอนแสดงรายชื่อเพื่อน/ตารางอันดับ
-- โดยไม่ต้องเปิด RLS ให้ query ตาราง auth.users ตรง ๆ
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile row"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- สร้างแถว profiles อัตโนมัติทุกครั้งที่มีผู้ใช้ใหม่สมัคร (email หรือ Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- แถว profiles สำหรับผู้ใช้ที่สมัครไว้ก่อนไฟล์นี้ถูกรัน
insert into public.profiles (user_id, display_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- privacy_settings — สร้างครบทุก flag ตั้งแต่ Phase 0 แม้ Phase 1
-- จะใช้แค่ share_activity/share_weight/weight_share_mode
-- (leaderboard_opt_in รอ Phase 3 แต่กันไม่ต้องมา ALTER TABLE เพิ่มทีหลัง)
-- ============================================================
create table if not exists public.privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  share_activity boolean not null default false,
  share_weight boolean not null default false,
  weight_share_mode text not null default 'relative'
    check (weight_share_mode in ('relative', 'exact')),
  leaderboard_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.privacy_settings enable row level security;

-- อ่าน/แก้ได้เฉพาะแถวของตัวเอง — ฟีเจอร์อื่นอ่าน flag ของ "คนอื่น" ผ่าน
-- security definer function เฉพาะทางเท่านั้น (ดู 0002_friends.sql) ไม่ใช่ query ตารางนี้ตรง ๆ
create policy "users manage their own privacy settings"
  on public.privacy_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- สร้างแถว privacy_settings อัตโนมัติพร้อมกับ profiles ตอนสมัครใหม่
create or replace function public.handle_new_user_privacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.privacy_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_privacy on auth.users;
create trigger on_auth_user_created_privacy
  after insert on auth.users
  for each row execute function public.handle_new_user_privacy();

insert into public.privacy_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
