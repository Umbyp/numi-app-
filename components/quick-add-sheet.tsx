import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Search, PenLine } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { type, fontFamily } from '../lib/fonts';
import { radius } from '../lib/theme';
import { CameraIcon, BarcodeIcon, ActivityIcon, ScaleIcon } from './icons/nav-icons';
import { Mascot } from './mascot';
import { getFrequentFoods, addMealEntry, type FrequentFood } from '../lib/db/queries';
import { detectMealType } from '../lib/meal-type';
import { useNumiStore } from '../lib/store';
import { captureFoodPhoto } from '../lib/ai/capture-photo';
import { setPendingImage } from '../lib/ai/pending-image';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickAddSheet({ visible, onClose }: Props) {
  const c = useTheme();
  const router = useRouter();
  const refresh = useNumiStore((s) => s.refresh);
  const [text, setText] = useState('');
  const [frequent, setFrequent] = useState<FrequentFood[]>([]);
  const [loadingFrequent, setLoadingFrequent] = useState(false);
  const [logging, setLoggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoadingFrequent(true);
    getFrequentFoods(4)
      .then(setFrequent)
      .finally(() => setLoadingFrequent(false));
  }, [visible]);

  function close() {
    setText('');
    onClose();
  }

  function askNumi() {
    const t = text.trim();
    close();
    router.push(t ? { pathname: '/chat', params: { initialText: t } } : '/chat');
  }

  function goSearch() {
    close();
    router.push({ pathname: '/add-food', params: { mode: 'search' } });
  }

  function goBarcode() {
    close();
    router.push('/scan-barcode');
  }

  async function goCamera() {
    close();
    const dataUrl = await captureFoodPhoto();
    if (!dataUrl) return;
    setPendingImage(dataUrl);
    router.push('/chat');
  }

  function goManual() {
    close();
    router.push({ pathname: '/add-food', params: { mode: 'manual' } });
  }

  function goWeight() {
    close();
    router.push('/account-edit');
  }

  function goWorkout() {
    close();
    router.push('/log-workout');
  }

  async function repeatFood(food: FrequentFood) {
    setLoggingId(food.foodId);
    try {
      await addMealEntry({
        foodId: food.foodId,
        name: food.name,
        mealType: detectMealType(),
        amountG: food.amountG,
        kcal: food.kcal,
        proteinG: food.proteinG,
        carbG: food.carbG,
        fatG: food.fatG,
        estimated: false,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refresh();
      close();
    } finally {
      setLoggingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { backgroundColor: c.surface }]}>
        <View style={[styles.handle, { backgroundColor: c.line }]} />

        <View style={[styles.askRow, { backgroundColor: c.brandTint }]}>
          <Mascot size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="พิมพ์บอก Numi ก็ได้"
              placeholderTextColor={c.muted}
              style={[styles.askInput, { color: c.text }]}
              onSubmitEditing={askNumi}
            />
            <Text style={[type.label, { color: c.subtext, fontSize: 12 }]}>“ข้าวกะเพราไข่ดาว 1 จาน”</Text>
          </View>
          <Pressable style={[styles.askBtn, { backgroundColor: c.brand }]} onPress={askNumi}>
            <Text style={[type.row, { color: '#fff', fontSize: 13 }]}>ถามเลย</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <GridButton label="ถ่ายรูป" c={c} onPress={goCamera} icon={<CameraIcon color={c.brand} size={24} />} />
          <GridButton label="บาร์โค้ด" c={c} onPress={goBarcode} icon={<BarcodeIcon color={c.brand} size={24} />} />
          <GridButton label="ค้นหา" c={c} onPress={goSearch} icon={<Search size={22} color={c.brand} />} />
          <GridButton label="กรอกเอง" c={c} onPress={goManual} icon={<PenLine size={22} color={c.brand} />} />
        </View>

        {(loadingFrequent || frequent.length > 0) && (
          <View style={{ gap: 8 }}>
            <Text style={[type.badge, { color: c.muted, letterSpacing: 0.4 }]}>บันทึกซ้ำจากที่กินบ่อย</Text>
            {loadingFrequent ? (
              <ActivityIndicator color={c.muted} />
            ) : (
              <View style={styles.frequentRow}>
                {frequent.map((f) => (
                  <Pressable
                    key={f.foodId}
                    style={[styles.frequentCard, { backgroundColor: c.surfaceAlt }, logging === f.foodId && { opacity: 0.5 }]}
                    disabled={logging === f.foodId}
                    onPress={() => repeatFood(f)}
                  >
                    <Text style={[type.row, { color: c.text, fontSize: 13 }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={[type.label, { color: c.faint, fontSize: 10 }]}>{Math.round(f.kcal)} kcal</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.footerRow}>
          <Pressable style={[styles.footerBtn, { backgroundColor: c.surfaceAlt }]} onPress={goWorkout}>
            <ActivityIcon color={c.dinner} size={18} />
            <Text style={[type.row, { color: c.text, fontSize: 14 }]}>กิจกรรม</Text>
          </Pressable>
          <Pressable style={[styles.footerBtn, { backgroundColor: c.surfaceAlt }]} onPress={goWeight}>
            <ScaleIcon color={c.brand} size={18} />
            <Text style={[type.row, { color: c.text, fontSize: 14 }]}>น้ำหนัก</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function GridButton({
  label,
  icon,
  onPress,
  disabled,
  c,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable style={styles.gridBtn} onPress={onPress} disabled={disabled || !onPress}>
      <View style={[styles.gridIcon, { backgroundColor: c.surfaceAlt }]}>{icon}</View>
      <Text style={[type.row, { color: disabled ? c.faint : c.text, fontSize: 11 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.34)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  askRow: { borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  askInput: { fontFamily: fontFamily(700), fontSize: 15, padding: 0 },
  askBtn: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', gap: 8 },
  gridBtn: { flex: 1, alignItems: 'center', gap: 8 },
  gridIcon: { width: '100%', height: 70, borderRadius: radius.card - 6, alignItems: 'center', justifyContent: 'center' },
  frequentRow: { flexDirection: 'row', gap: 8 },
  frequentCard: { flex: 1, height: 56, borderRadius: radius.card - 8, padding: 12, justifyContent: 'center', gap: 2 },
  footerRow: { flexDirection: 'row', gap: 8 },
  footerBtn: { flex: 1, height: 52, borderRadius: radius.card - 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
});
