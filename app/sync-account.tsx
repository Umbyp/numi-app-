import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { Squish } from '../components/squish';
import { supabase } from '../lib/auth/client';
import { syncAll } from '../lib/sync/engine';

export default function SyncAccountScreen() {
  const c = useTheme();
  const scheme = useScheme();

  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = ยังไม่รู้สถานะ
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function runSyncAfterAuth() {
    setSyncMsg('กำลังซิงค์ข้อมูล...');
    const result = await syncAll();
    setSyncMsg(result.ok ? 'ซิงค์สำเร็จ' : `ซิงค์ไม่สำเร็จ: ${result.error}`);
  }

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      setError('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setBusy(true);
    setError(null);
    // ห้ามแยก supabase.auth.signUp ออกมาเป็นตัวแปรเฉยๆ แล้วเรียกทีหลัง — จะหลุด `this` binding
    // ของ GoTrueClient ทำให้ error จริง (เช่น flowType) ถูกกลืนแล้วโยน "reading 'storage'" แทน
    const { error: authError } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setPassword('');
    runSyncAfterAuth();
  }

  function handleLogout() {
    Alert.alert('ออกจากระบบ', 'ข้อมูลในเครื่องนี้ยังอยู่ครบ แค่หยุดซิงค์กับบัญชีนี้', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setSyncMsg(null);
        },
      },
    ]);
  }

  if (session === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.brand} />
      </SafeAreaView>
    );
  }

  if (session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>ล็อกอินอยู่ในชื่อ</Text>
            <Text style={[textType.cardTitle, { color: c.text, fontSize: 16, marginTop: 2 }]}>{session.user.email}</Text>
          </View>

          <Squish style={[styles.button, { backgroundColor: c.brand }]} onPress={runSyncAfterAuth}>
            <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>ซิงค์เดี๋ยวนี้</Text>
          </Squish>
          {syncMsg && <Text style={[textType.label, { color: c.muted, fontSize: 12, textAlign: 'center' }]}>{syncMsg}</Text>}

          <Squish style={[styles.button, { backgroundColor: c.surfaceAlt, marginTop: 8 }]} onPress={handleLogout}>
            <Text style={[textType.row, { color: c.text, fontSize: 15 }]}>ออกจากระบบ</Text>
          </Squish>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[textType.label, { color: c.muted, fontSize: 13 }]}>
            ล็อกอินเพื่อสำรองข้อมูลไว้บนเซิร์ฟเวอร์ และใช้ข้อมูลเดียวกันได้ทุกเครื่อง — ไม่ล็อกอินก็ใช้แอปได้ตามปกติ
            ข้อมูลจะอยู่ในเครื่องนี้เครื่องเดียว
          </Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="อีเมล"
              placeholderTextColor={c.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(500) }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              placeholderTextColor={c.faint}
              autoCapitalize="none"
              secureTextEntry
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(500) }]}
            />
            {error && <Text style={[textType.label, { color: '#e5484d', fontSize: 12 }]}>{error}</Text>}

            <Squish style={[styles.button, { backgroundColor: c.brand }]} onPress={handleSubmit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>
                  {mode === 'signup' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
                </Text>
              )}
            </Squish>

            <Squish onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={[textType.label, { color: c.brand, fontSize: 13 }]}>
                {mode === 'signup' ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สร้างบัญชีใหม่'}
              </Text>
            </Squish>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 10 },
  input: { height: 48, borderRadius: radius.cardInner, paddingHorizontal: 14, fontSize: 15 },
  button: { height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
