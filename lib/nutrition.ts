// สูตรคำนวณโภชนาการทั้งหมด — pure function ล้วน ไม่แตะ DB เพื่อให้ unit test ได้ง่าย

export type Sex = 'male' | 'female';

export interface Food {
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** หมวด BMI ตามเกณฑ์ WHO ทั่วไป */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'ต่ำกว่าเกณฑ์';
  if (bmi < 23) return 'ปกติ';
  if (bmi < 25) return 'ท้ายช่วงปกติ';
  if (bmi < 30) return 'เกินมาตรฐาน';
  return 'อ้วน';
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
 * แคลอรี่ "ที่ควรได้รับ" วันนี้ = เป้าหมาย − อาหารที่กิน + กิจกรรมที่เผา
 * ปล่อยให้ติดลบได้ (กินเกินเยอะ) ไม่ clamp ตรงนี้ — clamp เฉพาะตอนวาดวงแหวน
 */
export function calcNetRemaining(p: { targetKcal: number; consumedKcal: number; activityKcal: number }): number {
  return p.targetKcal - p.consumedKcal + p.activityKcal;
}

/** สัดส่วนที่วงแหวนควรเติม: อาหารที่กินไปแล้วเทียบกับโควตารวมของวันนี้ (เป้าหมาย + กิจกรรม) */
export function calcRingFraction(p: { targetKcal: number; consumedKcal: number; activityKcal: number }): number {
  const allowance = p.targetKcal + p.activityKcal;
  if (allowance <= 0) return 0;
  return Math.min(1, Math.max(0, p.consumedKcal / allowance));
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

export interface WeightProgress {
  direction: 'lose' | 'gain' | 'maintain';
  remainingKg: number;
  progressPct: number;
  reachedGoal: boolean;
}

/**
 * ความคืบหน้าไปสู่เป้าหมายน้ำหนัก เทียบจากน้ำหนักตอนเริ่มบันทึกครั้งแรกถึงปัจจุบัน
 * สูตร (start-current)/(start-goal) ใช้ได้ทั้งสองทิศทาง (ลด/เพิ่ม) เพราะเครื่องหมายจะกลับพร้อมกันเอง
 */
export function calcWeightProgress(p: { startKg: number; currentKg: number; goalKg: number }): WeightProgress {
  const totalDelta = p.startKg - p.goalKg;
  const direction = totalDelta > 0 ? 'lose' : totalDelta < 0 ? 'gain' : 'maintain';
  const remainingKg = Math.abs(p.currentKg - p.goalKg);
  const progressPct = totalDelta === 0 ? 100 : Math.min(100, Math.max(0, ((p.startKg - p.currentKg) / totalDelta) * 100));
  const reachedGoal =
    direction === 'lose' ? p.currentKg <= p.goalKg : direction === 'gain' ? p.currentKg >= p.goalKg : remainingKg < 0.1;
  return { direction, remainingKg, progressPct, reachedGoal };
}

export function localDateString(d = new Date()): string {
  const tz = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(tz).toISOString().slice(0, 10);
}
