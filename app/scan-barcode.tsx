import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { AmountStepper } from '../components/amount-stepper';
import { MealTypeIcon } from '../components/icons/meal-type-icons';
import { MEAL_TYPES, detectMealType, type MealType } from '../lib/meal-type';
import { addMealEntry, createUserFood } from '../lib/db/queries';
import { scaleFood } from '../lib/nutrition';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

interface OffProduct {
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  barcode: string;
}

export default function ScanBarcodeScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [amountG, setAmountG] = useState(100);
  const [mealType, setMealType] = useState<MealType>(detectMealType());
  const [saving, setSaving] = useState(false);
  const handledRef = useRef(false);

  async function handleScanned({ data }: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const json = await res.json();
      const p = json?.product;
      const kcal = p?.nutriments?.['energy-kcal_100g'];
      if (json?.status !== 1 || !p || typeof kcal !== 'number') {
        setError('ไม่พบข้อมูลสินค้านี้ในฐานข้อมูล Open Food Facts');
        return;
      }
      setProduct({
        name: p.product_name_th || p.product_name || p.product_name_en || `สินค้า ${data}`,
        kcalPer100: kcal,
        proteinPer100: p.nutriments?.proteins_100g ?? 0,
        carbPer100: p.nutriments?.carbohydrates_100g ?? 0,
        fatPer100: p.nutriments?.fat_100g ?? 0,
        barcode: data,
      });
      const servingG = p?.serving_quantity ? parseFloat(p.serving_quantity) : null;
      if (servingG && servingG > 0) setAmountG(Math.round(servingG));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setError('เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    handledRef.current = false;
    setError(null);
    setProduct(null);
  }

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    try {
      const foodId = await createUserFood({
        name: product.name,
        kcalPer100: product.kcalPer100,
        proteinPer100: product.proteinPer100,
        carbPer100: product.carbPer100,
        fatPer100: product.fatPer100,
      });
      const scaled = scaleFood(product, amountG);
      await addMealEntry({
        foodId,
        name: product.name,
        mealType,
        amountG,
        kcal: scaled.kcal,
        proteinG: scaled.proteinG,
        carbG: scaled.carbG,
        fatG: scaled.fatG,
        estimated: false,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionWrap, { backgroundColor: c.bg }]}>
        <Text style={[textType.cardTitle, { color: c.text, textAlign: 'center' }]}>ต้องขออนุญาตใช้กล้องก่อน</Text>
        <Text style={[textType.label, { color: c.subtext, textAlign: 'center', marginTop: 6, marginBottom: 20 }]}>
          เพื่อสแกนบาร์โค้ดอาหาร
        </Text>
        <Pressable style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={requestPermission}>
          <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>อนุญาตใช้กล้อง</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {!product && !error && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={handleScanned}
        >
          <SafeAreaView style={styles.scanHint} edges={['top']}>
            <Text style={styles.scanHintText}>เล็งกล้องไปที่บาร์โค้ดสินค้า</Text>
          </SafeAreaView>
        </CameraView>
      )}

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.overlayText}>กำลังค้นหาข้อมูล...</Text>
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText, { marginBottom: 20 }]}>{error}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={[styles.primaryBtn, { backgroundColor: c.brand }]} onPress={retry}>
              <Text style={[textType.row, { color: '#fff', fontSize: 14 }]}>สแกนใหม่</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.surfaceAlt }]}
              onPress={() => router.replace({ pathname: '/add-food', params: { mode: 'manual' } })}
            >
              <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>กรอกเอง</Text>
            </Pressable>
          </View>
        </View>
      )}

      {product && (
        <SafeAreaView style={[styles.resultSheet, { backgroundColor: c.surface }]} edges={['bottom']}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
            <Text style={[textType.cardTitle, { color: c.text, fontSize: 16 }]} numberOfLines={2}>
              {product.name}
            </Text>

            <View style={styles.mealRow}>
              {MEAL_TYPES.map((opt) => {
                const active = opt.key === mealType;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setMealType(opt.key)}
                    style={[styles.mealPill, { backgroundColor: active ? c[opt.colorKey] : c.surfaceAlt }]}
                  >
                    <MealTypeIcon type={opt.key} color={active ? '#fff' : c[opt.colorKey]} size={13} />
                    <Text style={[textType.row, { fontSize: 13, color: active ? '#fff' : c.text }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.amountRow}>
              <Text style={[textType.label, { color: c.subtext }]}>ปริมาณ</Text>
              <AmountStepper value={amountG} onChange={setAmountG} />
            </View>

            {(() => {
              const scaled = scaleFood(product, amountG);
              return (
                <Text style={[textType.row, { color: c.text, fontSize: 13 }]}>
                  {Math.round(scaled.kcal)} kcal · P {scaled.proteinG.toFixed(1)}g · C {scaled.carbG.toFixed(1)}g · F{' '}
                  {scaled.fatG.toFixed(1)}g
                </Text>
              );
            })()}

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }, cardShadow(scheme)]}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={[textType.row, { color: '#fff', fontSize: 15 }]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Pressable>
            <Pressable onPress={retry} style={{ alignItems: 'center', paddingVertical: 4 }}>
              <Text style={[textType.label, { color: c.subtext }]}>สแกนใหม่</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  primaryBtn: { borderRadius: radius.iconBox, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  scanHint: { alignItems: 'center', paddingTop: 12 },
  scanHintText: { color: '#fff', fontFamily: fontFamily(600), fontSize: 13, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  overlayText: { color: '#fff', fontFamily: fontFamily(600), fontSize: 15, textAlign: 'center' },
  resultSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  mealRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  mealPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: radius.pill },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
