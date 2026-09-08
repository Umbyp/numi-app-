import { localDateString } from './nutrition';
import type { MuscleGroup } from './met';
import type { WorkoutPlanDay } from './db/schema';

/** จำนวนวันติดกันที่ออกกำลังกาย นับถึงวันนี้ — ถ้าวันนี้ยังไม่ได้ทำ ให้เริ่มนับจากเมื่อวานแทน (ไม่ตัดสตรีคก่อนวันจะจบ) */
export function calcStreak(workoutDates: Set<string>): number {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!workoutDates.has(localDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (workoutDates.has(localDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calcWeekCompletionCount(workoutDates: Set<string>, weekDates: string[]): number {
  return weekDates.filter((d) => workoutDates.has(d)).length;
}

/** รวมจำนวนครั้งที่ฝึกแต่ละกลุ่มกล้ามเนื้อ จาก completion ในช่วงที่กำหนด — ข้ามแผนที่ถูกลบไปแล้วเงียบ ๆ */
export function calcMuscleBalance(
  completions: { planId: string; dayIndex: number }[],
  plans: { id: string; days: WorkoutPlanDay[] }[]
): Partial<Record<MuscleGroup, number>> {
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const counts: Partial<Record<MuscleGroup, number>> = {};
  for (const comp of completions) {
    const day = planMap.get(comp.planId)?.days[comp.dayIndex];
    if (!day) continue;
    for (const ex of day.exercises) {
      if (!ex.muscleGroup) continue;
      counts[ex.muscleGroup] = (counts[ex.muscleGroup] ?? 0) + 1;
    }
  }
  return counts;
}
