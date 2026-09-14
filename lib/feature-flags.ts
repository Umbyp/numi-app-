/**
 * ฟีเจอร์ที่ทำเสร็จแล้วแต่ยังไม่พร้อมโชว์ผู้ใช้จริง — ปิดไว้ที่จุดเดียว เปิดกลับได้ง่ายทีหลัง
 */

// friends/community-foods/leaderboard ทำงานถูกต้องแล้ว — เปิดกลับตามที่ตัดสินใจแล้ว
export const SOCIAL_FEATURES_ENABLED = true;

// lib/notifications.ts เรียก expo-notifications จริง แต่ config plugin ถูกถอดออกจาก app.json
// ไปแล้ว (ดูเหตุผลใน AGENTS.md/ประวัติ commit) — เปิด UI นี้กลับได้ก็ต่อเมื่อใส่ plugin กลับเข้า
// app.json และตั้ง APNs key ใน developer portal เรียบร้อยแล้วเท่านั้น ไม่งั้นจะพังเงียบ ๆ
export const NOTIFICATION_REMINDERS_ENABLED = false;
