import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const sqliteDb = SQLite.openDatabaseSync('numi.db');
export const db = drizzle(sqliteDb, { schema });

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS profile (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id INTEGER PRIMARY KEY,
  sex TEXT NOT NULL,
  birth_year INTEGER NOT NULL,
  height_cm REAL NOT NULL,
  activity_level REAL NOT NULL DEFAULT 1.375,
  goal_type TEXT NOT NULL,
  weekly_rate_kg REAL NOT NULL DEFAULT -0.5,
  manual_kcal INTEGER,
  protein_pct REAL NOT NULL DEFAULT 0.30,
  carb_pct REAL NOT NULL DEFAULT 0.40,
  fat_pct REAL NOT NULL DEFAULT 0.30,
  add_exercise_kcal INTEGER NOT NULL DEFAULT 0,
  goal_weight_kg REAL,
  prioritize_muscle INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS foods (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  brand TEXT,
  kcal_per_100 REAL NOT NULL,
  protein_per_100 REAL NOT NULL DEFAULT 0,
  carb_per_100 REAL NOT NULL DEFAULT 0,
  fat_per_100 REAL NOT NULL DEFAULT 0,
  fiber_per_100 REAL DEFAULT 0,
  sodium_per_100 REAL DEFAULT 0,
  serving_units TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_entries (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  food_id TEXT REFERENCES foods(id),
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  amount_g REAL NOT NULL,
  kcal REAL NOT NULL,
  protein_g REAL NOT NULL DEFAULT 0,
  carb_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  estimated INTEGER NOT NULL DEFAULT 0,
  photo_uri TEXT,
  note TEXT,
  logged_at INTEGER NOT NULL,
  local_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_entries_local_date ON meal_entries(local_date);

CREATE TABLE IF NOT EXISTS workouts (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  met REAL,
  duration_min REAL NOT NULL,
  kcal_burned REAL NOT NULL,
  sets TEXT,
  distance_km REAL,
  avg_hr INTEGER,
  note TEXT,
  performed_at INTEGER NOT NULL,
  local_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workouts_local_date ON workouts(local_date);

CREATE TABLE IF NOT EXISTS workout_plans (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  days TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_plan_completions (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES workout_plans(id),
  day_index INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workout_plan_completions_plan ON workout_plan_completions(plan_id);

CREATE TABLE IF NOT EXISTS weights (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  weight_kg REAL NOT NULL,
  body_fat_pct REAL,
  note TEXT,
  local_date TEXT NOT NULL UNIQUE,
  recorded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  waist_cm REAL,
  chest_cm REAL,
  hip_cm REAL,
  arm_cm REAL,
  thigh_cm REAL,
  note TEXT,
  local_date TEXT NOT NULL UNIQUE,
  recorded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_templates (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  meal_type TEXT,
  items TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS water_logs (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL UNIQUE,
  ml INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls TEXT,
  tool_call_id TEXT,
  card_status TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS water_intakes (
  user_id TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  server_updated_at INTEGER,
  deleted_at INTEGER,
  dirty INTEGER NOT NULL DEFAULT 1,
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  ml INTEGER NOT NULL,
  drank_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_intakes_local_date ON water_intakes(local_date);

-- ทุกการ UPDATE ต้องทำให้แถวกลายเป็น dirty เอง ไม่งั้นจะลืมได้
--
-- $defaultFn ของ drizzle ครอบคลุมแค่ INSERT ส่วน UPDATE ทุกจุดในแอปต้องเซ็ต dirty เอง
-- ซึ่งลืมง่ายมาก และถ้าลืมแถวนั้นจะไม่ถูก push ขึ้นเซิร์ฟเวอร์เลยโดยไม่มี error ให้เห็น
-- ยกงานนี้ให้ฐานข้อมูลทำแทน จะได้ไม่ต้องพึ่งวินัยของคนเขียนโค้ด
--
-- เงื่อนไขเป็น OLD.dirty = 0 ไม่ใช่ NEW.dirty = OLD.dirty เพราะ:
--   1. ถ้าแถว dirty อยู่แล้วก็ไม่มีอะไรต้องทำ เดี๋ยวก็ถูก push อยู่ดี
--   2. ตอน sync engine ล้างธง (1 -> 0) OLD.dirty = 1 trigger จึงไม่ยิงกลับ ไม่วนลูป
--   3. สำคัญที่สุด — ทดสอบแล้วว่าปลอดภัยแม้ recursive_triggers เปิดอยู่
--      แบบ NEW.dirty = OLD.dirty พังทันทีถ้า pragma เปิด (too many levels of trigger recursion)
--      แบบนี้ recursion ลึกสุดแค่ 2 ชั้นแล้วหยุดเอง จึงไม่ต้องพึ่งค่า pragma
--
-- strftime('%s') คืนค่าเป็นวินาที ตรงกับที่ drizzle mode 'timestamp' คาดหวัง ห้ามคูณพัน

CREATE TRIGGER IF NOT EXISTS trg_profile_dirty AFTER UPDATE ON profile
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE profile SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_foods_dirty AFTER UPDATE ON foods
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE foods SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_meal_entries_dirty AFTER UPDATE ON meal_entries
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE meal_entries SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_workouts_dirty AFTER UPDATE ON workouts
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE workouts SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_workout_plans_dirty AFTER UPDATE ON workout_plans
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE workout_plans SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_workout_plan_completions_dirty AFTER UPDATE ON workout_plan_completions
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE workout_plan_completions SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_weights_dirty AFTER UPDATE ON weights
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE weights SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_measurements_dirty AFTER UPDATE ON measurements
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE measurements SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_meal_templates_dirty AFTER UPDATE ON meal_templates
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE meal_templates SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_chat_messages_dirty AFTER UPDATE ON chat_messages
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE chat_messages SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_app_settings_dirty AFTER UPDATE ON app_settings
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE app_settings SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;
CREATE TRIGGER IF NOT EXISTS trg_water_intakes_dirty AFTER UPDATE ON water_intakes
FOR EACH ROW WHEN OLD.dirty = 0
BEGIN
  UPDATE water_intakes SET updated_at = strftime('%s','now'), dirty = 1 WHERE rowid = NEW.rowid;
END;

CREATE TABLE IF NOT EXISTS sync_meta (
  table_name TEXT PRIMARY KEY,
  last_pulled_at INTEGER NOT NULL DEFAULT 0
);
`;

// คอลัมน์ที่เพิ่มทีหลัง CREATE_TABLES ตอนแรก — ต้องเผื่อเครื่องที่ลงแอปไปแล้วก่อนหน้านี้
// ไม่มี migration framework เพราะแอปคนเดียว ใช้วิธีลอง ALTER แล้วเมิน error "duplicate column" พอ
const COLUMN_MIGRATIONS = [
  `ALTER TABLE profile ADD COLUMN goal_weight_kg REAL`,
  `ALTER TABLE profile ADD COLUMN prioritize_muscle INTEGER NOT NULL DEFAULT 0`,

  // คอลัมน์สำหรับ sync — ดู docs/sync-design.md
  // dirty ตั้งต้นเป็น 1 ตั้งใจ: ข้อมูลที่มีอยู่แล้วในเครื่องต้องถูก push ขึ้นครบในรอบแรก
  `ALTER TABLE profile ADD COLUMN user_id TEXT`,
  `ALTER TABLE profile ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE profile ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE profile ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE profile ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE foods ADD COLUMN user_id TEXT`,
  `ALTER TABLE foods ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE foods ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE foods ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE foods ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE meal_entries ADD COLUMN user_id TEXT`,
  `ALTER TABLE meal_entries ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE meal_entries ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE meal_entries ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE meal_entries ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE workouts ADD COLUMN user_id TEXT`,
  `ALTER TABLE workouts ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE workouts ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE workouts ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE workouts ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE workout_plans ADD COLUMN user_id TEXT`,
  `ALTER TABLE workout_plans ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE workout_plans ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE workout_plans ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE workout_plans ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE workout_plan_completions ADD COLUMN user_id TEXT`,
  `ALTER TABLE workout_plan_completions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE workout_plan_completions ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE workout_plan_completions ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE workout_plan_completions ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE weights ADD COLUMN user_id TEXT`,
  `ALTER TABLE weights ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE weights ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE weights ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE weights ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE measurements ADD COLUMN user_id TEXT`,
  `ALTER TABLE measurements ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE measurements ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE measurements ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE measurements ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE meal_templates ADD COLUMN user_id TEXT`,
  `ALTER TABLE meal_templates ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE meal_templates ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE meal_templates ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE meal_templates ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE chat_messages ADD COLUMN user_id TEXT`,
  `ALTER TABLE chat_messages ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE chat_messages ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE chat_messages ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE chat_messages ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE app_settings ADD COLUMN user_id TEXT`,
  `ALTER TABLE app_settings ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE app_settings ADD COLUMN server_updated_at INTEGER`,
  `ALTER TABLE app_settings ADD COLUMN deleted_at INTEGER`,
  `ALTER TABLE app_settings ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1`,
];

/**
 * ย้ายน้ำดื่มจาก water_logs (ยอดรวมต่อวัน) ไป water_intakes (แถวต่อครั้ง)
 *
 * ทำครั้งเดียว กันรันซ้ำด้วยธงใน app_settings ไม่ใช่ด้วยการเช็คว่า water_intakes ว่างไหม
 * เพราะถ้าผู้ใช้ลบน้ำของวันนี้ทิ้งจนตารางว่าง แล้วเปิดแอปใหม่ ข้อมูลเก่าจะถูกยัดกลับเข้ามาอีกรอบ
 *
 * ยอดรวมเดิมของแต่ละวันกลายเป็นแถวเดียวก้อนเดียว ไม่ได้แตกเป็นแก้ว ๆ
 * เพราะข้อมูลเดิมไม่เคยเก็บว่าดื่มตอนกี่โมง จะแต่งเวลาขึ้นมาเองไม่ได้
 */
async function migrateWaterLogs(): Promise<void> {
  const flag = await sqliteDb.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'water_migrated_v2'`,
  );
  if (flag?.value === '1') return;

  const rows = await sqliteDb.getAllAsync<{ local_date: string; ml: number; updated_at: number }>(
    `SELECT local_date, ml, updated_at FROM water_logs WHERE ml > 0`,
  );
  for (const r of rows) {
    await sqliteDb.runAsync(
      `INSERT OR IGNORE INTO water_intakes (id, local_date, ml, drank_at, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [`water_migrated_${r.local_date}`, r.local_date, r.ml, r.updated_at, r.updated_at],
    );
  }
  await sqliteDb.runAsync(
    // หารพันเพราะ drizzle mode 'timestamp' เก็บเป็น "วินาที" ไม่ใช่มิลลิวินาที
    // (sqlite-core/columns/integer.js — mapToDriverValue ทำ Math.floor(unix / 1e3))
    // ถ้าใส่ Date.now() ตรง ๆ เวลาที่อ่านกลับมาจะกลายเป็นปี 57000
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at, dirty) VALUES ('water_migrated_v2', '1', ?, 0)`,
    [Math.floor(Date.now() / 1000)],
  );
}

let migrated: Promise<void> | null = null;

/** สร้างตารางถ้ายังไม่มี + ไล่ ALTER คอลัมน์ใหม่ — เรียกครั้งเดียวตอนแอปเริ่ม ก่อน query ใด ๆ */
export function migrateDb(): Promise<void> {
  if (!migrated) {
    migrated = (async () => {
      await sqliteDb.execAsync(CREATE_TABLES);
      for (const stmt of COLUMN_MIGRATIONS) {
        try {
          await sqliteDb.execAsync(stmt);
        } catch {
          // คอลัมน์มีอยู่แล้ว (เครื่องที่เคยลงเวอร์ชันก่อนเพิ่มคอลัมน์นี้) — ข้ามได้เลย
        }
      }
      await migrateWaterLogs();
    })();
  }
  return migrated;
}
