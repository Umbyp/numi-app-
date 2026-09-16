import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * ไม่มี DSN (เช่นตอน dev บนเครื่อง) ก็แค่ปิดไป — เรียก captureException ที่ไหนก็ไม่พังเพราะ Sentry.init
 * เช็ค enabled เองก่อนทำอะไรจริง ไม่ต้องมี if (dsn) คลุมทุกจุดที่เรียกใช้
 */
Sentry.init({
  dsn,
  enabled: !!dsn,
  // debug: __DEV__ อย่างเดียวทำให้ตอนไม่มี DSN (dev บนเครื่องส่วนใหญ่) ทุกครั้งที่ captureException
  // ถูกเรียก Sentry จะ console.error("Transport disabled") ออกมาเอง กลายเป็นจอแดง LogBox ซ้อนทับ
  // error จริงที่ต้องการรายงาน ทำให้ดูเหมือนมี 2 บั๊กทั้งที่มีอันเดียว
  debug: __DEV__ && !!dsn,
  tracesSampleRate: 0.2,
});

export { Sentry };
