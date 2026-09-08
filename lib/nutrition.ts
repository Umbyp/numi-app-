// สูตรคำนวณโภชนาการทั้งหมด — pure function ล้วน ไม่แตะ DB เพื่อให้ unit test ได้ง่าย

export type Sex = 'male' | 'female';

export interface Food {
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
}

/** Mifflin-St Jeor — แม่นกว่า Harris-Benedict สำหรับคนยุคปัจจุบัน */
export function calcBMR(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'นั่งทำงานเป็นหลัก แทบไม่ออกกำลังกาย' },
  { value: 1.375, label: 'ออกกำลังกายเบา 1-3 วัน/สัปดาห์' },
  { value: 1.55, label: 'ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์' },
  { value: 1.725, label: 'ออกกำลังกายหนัก 6-7 วัน/สัปดาห์' },
  { value: 1.9, label: 'ใช้แรงงานหนัก หรือซ้อมวันละ 2 รอบ' },
] as const;

export function calcTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}

/**
 * เป้าหมายแคลอรี่ต่อวัน
 * 1 kg ไขมัน ≈ 7700 kcal → ลด 0.5 kg/สัปดาห์ = ขาดวันละ ~550 kcal
 * ปัดขึ้นให้ถึงพื้นขั้นต่ำเสมอ เพราะการกินต่ำกว่านี้เสี่ยงขาดสารอาหาร
 */
export function calcCalorieTarget(p: {
  tdee: number;
  weeklyRateKg: number;
  sex: Sex;
}): { target: number; clamped: boolean; floor: number } {
  const raw = p.tdee + (p.weeklyRateKg * 7700) / 7;
  const floor = p.sex === 'male' ? 1500 : 1200;
  const clamped = raw < floor;
  return { target: Math.round(clamped ? floor : raw), clamped, floor };
}

/** อัตราลดน้ำหนักที่ปลอดภัย: ไม่เกิน 1% ของน้ำหนักตัวต่อสัปดาห์ */
export function maxSafeWeeklyLoss(weightKg: number): number {
  return Math.min(1.0, weightKg * 0.01);
}

/** โปรตีน 4 kcal/g, คาร์บ 4, ไขมัน 9 */
export function calcMacroTargets(
  kcal: number,
  pct: { protein: number; carb: number; fat: number }
) {
  return {
    proteinG: Math.round((kcal * pct.protein) / 4),
    carbG: Math.round((kcal * pct.carb) / 4),
    fatG: Math.round((kcal * pct.fat) / 9),
  };
}

/** สเกลค่าโภชนาการจากต่อ-100g เป็นปริมาณจริง */
export function scaleFood(food: Food, amountG: number) {
  const f = amountG / 100;
  return {
    kcal: food.kcalPer100 * f,
    proteinG: food.proteinPer100 * f,
    carbG: food.carbPer100 * f,
    fatG: food.fatPer100 * f,
  };
}

/**
 * แคลอรี่ที่เผาจากการออกกำลังกาย
 * kcal = MET × 3.5 × น้ำหนัก(kg) / 200 × นาที
 */
export function calcKcalBurned(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

/**
 * ค่าเฉลี่ยเคลื่อนที่ของน้ำหนัก — น้ำหนักรายวันแกว่งจากน้ำในร่างกาย
 * ±1-2 kg ได้ง่าย ๆ ดูค่าเฉลี่ย 7 วันจะเห็นเทรนด์จริง
 */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export interface SeriesPoint {
  date: string;
  /** ค่าที่บันทึกจริงในวันนั้น — null คือวันที่ไม่ได้บันทึก */
  raw: number | null;
  /** ค่าที่เติมต่อจากวันก่อนหน้าแล้ว ใช้คำนวณค่าเฉลี่ยเคลื่อนที่ */
  filled: number | null;
}

/**
 * แปลงค่าที่บันทึกเป็นราย ๆ ให้เป็นซีรีส์รายวันเต็มช่วง
 * คนไม่ได้ชั่งน้ำหนักทุกวัน แต่ค่าเฉลี่ย 7 วันต้องคิดบนแกนวัน ไม่ใช่แกนจำนวนครั้งที่ชั่ง
 * ไม่งั้นคนที่ชั่งอาทิตย์ละครั้งจะได้ "ค่าเฉลี่ย 7 วัน" ที่กินเวลาจริงเกือบสองเดือน
 */
export function dailySeries(
  dates: string[],
  byDate: Record<string, number>
): SeriesPoint[] {
  let last: number | null = null;
  return dates.map((date) => {
    const raw = date in byDate ? byDate[date] : null;
    if (raw !== null) last = raw;
    return { date, raw, filled: last };
  });
}

/** ค่าเฉลี่ยเคลื่อนที่ของซีรีส์รายวัน — คืน null ในวันที่ยังไม่มีข้อมูลตั้งต้น */
export function seriesMovingAverage(series: SeriesPoint[], window = 7): (number | null)[] {
  const first = series.findIndex((p) => p.filled !== null);
  if (first < 0) return series.map(() => null);
  const filled = series.slice(first).map((p) => p.filled as number);
  const avg = movingAverage(filled, window);
  return [...series.slice(0, first).map(() => null), ...avg];
}

export function localDateString(d = new Date()): string {
  const tz = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(tz).toISOString().slice(0, 10);
}
