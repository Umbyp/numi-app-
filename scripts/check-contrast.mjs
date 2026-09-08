/**
 * ตรวจคอนทราสต์ของคู่สีที่ใช้จริงในแอป ตามเกณฑ์ WCAG AA (ตัวอักษรปกติ 4.5)
 *
 * มีไว้เพราะเคยเจอสองบั๊กที่ตาเปล่าไม่เห็น:
 *   1. brand กับ carb เป็นสีเดียวกันเป๊ะ ทำให้แถบข้อมูลกับปุ่มแยกไม่ออก
 *   2. ตัวอักษรขาวบนปุ่มสี brand ได้แค่ 3.89 (light) และ 2.77 (dark)
 *
 * รันด้วย: npm run check:colors
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../lib/theme.ts', import.meta.url), 'utf8');

function scheme(name) {
  const m = src.match(new RegExp(`  ${name}: \\{(.*?)\\n  \\},`, 's'));
  if (!m) throw new Error(`หา scheme ${name} ไม่เจอใน lib/theme.ts`);
  const solid = Object.fromEntries([...m[1].matchAll(/(\w+): '(#[0-9A-Fa-f]{6})'/g)].map((x) => [x[1], x[2]]));
  const alpha = Object.fromEntries([...m[1].matchAll(/(\w+): '(rgba\([^']+\))'/g)].map((x) => [x[1], x[2]]));
  return { ...alpha, ...solid };
}

const luminance = (hex) => {
  const ch = (h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(hex.slice(1, 3)) + 0.7152 * ch(hex.slice(3, 5)) + 0.0722 * ch(hex.slice(5, 7));
};

/** ผสมสี rgba ทับพื้นทึบ ได้สีจริงที่ตาเห็น */
const flatten = (color, base) => {
  const m = color.replace(/\s/g, '').match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) return color;
  const [, r, g, b, a] = m;
  const mix = (f, k) => Math.round(Number(f) * Number(a) + k * (1 - Number(a)));
  const bs = [base.slice(1, 3), base.slice(3, 5), base.slice(5, 7)].map((h) => parseInt(h, 16));
  return '#' + [mix(r, bs[0]), mix(g, bs[1]), mix(b, bs[2])].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const MIN = 4.5;
let failed = 0;

for (const name of ['light', 'dark']) {
  const t = scheme(name);
  // ป้ายสีจาง ๆ พวกนี้อยู่บนพื้นการ์ดหรือแถวในการ์ด ไม่ได้อยู่บนพื้นหลังหน้าจอ
  // ผสมทับพื้นที่ให้คอนทราสต์แย่สุดในสองแบบ เพื่อไม่ให้ผ่านแบบหลอกตัวเอง
  const on = (color) => {
    const candidates = [flatten(color, t.surface), flatten(color, t.surfaceAlt)];
    return candidates.sort((a, b) => luminance(b) - luminance(a))[candidates.length - 1];
  };

  const checks = [
    ['ตัวอักษรหลักบนพื้นการ์ด', t.text, t.surface],
    ['ตัวอักษรรองบนพื้นการ์ด', t.subtext, t.surface],
    ['ตัวอักษรรองบนพื้นรอง', t.subtext, on(t.surfaceAlt)],
    ['ตัวอักษรบนปุ่ม brand', t.onBrand, t.brand],
    ['brand เป็นตัวอักษรบนการ์ด', t.brand, t.surface],
    ['carbText บน carbBg', t.carbText, on(t.carbBg)],
    ['proteinText บน proteinBg', t.proteinText, on(t.proteinBg)],
    ['fatText บน fatBg', t.fatText, on(t.fatBg)],
    ['ตัวอักษรหลักบน brandTint', t.text, on(t.brandTint)],
  ];

  console.log(`\n── ${name} ──`);
  for (const [label, fg, bg] of checks) {
    const r = ratio(fg, bg);
    const ok = r >= MIN;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ผ่าน' : 'ตก  '}  ${r.toFixed(2).padStart(5)}  ${label}`);
  }

  // brand ต้องไม่ซ้ำกับสีที่ใช้แทนข้อมูล ไม่งั้นแยกไม่ออกว่าอะไรกดได้
  for (const key of ['protein', 'carb', 'fat', 'dinner']) {
    if (t[key] === t.brand) {
      console.log(`  ตก        ${key} เป็นสีเดียวกับ brand (${t.brand})`);
      failed++;
    }
  }
  // สามมาโครต้องแยกกันได้ในกราฟเดียว
  if (new Set([t.protein, t.carb, t.fat]).size !== 3) {
    console.log('  ตก        สีมาโครซ้ำกัน');
    failed++;
  }
}

console.log(failed === 0 ? '\nผ่านทั้งหมด' : `\nไม่ผ่าน ${failed} รายการ`);
process.exit(failed === 0 ? 0 : 1);
