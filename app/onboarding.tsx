import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, ScanLine, Camera, RefreshCw } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { setAppSetting } from '../lib/db/queries';
import { Mascot } from '../components/mascot';
import { FadeInView } from '../components/fade-in';
import { Squish } from '../components/squish';
import { type as textType } from '../lib/fonts';
import { radius, cardShadow, motion } from '../lib/theme';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'คุยกับ Numi ได้เลย',
    body: 'เล่าว่ากินอะไรมาเป็นประโยคธรรมดา Numi แปลงเป็นแคลอรี่ให้เอง',
  },
  {
    icon: Camera,
    title: 'ถ่ายรูปอาหาร',
    body: 'ไม่ต้องพิมพ์ค้นหา ถ่ายรูปจานอาหารแล้วให้ Numi ประเมินแทน',
  },
  {
    icon: ScanLine,
    title: 'สแกนบาร์โค้ด',
    body: 'อาหารแพ็คเกจ สแกนแล้วดึงข้อมูลโภชนาการจริงมาให้ทันที',
  },
  {
    icon: RefreshCw,
    title: 'ซิงค์ข้ามอุปกรณ์',
    body: 'ล็อกอินเมื่อไหร่ก็ได้ทีหลัง ข้อมูลจะตามไปทุกเครื่อง ไม่ล็อกอินก็ใช้ได้ตามปกติ',
  },
];

export default function OnboardingScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  async function finish(nextRoute: '/account-edit' | '/(tabs)') {
    await setAppSetting('onboarding_seen', '1');
    router.replace(nextRoute);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FadeInView>
          <View style={styles.header}>
            <Mascot size={72} pose="start" />
            <Text style={[textType.greeting, { color: c.text, fontSize: 24, marginTop: 14 }]}>
              ยินดีต้อนรับสู่ Numi
            </Text>
            <Text style={[textType.label, { color: c.subtext, fontSize: 13.5, textAlign: 'center', marginTop: 6 }]}>
              ผู้ช่วยจดแคลอรี่และออกกำลังกาย ที่ไม่ต้องพิมพ์เองก็ได้
            </Text>
          </View>
        </FadeInView>

        {FEATURES.map((f, i) => (
          <FadeInView key={f.title} delay={motion.stagger * (i + 1)}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={[styles.iconBox, { backgroundColor: c.brandTint }]}>
                <f.icon size={20} color={c.brand} strokeWidth={2.25} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[textType.row, { color: c.text, fontSize: 14.5 }]}>{f.title}</Text>
                <Text style={[textType.label, { color: c.subtext, fontSize: 12.5, marginTop: 2, lineHeight: 18 }]}>
                  {f.body}
                </Text>
              </View>
            </View>
          </FadeInView>
        ))}

        <FadeInView delay={motion.stagger * (FEATURES.length + 1)}>
          <Squish
            scaleTo={0.97}
            style={[styles.primaryBtn, { backgroundColor: c.brand }]}
            onPress={() => finish('/account-edit')}
          >
            <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>เริ่มตั้งเป้าหมาย</Text>
          </Squish>
          <Squish style={styles.skipLink} onPress={() => finish('/(tabs)')}>
            <Text style={[textType.label, { color: c.faint, fontSize: 13 }]}>ข้ามไปก่อน ตั้งทีหลังได้</Text>
          </Squish>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 12 },
  header: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 14,
  },
  iconBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { borderRadius: radius.iconBox, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  skipLink: { alignItems: 'center', paddingVertical: 12 },
});
