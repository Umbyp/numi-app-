-- self-host Postgres ไม่ได้ตั้ง ALTER DEFAULT PRIVILEGES ให้ role authenticated เหมือน hosted Supabase
-- ตารางใหม่จาก 0001-0004 เลยไม่มี grant ระดับตาราง ทำให้ authenticated ชน 42501 permission denied
-- ก่อน RLS จะได้ประเมินด้วยซ้ำ — grant เท่าที่แต่ละตารางถูกเรียกใช้จริง (RLS policy คุม row/column ต่ออีกชั้น)
grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.privacy_settings to authenticated;

grant select, insert, update on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant select, insert on public.kudos to authenticated;

grant select, insert, update on public.community_foods to authenticated;
grant select on public.moderators to authenticated;
grant select, insert on public.community_food_reports to authenticated;

grant select, insert, update on public.challenges to authenticated;
