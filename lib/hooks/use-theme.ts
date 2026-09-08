import { useColorScheme } from 'react-native';
import { colors, type Scheme } from '../theme';
import { useNumiStore } from '../store';

/** รวม system scheme กับธีมที่ผู้ใช้เลือกเอง (ถ้าไม่ใช่ 'system') */
export function useScheme(): Scheme {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const pref = useNumiStore((s) => s.themePreference);
  return pref === 'system' ? systemScheme : pref;
}

export function useTheme() {
  const scheme = useScheme();
  return colors[scheme];
}
