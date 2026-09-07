// จับคู่ชื่ออาหาร (ไทย) กับอีโมจิตามหมวด — เดาจากคำในชื่อ ไม่ใช่ข้อมูลที่แม่นยำ 100%
// เรียงจากหมวดที่เจาะจงที่สุดก่อน กันคำที่ทับซ้อนกัน (เช่น "ข้าวต้ม" ควรเป็นโจ๊ก/ซุป ไม่ใช่ข้าว)
// ใช้แค่ตกแต่งให้เห็นภาพเร็วขึ้น คลาดเคลื่อนบ้างไม่เป็นไร เหมือน MET_TABLE

interface FoodIconRule {
  emoji: string;
  keywords: string[];
}

const FOOD_ICON_RULES: FoodIconRule[] = [
  { emoji: '🍳', keywords: ['ไข่'] },
  { emoji: '🍜', keywords: ['ก๋วยเตี๋ยว', 'ผัดไทย', 'ผัดซีอิ๊ว', 'ข้าวซอย', 'บะหมี่', 'เส้น'] },
  { emoji: '🍛', keywords: ['แกง'] },
  { emoji: '🍲', keywords: ['ต้ม', 'ซุป'] },
  { emoji: '🥗', keywords: ['ส้มตำ', 'ยำ', 'ลาบ', 'สลัด'] },
  { emoji: '🍚', keywords: ['ข้าว'] },
  { emoji: '🍤', keywords: ['กุ้ง', 'ปลา', 'หมึก', 'ปู'] },
  { emoji: '🍗', keywords: ['ย่าง', 'ปิ้ง', 'ทอด', 'สะเต๊ะ', 'หมู', 'ไก่', 'เนื้อ'] },
  { emoji: '🍎', keywords: ['มะม่วง', 'กล้วย', 'สับปะรด', 'ผลไม้', 'ส้ม', 'แอปเปิ้ล'] },
  { emoji: '🍰', keywords: ['ขนม', 'ปาท่องโก๋', 'เค้ก', 'ไอศกรีม'] },
  { emoji: '☕', keywords: ['กาแฟ', 'ชา', 'อเมริกาโน่'] },
  { emoji: '🥤', keywords: ['น้ำ', 'นม'] },
];

const FALLBACK_EMOJI = '🍽️';

export function getFoodEmoji(name: string): string {
  const rule = FOOD_ICON_RULES.find((r) => r.keywords.some((k) => name.includes(k)));
  return rule?.emoji ?? FALLBACK_EMOJI;
}
