import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const sqliteDb = SQLite.openDatabaseSync('numi.db');
export const db = drizzle(sqliteDb, { schema });

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS profile (
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
  goal_weight_kg REAL
);

CREATE TABLE IF NOT EXISTS foods (
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
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  days TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_plan_completions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES workout_plans(id),
  day_index INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workout_plan_completions_plan ON workout_plan_completions(plan_id);

CREATE TABLE IF NOT EXISTS weights (
  id TEXT PRIMARY KEY,
  weight_kg REAL NOT NULL,
  body_fat_pct REAL,
  note TEXT,
  local_date TEXT NOT NULL UNIQUE,
  recorded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls TEXT,
  tool_call_id TEXT,
  card_status TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// คอลัมน์ที่เพิ่มทีหลัง CREATE_TABLES ตอนแรก — ต้องเผื่อเครื่องที่ลงแอปไปแล้วก่อนหน้านี้
// ไม่มี migration framework เพราะแอปคนเดียว ใช้วิธีลอง ALTER แล้วเมิน error "duplicate column" พอ
const COLUMN_MIGRATIONS = [`ALTER TABLE profile ADD COLUMN goal_weight_kg REAL`];

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
    })();
  }
  return migrated;
}
