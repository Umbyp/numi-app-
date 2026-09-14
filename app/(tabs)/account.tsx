import { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Target, Dumbbell, TrendingUp } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { useNumiStore } from '../../lib/store';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import { Mascot } from '../../components/mascot';
import { ReminderSettings } from '../../components/reminder-settings';
import { Squish } from '../../components/squish';

const ROWS: {
  label: string;
  bgKey: 'brandTint' | 'dinnerBg' | 'surfaceAlt';
  Icon: typeof User;
  route?: '/account-edit' | '/weight-history' | '/activity-history';
  editStep?: 'basic' | 'goal' | 'macros' | 'summary';
  disabled?: boolean;
}[] = [
  { label: 'ข้อมูลส่วนตัว', bgKey: 'brandTint', Icon: User, route: '/account-edit', editStep: 'basic' },
  { label: 'เป้าหมายน้ำหนักและแคลอรี่', bgKey: 'brandTint', Icon: Target, route: '/account-edit', editStep: 'goal' },
  { label: 'ประวัติกิจกรรม', bgKey: 'dinnerBg', Icon: Dumbbell, route: '/activity-history' },
  { label: 'ประวัติน้ำหนัก', bgKey: 'brandTint', Icon: TrendingUp, route: '/weight-history' },
];

export default function AccountScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { profile, latestWeightKg, goals, refresh, themePreference, setThemePreference } = useNumiStore();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const goalWeight = profile?.goalWeightKg;
  const remainingKg = goalWeight != null && latestWeightKg != null ? Math.abs(latestWeightKg - goalWeight) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[type.greeting, { color: c.text, fontSize: 24 }]}>บัญชี</Text>

        <View style={[styles.headerCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <Mascot size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>
              {latestWeightKg ? `${latestWeightKg.toFixed(1)} กก.` : 'ยังไม่มีน้ำหนัก'}
            </Text>
            <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>
              {goalWeight
                ? remainingKg != null
                  ? remainingKg < 0.1
                    ? `เป้า ${goalWeight.toFixed(1)} กก. · ถึงเป้าหมายแล้ว`
                    : `เป้า ${goalWeight.toFixed(1)} กก. · เหลืออีก ${remainingKg.toFixed(1)} กก.`
                  : `เป้า ${goalWeight.toFixed(1)} กก.`
                : 'ยังไม่ได้ตั้งน้ำหนักเป้าหมาย'}
            </Text>
          </View>
          <Squish style={[styles.editPill, { backgroundColor: c.brandTint }]} onPress={() => router.push('/account-edit')}>
            <Text style={[type.row, { color: c.brand, fontSize: 12 }]}>แก้ไข</Text>
          </Squish>
        </View>

        <View style={styles.statRow}>
          <StatCard label="เป้าแคลอรี่" value={`${Math.round(goals?.kcalTarget ?? 0).toLocaleString()}`} c={c} scheme={scheme} />
          <StatCard label="โปรตีน" value={`${Math.round(goals?.proteinG ?? 0)} g`} c={c} scheme={scheme} />
          <StatCard
            label={profile?.goalType === 'gain' ? 'เพิ่ม/สัปดาห์' : 'ลด/สัปดาห์'}
            value={`${Math.abs(profile?.weeklyRateKg ?? 0).toFixed(2)} กก.`}
            c={c}
            scheme={scheme}
          />
        </View>

        <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>เกี่ยวกับคุณ</Text>

        <View style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          {ROWS.map((row, i) => (
            <Squish scaleTo={0.98}
              key={row.label}
              style={[styles.row, i < ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
              disabled={row.disabled || !row.route}
              onPress={() => {
                if (!row.route) return;
                if (row.editStep) router.push({ pathname: '/account-edit', params: { step: row.editStep } });
                else router.push(row.route);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: c[row.bgKey] }]}>
                <row.Icon size={17} color={row.bgKey === 'dinnerBg' ? c.dinner : c.brand} />
              </View>
              <Text style={[type.row, { color: row.disabled ? c.faint : c.text, fontSize: 14, flex: 1 }]}>{row.label}</Text>
              {row.disabled ? (
                <Text style={[type.badge, { color: c.faint, fontSize: 10 }]}>เร็ว ๆ นี้</Text>
              ) : (
                <Text style={{ color: c.faint, fontSize: 17 }}>›</Text>
              )}
            </Squish>
          ))}
        </View>

        <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>การแสดงผล</Text>
        <View style={[styles.themeCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <Text style={[type.row, { color: c.text, fontSize: 14.5 }]}>ธีม</Text>
          <View style={[styles.themeSegmented, { backgroundColor: c.surfaceAlt }]}>
            {(
              [
                { key: 'system', label: 'ตามระบบ' },
                { key: 'light', label: 'สว่าง' },
                { key: 'dark', label: 'มืด' },
              ] as const
            ).map((opt) => {
              const active = opt.key === themePreference;
              return (
                <Squish
                  key={opt.key}
                  onPress={() => setThemePreference(opt.key)}
                  style={[styles.themeSegment, active && { backgroundColor: c.surface }]}
                >
                  <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13.5 }]}>{opt.label}</Text>
                </Squish>
              );
            })}
          </View>
        </View>

        <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>การเตือน</Text>
        <ReminderSettings />

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, c, scheme }: { label: string; value: string; c: ReturnType<typeof useTheme>; scheme: 'light' | 'dark' }) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
      <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 18, gap: 12 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16 },
  editPill: { height: 34, paddingHorizontal: 13, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.cardInner, padding: 13, gap: 2 },
  listCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 16 },
  rowIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  themeCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12 },
  themeSegmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  themeSegment: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.iconBox },
});
