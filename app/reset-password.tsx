import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/hooks/use-theme';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { useScheme } from '../lib/hooks/use-theme';
import { Squish } from '../components/squish';
import { supabase } from '../lib/auth/client';
import { getErrorMessage } from '../lib/errors';

export default function ResetPasswordScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (password.length < 6) {
      setError('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านสองช่องไม่ตรงกัน');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      Alert.alert('ตั้งรหัสผ่านใหม่สำเร็จ', 'เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย');
      router.replace('/sync-account');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.scroll}>
          <Text style={[textType.cardTitle, { color: c.text, fontSize: 18 }]}>ตั้งรหัสผ่านใหม่</Text>
          <Text style={[textType.label, { color: c.subtext, fontSize: 12.5, marginTop: 4, marginBottom: 18 }]}>
            ใส่รหัสผ่านใหม่ที่อยากใช้แทนตัวเดิม
          </Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              placeholderTextColor={c.faint}
              autoCapitalize="none"
              secureTextEntry
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(500) }]}
            />
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="ยืนยันรหัสผ่านใหม่"
              placeholderTextColor={c.faint}
              autoCapitalize="none"
              secureTextEntry
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(500) }]}
            />
            {error && (
              <View style={[styles.errorBox, { backgroundColor: c.dangerBg }]}>
                <Text style={[textType.label, { color: c.danger, fontSize: 12.5 }]}>{error}</Text>
              </View>
            )}
            <Squish
              style={[styles.primaryButton, { backgroundColor: c.brand, marginTop: error ? 10 : 14 }]}
              onPress={handleSubmit}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>บันทึกรหัสผ่านใหม่</Text>}
            </Squish>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14 },
  errorBox: { borderRadius: radius.iconBox, padding: 10 },
  primaryButton: { borderRadius: radius.iconBox, paddingVertical: 14, alignItems: 'center' },
});
