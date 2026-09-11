import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Target, PieChart, Activity, TrendingUp, RefreshCw, Palette, Users, Heart, Soup, ClipboardCheck, Trophy, type LucideIcon } from 'lucide-react-native';
import { useTheme, useScheme } from '../../lib/hooks/use-theme';
import { getErrorMessage } from '../../lib/errors';
import { useNumiStore } from '../../lib/store';
import { type } from '../../lib/fonts';
import { radius, cardShadow } from '../../lib/theme';
import { Mascot } from '../../components/mascot';
import { ReminderSettings } from '../../components/reminder-settings';
import { Squish } from '../../components/squish';
import { getPrivacySettings, updatePrivacySettings, type PrivacySettings } from '../../lib/social/friends';
import { isModerator } from '../../lib/social/community-foods';

// bgKey/fgKey จับคู่กันเสมอ (พื้นอ่อน + ตัวอักษร/ไอคอนเข้ม สีเดียวกัน) ไล่สีตามหมวดจริง ไม่ใช่สุ่ม:
// น้ำเงิน (brand) = ตัวตนกับเป้าหมาย, ม่วง (dinner) = กิจกรรม, ทอง (fat) = แนวโน้มน้ำหนัก,
// เขียว (carb) = ซิงค์/เชื่อมต่อ (สีเดียวกับที่แถบคาร์บใช้ในวงแหวนแคลอรี่ ให้ความรู้สึก "ไหลต่อกัน")
const ROWS: {
  label: string;
  icon: LucideIcon;
  bgKey: 'brandTint' | 'dinnerBg' | 'fatBg' | 'carbBg' | 'surfaceAlt';
  fgKey: 'brand' | 'dinner' | 'fatText' | 'carbText' | 'muted';
  route?:
    | '/account-edit'
    | '/weight-history'
    | '/activity-history'
    | '/sync-account'
    | '/friends'
    | '/community-foods'
    | '/food-review-queue'
    | '/leaderboard';
  editStep?: 'basic' | 'goal' | 'macros';
  disabled?: boolean;
}[] = [
  { label: 'ข้อมูลส่วนตัว', icon: User, bgKey: 'brandTint', fgKey: 'brand', route: '/account-edit', editStep: 'basic' },
  { label: 'เป้าหมายน้ำหนัก', icon: Target, bgKey: 'brandTint', fgKey: 'brand', route: '/account-edit', editStep: 'goal' },
  { label: 'เป้าหมายสารอาหาร', icon: PieChart, bgKey: 'brandTint', fgKey: 'brand', route: '/account-edit', editStep: 'macros' },
  { label: 'ประวัติกิจกรรม', icon: Activity, bgKey: 'dinnerBg', fgKey: 'dinner', route: '/activity-history' },
  { label: 'ประวัติน้ำหนัก', icon: TrendingUp, bgKey: 'fatBg', fgKey: 'fatText', route: '/weight-history' },
  { label: 'เพื่อน', icon: Users, bgKey: 'dinnerBg', fgKey: 'dinner', route: '/friends' },
  { label: 'อาหารจากชุมชน', icon: Soup, bgKey: 'fatBg', fgKey: 'fatText', route: '/community-foods' },
  { label: 'ตารางอันดับ', icon: Trophy, bgKey: 'dinnerBg', fgKey: 'dinner', route: '/leaderboard' },
  { label: 'ล็อกอิน', icon: RefreshCw, bgKey: 'carbBg', fgKey: 'carbText', route: '/sync-account' },
];

const MODERATOR_ROW: (typeof ROWS)[number] = {
  label: 'คิวตรวจสอบอาหาร',
  icon: ClipboardCheck,
  bgKey: 'surfaceAlt',
  fgKey: 'muted',
  route: '/food-review-queue',
};

const THEME_OPTIONS: { key: 'system' | 'light' | 'dark'; label: string }[] = [
  { key: 'system', label: 'ตามระบบ' },
  { key: 'light', label: 'สว่าง' },
  { key: 'dark', label: 'มืด' },
];

const ON_OFF_OPTIONS: { key: boolean; label: string }[] = [
  { key: false, label: 'ปิด' },
  { key: true, label: 'เปิด' },
];

const WEIGHT_MODE_OPTIONS: { key: 'relative' | 'exact'; label: string }[] = [
  { key: 'relative', label: 'แนวโน้มเท่านั้น' },
  { key: 'exact', label: 'ตัวเลขจริง' },
];

export default function AccountScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { profile, latestWeightKg, goals, refresh, themePreference, setThemePreference } = useNumiStore();
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [moderator, setModerator] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      // ไม่มี session (ยังไม่ล็อกอิน) หรือยังไม่ได้รัน migration ฝั่ง server ก็แค่ซ่อน section นี้ไป
      getPrivacySettings()
        .then(setPrivacy)
        .catch(() => setPrivacy(null));
      isModerator()
        .then(setModerator)
        .catch(() => setModerator(false));
    }, [])
  );

  const rows = useMemo(() => (moderator ? [...ROWS, MODERATOR_ROW] : ROWS), [moderator]);

  async function updatePrivacy(patch: Partial<PrivacySettings>) {
    if (!privacy) return;
    const prev = privacy;
    setPrivacy({ ...prev, ...patch });
    try {
      await updatePrivacySettings(patch);
    } catch (e) {
      setPrivacy(prev);
      Alert.alert('บันทึกไม่สำเร็จ', getErrorMessage(e));
    }
  }

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
          {rows.map((row, i) => (
            <Squish scaleTo={0.98}
              key={row.label}
              style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
              disabled={row.disabled || !row.route}
              onPress={() => {
                if (!row.route) return;
                if (row.editStep) router.push({ pathname: '/account-edit', params: { step: row.editStep } });
                else router.push(row.route);
              }}
            >
              <View style={[styles.rowIcon, { backgroundColor: c[row.bgKey] }]}>
                <row.icon size={16} color={row.disabled ? c.faint : c[row.fgKey]} strokeWidth={2.25} />
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
          <View style={styles.themeHeader}>
            <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
              <Palette size={16} color={c.muted} strokeWidth={2.25} />
            </View>
            <Text style={[type.row, { color: c.text, fontSize: 14 }]}>ธีม</Text>
          </View>
          <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
            {THEME_OPTIONS.map((opt) => {
              const active = opt.key === themePreference;
              return (
                <Squish
                  key={opt.key}
                  onPress={() => setThemePreference(opt.key)}
                  style={[styles.segment, active && { backgroundColor: c.surface }]}
                >
                  <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
                </Squish>
              );
            })}
          </View>
        </View>

        {privacy && (
          <>
            <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>ความเป็นส่วนตัว</Text>

            <View style={[styles.themeCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.themeHeader}>
                <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Users size={16} color={c.muted} strokeWidth={2.25} />
                </View>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>แชร์กิจกรรมกับเพื่อน</Text>
              </View>
              <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
                {ON_OFF_OPTIONS.map((opt) => {
                  const active = opt.key === privacy.shareActivity;
                  return (
                    <Squish
                      key={String(opt.key)}
                      onPress={() => updatePrivacy(opt.key ? { shareActivity: true } : { shareActivity: false, shareWeight: false })}
                      style={[styles.segment, active && { backgroundColor: c.surface }]}
                    >
                      <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
                    </Squish>
                  );
                })}
              </View>
              <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>
                เพื่อนที่ตอบรับแล้วจะเห็นบันทึกออกกำลังกายของคุณ และให้กำลังใจได้
              </Text>
            </View>

            <View style={[styles.themeCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme), !privacy.shareActivity && { opacity: 0.5 }]}>
              <View style={styles.themeHeader}>
                <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Heart size={16} color={c.muted} strokeWidth={2.25} />
                </View>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>แชร์น้ำหนัก</Text>
              </View>
              <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
                {ON_OFF_OPTIONS.map((opt) => {
                  const active = opt.key === privacy.shareWeight;
                  return (
                    <Squish
                      key={String(opt.key)}
                      disabled={!privacy.shareActivity}
                      onPress={() => updatePrivacy({ shareWeight: opt.key })}
                      style={[styles.segment, active && { backgroundColor: c.surface }]}
                    >
                      <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
                    </Squish>
                  );
                })}
              </View>
              {privacy.shareWeight && (
                <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
                  {WEIGHT_MODE_OPTIONS.map((opt) => {
                    const active = opt.key === privacy.weightShareMode;
                    return (
                      <Squish
                        key={opt.key}
                        onPress={() => updatePrivacy({ weightShareMode: opt.key })}
                        style={[styles.segment, active && { backgroundColor: c.surface }]}
                      >
                        <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
                      </Squish>
                    );
                  })}
                </View>
              )}
              <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>
                ต้องเปิดแชร์กิจกรรมก่อนถึงจะแชร์น้ำหนักได้ · "แนวโน้มเท่านั้น" ให้เพื่อนเห็นแค่ทิศทาง (ขึ้น/ลง/คงที่) ไม่เห็นตัวเลขจริง
              </Text>
            </View>

            <View style={[styles.themeCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={styles.themeHeader}>
                <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Trophy size={16} color={c.muted} strokeWidth={2.25} />
                </View>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>เข้าร่วมตารางอันดับ</Text>
              </View>
              <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]}>
                {ON_OFF_OPTIONS.map((opt) => {
                  const active = opt.key === privacy.leaderboardOptIn;
                  return (
                    <Squish
                      key={String(opt.key)}
                      onPress={() => updatePrivacy({ leaderboardOptIn: opt.key })}
                      style={[styles.segment, active && { backgroundColor: c.surface }]}
                    >
                      <Text style={[type.row, { color: active ? c.text : c.muted, fontSize: 13 }]}>{opt.label}</Text>
                    </Squish>
                  );
                })}
              </View>
              <Text style={[type.label, { color: c.faint, fontSize: 11 }]}>
                ปิดได้ทุกเมื่อ — ปิดแล้วหายจากตารางอันดับทุกอันทันที ไม่ต้องรอ
              </Text>
            </View>
          </>
        )}

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
  rowIcon: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  themeCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, gap: 12 },
  themeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.iconBox },
});
