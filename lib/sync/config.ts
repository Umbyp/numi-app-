/**
 * นิยาม table ที่ sync ได้ทั้งหมด — ต้องตรงกับทั้ง lib/db/schema.ts (client) และ
 * schema บน numi-api (server, ~/NaselerProject/numi/db/init/02_schema.sql) เป๊ะทุกชื่อคอลัมน์
 *
 * ลำดับใน SYNC_TABLES คือลำดับ push จริง — ต้อง push ตารางที่ถูกอ้างอิง (foods, workouts,
 * workout_plans) ก่อนตารางที่มี foreign key ชี้ไป (meal_entries, workout_plan_completions)
 * ไม่งั้น insert จะโดน FK constraint ปฏิเสธที่ฝั่งเซิร์ฟเวอร์
 */
export interface SyncTableConfig {
  /** ชื่อตารางทั้งฝั่ง local sqlite และฝั่ง PostgREST (เหมือนกันเป๊ะทุกตาราง) */
  table: string;
  /**
   * คอลัมน์ที่ local เก็บเป็น TEXT (JSON string จาก drizzle mode:'json') แต่ฝั่งเซิร์ฟเวอร์เป็น jsonb
   * ต้อง JSON.parse ก่อน push (ไม่งั้นเซิร์ฟเวอร์จะได้ jsonb ที่เป็น string ซ้อน ไม่ใช่ array/object จริง)
   * และ JSON.stringify กลับตอน pull ก่อนเขียนลง local TEXT column
   */
  jsonCols?: string[];
  /**
   * คอลัมน์ boolean — local เก็บเป็น 0/1 (SQLite ไม่มี boolean จริง) แต่ Postgres คอลัมน์เป็น boolean
   * ต้องแปลงเป็น true/false ก่อน push และแปลงกลับเป็น 0/1 ตอน pull
   */
  boolCols?: string[];
  /**
   * คีย์ local ที่ใช้ match แถวตอน pull (ส่วนใหญ่คือ 'id' — profile/app_settings ไม่มี 'id'
   * ที่ตรงกับเซิร์ฟเวอร์ตรงๆ เพราะ server เก็บแค่แถวเดียวต่อ user_id/key)
   */
  localKey: 'id' | 'key' | 'singleton';
  /** คอลัมน์ที่มีอยู่ใน local แต่ไม่ต้องส่งขึ้นเซิร์ฟเวอร์ (server ไม่มีคอลัมน์นี้) */
  pushExclude?: string[];
  /**
   * เงื่อนไข SQL เพิ่มเติมตอนเลือกแถว dirty มา push — ใช้กรองแถวที่ "dirty แต่ไม่ควร sync"
   * ออกไปตั้งแต่ต้นทาง เพราะถ้าส่งไปแล้วโดน CHECK constraint ฝั่งเซิร์ฟเวอร์ปฏิเสธ
   * แถวอื่นในคำขอเดียวกัน (multi-row upsert) จะพังไปด้วยทั้งชุด
   */
  extraWhere?: string;
}

export const SYNC_TABLES: SyncTableConfig[] = [
  { table: 'profile', localKey: 'singleton', pushExclude: ['id'], boolCols: ['add_exercise_kcal', 'prioritize_muscle'] },
  // allowlist ตาม docs/sync-design.md ข้อ 5 — server บังคับด้วย CHECK ซ้ำอยู่แล้ว แต่ต้องกรองตั้งแต่
  // ฝั่ง client ก่อนส่ง ไม่งั้น key อย่าง theme/celebrated_date ที่ dirty=1 ตั้งต้นจะทำให้ batch push พังทั้งชุด
  { table: 'app_settings', localKey: 'key', extraWhere: "key LIKE 'reminder\\_%' ESCAPE '\\'" },
  // source='seed' ไม่ sync — ทุกเครื่อง seed ชุดเดียวกันจาก data/foods-th.json อยู่แล้วเอง (ดูหมายเหตุใน
  // schema ฝั่งเซิร์ฟเวอร์ ข้อ 5 ที่ปล่อยให้ตัดสินใจตอนเขียน push logic นี้)
  { table: 'foods', localKey: 'id', jsonCols: ['serving_units'], extraWhere: "source != 'seed'" },
  { table: 'workouts', localKey: 'id', jsonCols: ['sets'] },
  { table: 'workout_plans', localKey: 'id', jsonCols: ['days'] },
  { table: 'weights', localKey: 'id' },
  { table: 'measurements', localKey: 'id' },
  { table: 'meal_templates', localKey: 'id', jsonCols: ['items'] },
  { table: 'water_intakes', localKey: 'id' },
  { table: 'chat_messages', localKey: 'id', jsonCols: ['tool_calls'] },
  { table: 'meal_entries', localKey: 'id', boolCols: ['estimated'] }, // ต้องมาหลัง foods (FK)
  { table: 'workout_plan_completions', localKey: 'id' }, // ต้องมาหลัง workout_plans + workouts (FK)
];

/**
 * app_settings key ที่ sync ได้ — allowlist ตายตัวตาม docs/sync-design.md ข้อ 5
 * (server บังคับด้วย CHECK constraint อยู่แล้ว แต่เช็คซ้ำฝั่ง client กัน request เปล่าประโยชน์)
 */
export function isSyncableSettingKey(key: string): boolean {
  return key.startsWith('reminder_');
}
