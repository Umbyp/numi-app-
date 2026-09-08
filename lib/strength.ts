// สถิติการเล่นเวท — pure function ล้วน ไม่แตะ DB เพื่อให้เขียนเทสได้โดยไม่ต้อง mock
// ใช้ชนิดข้อมูลแบบโครงสร้าง ไม่ import จาก schema เพื่อไม่ให้ผูกกับ drizzle

export interface SetEntry {
  kg: number;
  reps: number;
}

export interface ExerciseEntry {
  exercise: string;
  sets: SetEntry[];
}

export interface SessionLike {
  id: string;
  localDate: string;
  sets: ExerciseEntry[] | null;
}

/**
 * เกินจำนวนนี้สูตรประมาณ 1RM จะเริ่มเพี้ยนมาก
 * เพราะความอึดมีผลมากกว่าความแข็งแรงสูงสุด
 */
export const RELIABLE_REPS = 12;

/**
 * ประมาณน้ำหนักสูงสุดที่ยกได้ 1 ครั้ง ด้วยสูตร Epley
 * 1RM = น้ำหนัก × (1 + จำนวนครั้ง / 30)
 *
 * สูตรนี้นิยามไว้สำหรับ 2 ครั้งขึ้นไป ถ้าแทน 1 ครั้งลงไปตรง ๆ จะได้ 1.033 เท่าของ
 * น้ำหนักที่ยกจริง ซึ่งไม่สมเหตุสมผล เพราะยกได้ 1 ครั้งก็คือ 1RM อยู่แล้ว จึงคืนค่าตรง ๆ
 */
export function epley1RM(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

/** ค่าประมาณ 1RM เชื่อถือได้แค่ไหน ใช้ตัดสินว่าจะแสดงหรือเตือน */
export function is1RMReliable(reps: number): boolean {
  return reps > 0 && reps <= RELIABLE_REPS;
}

export function exerciseVolume(sets: SetEntry[]): number {
  return sets.reduce((s, x) => s + x.kg * x.reps, 0);
}

export function sessionVolume(entries: ExerciseEntry[] | null): number {
  if (!entries) return 0;
  return entries.reduce((s, e) => s + exerciseVolume(e.sets), 0);
}

/** เซ็ตที่ให้ค่า 1RM ประมาณสูงสุดในกลุ่ม — ไม่ใช่เซ็ตที่หนักที่สุดเสมอไป */
export function bestSetBy1RM(sets: SetEntry[]): { set: SetEntry; oneRm: number } | null {
  let best: { set: SetEntry; oneRm: number } | null = null;
  for (const s of sets) {
    const oneRm = epley1RM(s.kg, s.reps);
    if (oneRm > 0 && (!best || oneRm > best.oneRm)) best = { set: s, oneRm };
  }
  return best;
}

export interface ExerciseRecord {
  exercise: string;
  /** น้ำหนักมากที่สุดที่เคยยกได้ อย่างน้อย 1 ครั้ง */
  bestWeightKg: number;
  /** 1RM ประมาณที่ดีที่สุด */
  best1RM: number;
  /** ยอดยกรวมของท่านี้ในเซสชันเดียวที่มากที่สุด */
  bestSessionVolume: number;
  sessionCount: number;
  totalSets: number;
  lastDate: string;
}

/** รวมสถิติของแต่ละท่าจากประวัติทั้งหมด เรียงจากท่าที่เล่นล่าสุด */
export function buildRecords(sessions: SessionLike[]): ExerciseRecord[] {
  const map = new Map<string, ExerciseRecord>();

  for (const session of sessions) {
    for (const entry of session.sets ?? []) {
      const name = entry.exercise.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const volume = exerciseVolume(entry.sets);
      const best = bestSetBy1RM(entry.sets);
      const heaviest = entry.sets.reduce((m, s) => (s.reps > 0 && s.kg > m ? s.kg : m), 0);

      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          exercise: name,
          bestWeightKg: heaviest,
          best1RM: best?.oneRm ?? 0,
          bestSessionVolume: volume,
          sessionCount: 1,
          totalSets: entry.sets.length,
          lastDate: session.localDate,
        });
        continue;
      }
      prev.bestWeightKg = Math.max(prev.bestWeightKg, heaviest);
      prev.best1RM = Math.max(prev.best1RM, best?.oneRm ?? 0);
      prev.bestSessionVolume = Math.max(prev.bestSessionVolume, volume);
      prev.sessionCount += 1;
      prev.totalSets += entry.sets.length;
      // sessions เรียงจากใหม่ไปเก่า วันแรกที่เจอจึงเป็นวันล่าสุดอยู่แล้ว
      if (session.localDate > prev.lastDate) prev.lastDate = session.localDate;
    }
  }

  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export type RecordKind = 'weight' | 'oneRm' | 'volume';

export interface NewRecord {
  exercise: string;
  kind: RecordKind;
  value: number;
  /** ค่าเดิมก่อนหน้านี้ — 0 แปลว่าเป็นครั้งแรกที่เล่นท่านี้ */
  previous: number;
}

/**
 * หาว่าเซสชันนี้ทำสถิติใหม่ท่าไหนบ้าง เทียบกับประวัติที่ "ไม่รวมเซสชันนี้"
 * ต้องดีขึ้นจริงเกิน 0.1 ถึงจะนับ กันไม่ให้เศษทศนิยมจากสูตร 1RM กลายเป็นสถิติใหม่
 */
export function findNewRecords(
  entries: ExerciseEntry[],
  history: SessionLike[]
): NewRecord[] {
  const before = new Map(buildRecords(history).map((r) => [r.exercise.toLowerCase(), r]));
  const out: NewRecord[] = [];

  for (const entry of entries) {
    const name = entry.exercise.trim();
    if (!name || entry.sets.length === 0) continue;
    const prev = before.get(name.toLowerCase());

    const heaviest = entry.sets.reduce((m, s) => (s.reps > 0 && s.kg > m ? s.kg : m), 0);
    const best = bestSetBy1RM(entry.sets);
    const volume = exerciseVolume(entry.sets);

    const checks: [RecordKind, number, number][] = [
      ['weight', heaviest, prev?.bestWeightKg ?? 0],
      ['oneRm', best?.oneRm ?? 0, prev?.best1RM ?? 0],
      ['volume', volume, prev?.bestSessionVolume ?? 0],
    ];

    for (const [kind, value, previous] of checks) {
      if (value > 0 && value > previous + 0.1) {
        out.push({ exercise: name, kind, value, previous });
      }
    }
  }

  return out;
}

export const RECORD_LABELS: Record<RecordKind, string> = {
  weight: 'น้ำหนักสูงสุด',
  oneRm: '1RM ประมาณ',
  volume: 'ยอดยกรวมต่อเซสชัน',
};
