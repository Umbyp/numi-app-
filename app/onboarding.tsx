import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Camera, ScanLine, RefreshCw } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { setAppSetting } from '../lib/db/queries';
import { Mascot } from '../components/mascot';
import { Squish } from '../components/squish';
import { FadeInView } from '../components/fade-in';
import { type as textType } from '../lib/fonts';
import { radius, cardShadow, motion } from '../lib/theme';

const FEATURES = [
  {
    Icon: MessageCircle,
    title: 'คุยกับ Numi ได้เลย',
    desc: 'เล่าว่ากินอะไรมาเป็นประโยคธรรมดา Numi แปลงเป็นแคลอรี่ให้เอง',
  },
  {
    Icon: Camera,
    title: 'ถ่ายรูปอาหาร',
    desc: 'ไม่ต้องพิมพ์ค้นหา ถ่ายรูปจานอาหารแล้วให้ Numi ประเมินแทน',
  },
  {
    Icon: ScanLine,
    title: 'สแกนบาร์โค้ด',
    desc: 'อาหารแพ็คเกจ สแกนแล้วดึงข้อมูลโภชนาการจริงมาให้ทันที',
  },
  {
    Icon: RefreshCw,
    title: 'ซิงค์ข้ามอุปกรณ์',
    desc: 'ล็อกอินเมื่อไหร่ก็ได้ทีหลัง ไม่ล็อกอินก็ใช้ได้ตามปกติ',
  },
];

export default function OnboardingScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  async function markSeen() {
    await setAppSetting('onboarding_seen', 'true');
  }

  function startGoalSetup() {
    markSeen();
    router.replace({ pathname: '/account-edit', params: { step: 'basic' } });
  }

  function skip() {
    markSeen();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Mascot pose="start" size={100} />
          <Text style={[textType.greeting, { color: c.text, fontSize: 23, marginTop: 4 }]}>ยินดีต้อนรับสู่ Numi</Text>
          <Text style={[textType.body, styles.heroDesc, { color: c.subtext }]}>
            ผู้ช่วยจดแคลอรี่และออกกำลังกาย ที่ไม่ต้องพิมพ์เองก็ได้
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <FadeInView key={title} delay={i * motion.stagger}>
              <View style={[styles.featureCard, { backgroundColor: c.surface }, cardShadow(scheme)]}>
                <View style={[styles.iconBox, { backgroundColor: c.brandTint }]}>
                  <Icon size={22} color={c.brand} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[textType.row, { color: c.text, fontSize: 14.5 }]}>{title}</Text>
                  <Text style={[textType.label, styles.featureDesc, { color: c.subtext }]}>{desc}</Text>
                </View>
              </View>
            </FadeInView>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Squish scaleTo={0.97} style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={startGoalSetup}>
          <Text style={[textType.row, styles.primaryBtnText]}>เริ่มตั้งเป้าหมาย</Text>
        </Squish>
        <Squish onPress={skip} style={styles.skipBtn}>
          <Text style={[textType.row, { color: c.faint, fontSize: 13 }]}>ข้ามไปก่อน ตั้งทีหลังได้</Text>
        </Squish>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 8 },
  hero: { alignItems: 'center', gap: 4, paddingVertical: 8, marginBottom: 16 },
  heroDesc: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: radius.card,
    padding: 13,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDesc: { fontSize: 12.5, lineHeight: 19, marginTop: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
  primaryBtn: { height: 56, borderRadius: radius.card - 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
});
