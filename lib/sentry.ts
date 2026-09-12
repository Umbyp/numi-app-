import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * ไม่มี DSN (เช่นตอน dev บนเครื่อง) ก็แค่ปิดไป — เรียก captureException ที่ไหนก็ไม่พังเพราะ Sentry.init
 * เช็ค enabled เองก่อนทำอะไรจริง ไม่ต้องมี if (dsn) คลุมทุกจุดที่เรียกใช้
 */
Sentry.init({
  dsn,
  enabled: !!dsn,
  debug: __DEV__,
  tracesSampleRate: 0.2,
});

export { Sentry };
