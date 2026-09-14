-- Phase 2 ของฟีเจอร์โซเชียล — ฐานอาหารที่ผู้ใช้ช่วยกันเพิ่ม พร้อมระบบตรวจก่อนเผยแพร่
-- ต้องรัน 0001_social_foundation.sql ก่อนไฟล์นี้ (ต้องมี auth.users ใช้อ้างอิงอยู่แล้ว — ไฟล์นี้ไม่พึ่ง
-- profiles/privacy_settings โดยตรง แต่รันหลัง 0001+0002 ตามลำดับเดิมเพื่อความสอดคล้อง)
--
-- รันผ่าน Supabase SQL editor ของ numi-api.enablebrain.com — apply เองจากเครื่อง dev ไม่ได้

-- ============================================================
-- community_foods — เมนูที่ผู้ใช้ส่งมาให้คนอื่นใช้ด้วย ต้องผ่านการตรวจก่อนถึงจะเห็นกันทั่วไป
-- ============================================================
create table if not exists public.community_foods (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  name_en text,
  brand text,
  kcal_per_100 real not null,
  protein_per_100 real not null default 0,
  carb_per_100 real not null default 0,
  fat_per_100 real not null default 0,
  fiber_per_100 real,
  sodium_per_100 real,
  serving_units jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  rejection_reason text,
  report_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_foods enable row level security;

create policy "browse approved foods, or your own submissions, or moderator sees all"
  on public.community_foods for select
  to authenticated
  using (
    status = 'approved'
    or submitted_by = auth.uid()
    or exists (select 1 from public.moderators m where m.user_id = auth.uid())
  );

create policy "submit a food for review"
  on public.community_foods for insert
  to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

-- เจ้าของแก้เนื้อหาได้เฉพาะตอนยัง pending (แก้พิมพ์ผิดก่อนตรวจ) แก้ status/reviewed_* เองไม่ได้
create policy "submitter can edit their own pending submission"
  on public.community_foods for update
  to authenticated
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'pending');

-- moderator แก้ได้ทุกฟิลด์รวม status/reviewed_*/rejection_reason
create policy "moderators can review any submission"
  on public.community_foods for update
  to authenticated
  using (exists (select 1 from public.moderators m where m.user_id = auth.uid()))
  with check (exists (select 1 from public.moderators m where m.user_id = auth.uid()));

-- ไม่มี delete policy — เก็บประวัติไว้ตรวจสอบย้อนหลังเสมอ

-- ============================================================
-- moderators — allowlist ล้วน ไม่มี insert/update/delete policy ให้ client เลย
-- ผู้ใช้ต้อง insert แถวแรกของตัวเองเองผ่าน SQL editor:
--   insert into public.moderators (user_id) values ('<uuid จาก select id from auth.users where email = ...>');
-- ============================================================
create table if not exists public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

create policy "check your own moderator status"
  on public.moderators for select
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- community_food_reports — รายงานเมนูที่ไม่เหมาะสม/ข้อมูลผิด
-- แค่เพิ่ม report_count ให้ moderator เห็น ไม่ auto-hide เอง (กันรายงานปลอมกลั่นแกล้ง)
-- ============================================================
create table if not exists public.community_food_reports (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.community_foods (id) on delete cascade,
  reported_by uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (food_id, reported_by)
);

alter table public.community_food_reports enable row level security;

create policy "report a food once"
  on public.community_food_reports for insert
  to authenticated
  with check (reported_by = auth.uid());

create policy "see your own reports or moderator sees all"
  on public.community_food_reports for select
  to authenticated
  using (
    reported_by = auth.uid()
    or exists (select 1 from public.moderators m where m.user_id = auth.uid())
  );

create or replace function public.bump_community_food_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_foods
    set report_count = report_count + 1
    where id = new.food_id;
  return new;
end;
$$;

drop trigger if exists on_community_food_report_created on public.community_food_reports;
create trigger on_community_food_report_created
  after insert on public.community_food_reports
  for each row execute function public.bump_community_food_report_count();

-- ============================================================
-- อนุญาตให้ foods.source (ตารางที่ sync อยู่แล้วปกติ) มีค่า 'community' ได้ด้วย
-- ตรงกับ enum ใหม่ฝั่ง local ใน lib/db/schema.ts — 'community' หมายถึง "นำเข้าจากฐานที่ผ่านการตรวจแล้ว"
-- ไม่รู้ชื่อ CHECK constraint เดิมแน่ชัด (schema server อยู่นอก repo นี้) จึงหาแล้วแทนที่ให้อัตโนมัติ
-- ============================================================
do $$
declare
  con record;
begin
  for con in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid
    where rel.relname = 'foods'
      and con.contype = 'c'
      and att.attname = 'source'
      and att.attnum = any(con.conkey)
  loop
    execute format('alter table public.foods drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.foods
  add constraint foods_source_check check (source in ('seed', 'user', 'ai', 'community'));
