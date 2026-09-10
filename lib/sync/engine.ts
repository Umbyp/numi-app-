import { supabase } from '../auth/client';
import { sqliteDb } from '../db/client';
import { SYNC_TABLES, type SyncTableConfig } from './config';

function onConflictFor(cfg: SyncTableConfig): string {
  if (cfg.localKey === 'singleton') return 'user_id';
  if (cfg.localKey === 'key') return 'user_id,key';
  return 'user_id,id';
}

function localMatchColumn(cfg: SyncTableConfig): string {
  return cfg.localKey === 'key' ? 'key' : 'id';
}

/** แถวที่ dirty=1 (ยังไม่ push) ทั้งหมดของตารางนี้ ส่งขึ้นเซิร์ฟเวอร์แบบ upsert */
async function pushTable(cfg: SyncTableConfig, userId: string): Promise<void> {
  const where = `dirty = 1${cfg.extraWhere ? ` AND ${cfg.extraWhere}` : ''}`;
  const dirtyRows = await sqliteDb.getAllAsync<Record<string, any>>(`SELECT * FROM ${cfg.table} WHERE ${where}`);
  if (dirtyRows.length === 0) return;

  const payload = dirtyRows.map((row) => {
    const clean: Record<string, any> = { ...row, user_id: userId };
    delete clean.dirty;
    for (const col of cfg.pushExclude ?? []) delete clean[col];
    for (const col of cfg.jsonCols ?? []) {
      if (clean[col] != null) clean[col] = JSON.parse(clean[col]);
    }
    for (const col of cfg.boolCols ?? []) {
      if (clean[col] != null) clean[col] = !!clean[col];
    }
    return clean;
  });

  const { data, error } = await supabase.from(cfg.table).upsert(payload, { onConflict: onConflictFor(cfg) }).select();
  if (error) throw new Error(`push ${cfg.table}: ${error.message}`);

  const matchCol = localMatchColumn(cfg);
  for (const serverRow of data ?? []) {
    const matchVal = cfg.localKey === 'singleton' ? 1 : serverRow[matchCol];
    await sqliteDb.runAsync(`UPDATE ${cfg.table} SET dirty = 0, server_updated_at = ? WHERE ${matchCol === 'key' ? 'key' : 'id'} = ?`, [
      serverRow.server_updated_at,
      matchVal,
    ]);
  }
}

/** ดึงแถวที่เซิร์ฟเวอร์อัปเดตหลัง cursor เดิม — เขียนทับ local ยกเว้นแถวที่ dirty=1 (มีของ local รอ push อยู่) */
async function pullTable(cfg: SyncTableConfig, userId: string): Promise<void> {
  const cursorRow = await sqliteDb.getFirstAsync<{ last_pulled_at: number }>(
    `SELECT last_pulled_at FROM sync_meta WHERE table_name = ?`,
    [cfg.table]
  );
  const cursor = cursorRow?.last_pulled_at ?? 0;

  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('user_id', userId)
    .gt('server_updated_at', cursor)
    .order('server_updated_at', { ascending: true });
  if (error) throw new Error(`pull ${cfg.table}: ${error.message}`);
  if (!data || data.length === 0) return;

  const matchCol = localMatchColumn(cfg);
  let maxSeen = cursor;

  for (const serverRow of data) {
    if (serverRow.server_updated_at > maxSeen) maxSeen = serverRow.server_updated_at;

    const matchVal = cfg.localKey === 'singleton' ? 1 : serverRow[matchCol];
    const existing = await sqliteDb.getFirstAsync<{ dirty: number }>(
      `SELECT dirty FROM ${cfg.table} WHERE ${cfg.localKey === 'singleton' ? 'id' : matchCol} = ?`,
      [matchVal]
    );
    // local แก้ค้างอยู่ยังไม่ได้ push — เก็บของ local ไว้ก่อน รอบ push ถัดไปจะทับเซิร์ฟเวอร์เอง
    if (existing?.dirty === 1) continue;

    const row: Record<string, any> = { ...serverRow, dirty: 0 };
    if (cfg.localKey === 'singleton') row.id = 1;
    for (const col of cfg.jsonCols ?? []) {
      if (row[col] != null) row[col] = JSON.stringify(row[col]);
    }
    for (const col of cfg.boolCols ?? []) {
      if (row[col] != null) row[col] = row[col] ? 1 : 0;
    }

    const cols = Object.keys(row);
    await sqliteDb.runAsync(
      `INSERT OR REPLACE INTO ${cfg.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map((c) => row[c])
    );
  }

  await sqliteDb.runAsync(
    `INSERT INTO sync_meta (table_name, last_pulled_at) VALUES (?, ?)
     ON CONFLICT(table_name) DO UPDATE SET last_pulled_at = excluded.last_pulled_at`,
    [cfg.table, maxSeen]
  );
}

export interface SyncResult {
  ok: boolean;
  error?: string;
}

let syncing: Promise<SyncResult> | null = null;

/** push ทุกตารางก่อนเสมอ (ลดโอกาสของ local โดนทับ) แล้วค่อย pull — ดู docs/sync-design.md ข้อ 6 */
export async function syncAll(): Promise<SyncResult> {
  if (syncing) return syncing; // กันยิงซ้อนกันถ้าเรียกถี่ (เช่น กด sync ปุ่มรัว ๆ)
  syncing = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' };
    const userId = session.user.id;

    try {
      for (const cfg of SYNC_TABLES) await pushTable(cfg, userId);
      for (const cfg of SYNC_TABLES) await pullTable(cfg, userId);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  })();
  try {
    return await syncing;
  } finally {
    syncing = null;
  }
}
