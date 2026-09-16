export interface HealthProfile {
  /** แพ้อาหาร/มังสวิรัติ/ฮาลาล/ไม่กินเผ็ด ฯลฯ — ข้อความอิสระเพราะรูปแบบหลากหลายเกินจะทำเป็น tag ตายตัว */
  dietaryRestrictions: string;
  /** โรคประจำตัว, ยาที่กินอยู่, ตั้งครรภ์/ให้นมบุตร ฯลฯ — ให้ AI ใช้เพื่อ "ระวัง" ไม่ใช่เพื่อวินิจฉัยหรือรักษา */
  medicalConditions: string;
}

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  dietaryRestrictions: '',
  medicalConditions: '',
};

export function isHealthProfile(value: unknown): value is HealthProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<HealthProfile>;
  return typeof p.dietaryRestrictions === 'string' && typeof p.medicalConditions === 'string';
}
