// "กล่องรับฝาก" รูปที่ถ่าย/เลือกจากหน้าอื่น (เช่น quick-add sheet) ก่อนเด้งเข้าหน้าแชท
// ไม่ส่งผ่าน router params เพราะ base64 data URL ยาวเกินไปสำหรับ URL params
let pendingImage: string | null = null;

export function setPendingImage(dataUrl: string) {
  pendingImage = dataUrl;
}

export function takePendingImage(): string | null {
  const v = pendingImage;
  pendingImage = null;
  return v;
}
