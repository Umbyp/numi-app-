// Token สีแยกไฟล์ — ห้าม hardcode สีในคอมโพเนนต์ เพราะแอปนี้ถูกเปิดตอนกลางคืนบ่อย
export const colors = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    subtext: '#64748b',
    border: '#e2e8f0',
    primary: '#16a34a',
    ringTrack: '#e2e8f0',
    ringActive: '#16a34a',
    ringOver: '#94a3b8', // เกินเป้าใช้เทา ไม่ใช้แดง — สีแดงทำให้รู้สึกผิดแล้วเลี่ยงการบันทึก
    protein: '#f59e0b',
    carb: '#3b82f6',
    fat: '#ec4899',
    danger: '#ef4444',
    ghostBg: '#f1f5f9',
  },
  dark: {
    bg: '#0b1220',
    card: '#141b2d',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    border: '#1f2937',
    primary: '#22c55e',
    ringTrack: '#1f2937',
    ringActive: '#22c55e',
    ringOver: '#64748b',
    protein: '#fbbf24',
    carb: '#60a5fa',
    fat: '#f472b6',
    danger: '#f87171',
    ghostBg: '#1e293b',
  },
} as const;

export type ThemeColors = typeof colors.light;
