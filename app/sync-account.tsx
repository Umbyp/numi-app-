import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, motion, cardShadow } from '../lib/theme';
import { Squish } from '../components/squish';
import { Mascot } from '../components/mascot';
import { FadeInView } from '../components/fade-in';
import { supabase, signInWithGoogle } from '../lib/auth/client';
import { syncAll } from '../lib/sync/engine';

type Mode = 'login' | 'signup';

export default function SyncAccountScreen() {
  const c = useTheme();
  const scheme = useScheme();

  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = ยังไม่รู้สถานะ
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  async function handleGoogle() {
    setGoogleBusy(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (!result.cancelled) runSyncAfterAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
    }
    setGoogleBusy(false);
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
          <FadeInView>
            <Bubble c={c} scheme={scheme} pose="goal" accent={c.brand}>
              <Text style={[textType.cardTitle, { color: c.text, fontSize: 16 }]}>ซิงค์พร้อมใช้งานแล้ว</Text>
              <Text style={[textType.label, { color: c.subtext, fontSize: 12.5, marginTop: 3 }]}>{session.user.email}</Text>
            </Bubble>
          </FadeInView>

          <FadeInView delay={motion.stagger}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <Squish style={[styles.primaryButton, { backgroundColor: c.brand }]} onPress={runSyncAfterAuth}>
                <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>ซิงค์เดี๋ยวนี้</Text>
              </Squish>
              {syncMsg && (
                <Text style={[textType.label, { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 10 }]}>
                  {syncMsg}
                </Text>
              )}
            </View>
          </FadeInView>

          <Squish onPress={handleLogout} style={styles.logoutLink}>
            <Text style={[textType.label, { color: c.danger, fontSize: 13 }]}>ออกจากระบบ</Text>
          </Squish>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FadeInView>
            <Bubble c={c} scheme={scheme} pose="idle" accent={c.carb}>
              <Text style={[textType.cardTitle, { color: c.text, fontSize: 16 }]}>เก็บข้อมูลของคุณไว้ให้ปลอดภัย</Text>
              <Text style={[textType.label, { color: c.subtext, fontSize: 12.5, marginTop: 3, lineHeight: 18 }]}>
                สำรองไว้บนเซิร์ฟเวอร์ แล้วใช้ข้อมูลเดียวกันได้ทุกเครื่อง — ไม่สมัครก็ใช้แอปได้ตามปกติ
              </Text>
            </Bubble>
          </FadeInView>

          <FadeInView delay={motion.stagger} style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            <Segmented
              c={c}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError(null);
              }}
              options={[
                { key: 'login', label: 'เข้าสู่ระบบ' },
                { key: 'signup', label: 'สร้างบัญชีใหม่' },
              ]}
            />

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
            {error && (
              <View style={[styles.errorBox, { backgroundColor: c.dangerBg }]}>
                <Text style={[textType.label, { color: c.danger, fontSize: 12.5 }]}>{error}</Text>
              </View>
            )}

            <Squish style={[styles.primaryButton, { backgroundColor: c.brand, marginTop: error ? 10 : 14 }]} onPress={handleSubmit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>
                  {mode === 'signup' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
                </Text>
              )}
            </Squish>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
              <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>หรือ</Text>
              <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
            </View>

            <Squish
              style={[styles.googleButton, { backgroundColor: c.surface, borderColor: c.line }]}
              onPress={handleGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color={c.text} />
              ) : (
                <>
                  <GoogleMark />
                  <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>ดำเนินการต่อด้วย Google</Text>
                </>
              )}
            </Squish>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** ฟองคำพูดของมาสคอต — ใช้ลายเดียวกับ MascotGreeting บนแดชบอร์ด ให้หน้านี้รู้สึกเป็นส่วนเดียวกับแอป ไม่ใช่ฟอร์มแปะเพิ่ม */
function Bubble({
  c,
  scheme,
  pose,
  accent,
  children,
}: {
  c: ReturnType<typeof useTheme>;
  scheme: 'light' | 'dark';
  pose: 'idle' | 'goal';
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bubbleWrap}>
      <Mascot size={56} pose={pose} />
      <View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
        <View style={[styles.bubbleAccent, { backgroundColor: accent }]} />
        <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      </View>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  c,
}: {
  options: { key: Mode; label: string }[];
  value: Mode;
  onChange: (v: Mode) => void;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Squish key={opt.key} onPress={() => onChange(opt.key)} style={[styles.segment, active && { backgroundColor: c.surface }]}>
            <Text style={[textType.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

/** ตัว G แบบย่อ 4 สีของ Google — วงกลมเล็กพอไม่ต้องพึ่งไฟล์โลโก้จริง */
function GoogleMark() {
  return (
    <View style={googleMarkStyles.ring}>
      <Text style={googleMarkStyles.letter}>G</Text>
    </View>
  );
}

const googleMarkStyles = StyleSheet.create({
  ring: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }) },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 14 },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 2 },
  bubble: { flex: 1, flexDirection: 'row', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 14, marginTop: 6 },
  bubbleAccent: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4, marginBottom: 14 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.iconBox },
  input: { height: 48, borderRadius: radius.cardInner, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  errorBox: { borderRadius: radius.iconBox, padding: 10, marginTop: 2 },
  primaryButton: { height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  googleButton: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutLink: { alignItems: 'center', paddingVertical: 12 },
});
