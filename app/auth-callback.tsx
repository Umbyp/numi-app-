import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/hooks/use-theme';
import { supabase } from '../lib/auth/client';

/**
 * ปลายทางร่วมของลิงก์ที่พาเข้าแอปจากนอกแอป (numi://auth-callback)
 *
 * ใช้ 2 ทาง: (1) Google Sign-In — แต่ทางนั้น expo-web-browser ดักลิงก์ไว้เองผ่าน
 * ephemeral session ก่อนจะถึงที่นี่อยู่แล้ว ไม่เคย mount จริง (2) ลิงก์รีเซ็ตรหัสผ่านจากอีเมล —
 * ทางนี้เป็นการเปิดแอปจากนอกจริง ๆ เลยต้องมี route จริงมารับ แล้วเช็ค type=recovery เอง
 */
export default function AuthCallbackScreen() {
  const c = useTheme();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      const fragment = url?.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      router.replace(type === 'recovery' ? '/reset-password' : '/sync-account');
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.brand} />
    </View>
  );
}
