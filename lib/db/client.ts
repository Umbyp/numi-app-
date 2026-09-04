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
  add_exercise_kcal INTEGER NOT NULL DEFAULT 0
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
`;

let migrated: Promise<void> | null = null;

/** สร้างตารางถ้ายังไม่มี — เรียกครั้งเดียวตอนแอปเริ่ม ก่อน query ใด ๆ */
export function migrateDb(): Promise<void> {
  if (!migrated) {
    migrated = sqliteDb.execAsync(CREATE_TABLES);
  }
  return migrated;
}
