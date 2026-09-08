import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Search, X, Sparkles, Check, Plus } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { AmountStepper } from '../components/amount-stepper';
import { MealTypeIcon } from '../components/icons/meal-type-icons';
import { FoodVisual } from '../components/food-visual';
import { FadeInView } from '../components/fade-in';
import { MEAL_TYPES, detectMealType, type MealType } from '../lib/meal-type';
import { searchFoods, addMealEntry, createUserFood } from '../lib/db/queries';
import { scaleFood } from '../lib/nutrition';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow, onColor } from '../lib/theme';
import type { foods as foodsTable } from '../lib/db/schema';

type Food = typeof foodsTable.$inferSelect;

export default function AddFoodScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; mode?: 'search' | 'manual' }>();

  const [mealType, setMealType] = useState<MealType>(params.mealType ?? detectMealType());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [amountG, setAmountG] = useState(100);
  const [showManual, setShowManual] = useState(params.mode === 'manual');
  const [saving, setSaving] = useState(false);
  /** ชื่อรายการที่เพิ่งบันทึก ใช้ยืนยันให้เห็นตอนเลือก "บันทึกแล้วเพิ่มอีก" */
  const [justSaved, setJustSaved] = useState<string | null>(null);

  // manual food fields
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(query).then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function pickFood(food: Food) {
    setSelected(food);
    const firstUnit = food.servingUnits?.[0];
    setAmountG(firstUnit?.grams ?? 100);
  }

  function askNumiToEstimate() {
    router.replace({ pathname: '/chat', params: { initialText: query.trim() } });
  }

  /** stay = true คือบันทึกแล้วอยู่หน้านี้ต่อ ไม่เด้งกลับ เพื่อเพิ่มรายการถัดไปในมื้อเดียวกัน */
  async function handleConfirmSelected(stay = false) {
    if (!selected) return;
    const savedName = selected.name;
    setSaving(true);
    try {
      const scaled = scaleFood(selected, amountG);
      await addMealEntry({
        foodId: selected.id,
        name: selected.name,
        mealType,
        amountG,
        kcal: scaled.kcal,
        proteinG: scaled.proteinG,
        carbG: scaled.carbG,
        fatG: scaled.fatG,
        estimated: selected.source === 'ai',
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (stay) {
        setSelected(null);
        setQuery('');
        setJustSaved(savedName);
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmManual() {
    const kcalPer100 = parseFloat(manualKcal);
    if (!manualName.trim() || !kcalPer100) return;
    setSaving(true);
    try {
      const foodInput = {
        name: manualName.trim(),
        kcalPer100,
        proteinPer100: parseFloat(manualProtein) || 0,
        carbPer100: parseFloat(manualCarb) || 0,
        fatPer100: parseFloat(manualFat) || 0,
      };
      const foodId = await createUserFood(foodInput);
      const scaled = scaleFood(foodInput, amountG);
      await addMealEntry({
        foodId,
        name: foodInput.name,
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

  const scaledPreview = selected ? scaleFood(selected, amountG) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {justSaved && (
          <View style={[styles.savedBanner, { backgroundColor: c.brandTint }]}>
            <Check size={15} color={c.brand} strokeWidth={3} />
            <Text style={[textType.row, { color: c.text, fontSize: 12.5, flex: 1 }]} numberOfLines={1}>
              เพิ่ม {justSaved} แล้ว
            </Text>
            <Pressable hitSlop={10} onPress={() => setJustSaved(null)}>
              <X size={14} color={c.muted} />
            </Pressable>
          </View>
        )}

        <View style={styles.mealRow}>
          {MEAL_TYPES.map((opt) => {
            const active = opt.key === mealType;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setMealType(opt.key)}
                style={[
                  styles.mealPill,
                  { backgroundColor: active ? c[opt.colorKey] : c.surfaceAlt },
                ]}
              >
                <MealTypeIcon type={opt.key} color={active ? onColor(c[opt.colorKey]) : c[opt.colorKey]} size={13} />
                <Text style={[textType.row, { fontSize: 13, color: active ? onColor(c[opt.colorKey]) : c.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!showManual ? (
          <>
            <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
              <Search size={16} color={c.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ค้นหาอาหาร เช่น กะเพรา, ข้าวมันไก่"
                placeholderTextColor={c.faint}
                style={[styles.searchInput, { color: c.text, fontFamily: fontFamily(500) }]}
              />
            </View>

            {selected ? (
              <View style={[styles.selectedCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <View style={styles.selectedHeader}>
                  <View style={styles.selectedTitleRow}>
                    <FoodVisual name={selected.name} size={40} />
                    <Text style={[textType.cardTitle, { color: c.text, fontSize: 16, flex: 1 }]} numberOfLines={1}>
                      {selected.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                    <X size={18} color={c.muted} />
                  </Pressable>
                </View>

                {selected.servingUnits && selected.servingUnits.length > 0 && (
                  <View style={styles.unitRow}>
                    {selected.servingUnits.map((u) => (
                      <Pressable
                        key={u.label}
                        onPress={() => setAmountG(u.grams)}
                        style={[
                          styles.unitPill,
                          { backgroundColor: amountG === u.grams ? c.brandTint : c.surfaceAlt },
                        ]}
                      >
                        <Text style={[textType.label, { color: amountG === u.grams ? c.brand : c.subtext, fontSize: 12 }]}>{u.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.amountRow}>
                  <Text style={[textType.label, { color: c.subtext }]}>ปริมาณ</Text>
                  <AmountStepper value={amountG} onChange={setAmountG} />
                </View>

                {scaledPreview && (
                  <Text style={[textType.row, styles.previewText, { color: c.text }]}>
                    {Math.round(scaledPreview.kcal)} kcal · P {scaledPreview.proteinG.toFixed(1)}g · C{' '}
                    {scaledPreview.carbG.toFixed(1)}g · F {scaledPreview.fatG.toFixed(1)}g
                  </Text>
                )}

                <View style={styles.saveRow}>
                  <Pressable
                    style={[styles.saveMore, { backgroundColor: c.brandTint }, saving && { opacity: 0.6 }]}
                    disabled={saving}
                    onPress={() => handleConfirmSelected(true)}
                  >
                    <Plus size={16} color={c.brand} strokeWidth={2.6} />
                    <Text style={[textType.row, { color: c.brand, fontSize: 13 }]}>เพิ่มอีก</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveBtn, styles.saveBtnFlex, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]}
                    disabled={saving}
                    onPress={() => handleConfirmSelected(false)}
                  >
                    <Text style={[textType.row, styles.saveBtnText, { color: c.onBrand }]}>
                      {saving ? 'กำลังบันทึก...' : 'บันทึกแล้วปิด'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <FadeInView>
                    <Pressable style={[styles.resultRow, { borderBottomColor: c.line }]} onPress={() => pickFood(item)}>
                      <FoodVisual name={item.name} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[textType.row, { color: c.text, fontSize: 15 }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>{Math.round(item.kcalPer100)} kcal/100g</Text>
                      </View>
                    </Pressable>
                  </FadeInView>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={[textType.label, { color: c.subtext, textAlign: 'center' }]}>
                      ไม่พบอาหาร ลองพิมพ์คำอื่น หรือเพิ่มเอง
                    </Text>
                    {query.trim().length > 0 && (
                      <Pressable style={[styles.askNumiBtn, { backgroundColor: c.brandTint }]} onPress={askNumiToEstimate}>
                        <Sparkles size={15} color={c.brand} />
                        <Text style={[textType.row, { color: c.brand, fontSize: 13 }]} numberOfLines={1}>
                          ให้ Numi ช่วยประมาณ "{query.trim()}"
                        </Text>
                      </Pressable>
                    )}
                  </View>
                }
              />
            )}

            {!selected && (
              <Pressable style={styles.manualLink} onPress={() => setShowManual(true)}>
                <Text style={[textType.row, { color: c.brand, fontSize: 14 }]}>+ ไม่เจอ พิมพ์ข้อมูลเอง</Text>
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.manualForm}>
            <ManualInput label="ชื่ออาหาร" value={manualName} onChange={setManualName} c={c} />
            <ManualInput label="แคลอรี่ต่อ 100g" value={manualKcal} onChange={setManualKcal} c={c} numeric />
            <ManualInput label="โปรตีน (g/100g)" value={manualProtein} onChange={setManualProtein} c={c} numeric />
            <ManualInput label="คาร์บ (g/100g)" value={manualCarb} onChange={setManualCarb} c={c} numeric />
            <ManualInput label="ไขมัน (g/100g)" value={manualFat} onChange={setManualFat} c={c} numeric />

            <View style={styles.amountRow}>
              <Text style={[textType.label, { color: c.subtext }]}>ปริมาณที่กิน</Text>
              <AmountStepper value={amountG} onChange={setAmountG} />
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]}
              disabled={saving || !manualName.trim() || !manualKcal}
              onPress={handleConfirmManual}
            >
              <Text style={[textType.row, styles.saveBtnText, { color: c.onBrand }]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Pressable>

            <Pressable onPress={() => setShowManual(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={[textType.label, { color: c.subtext }]}>กลับไปค้นหา</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ManualInput({
  label,
  value,
  onChange,
  c,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  c: ReturnType<typeof useTheme>;
  numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[textType.label, { color: c.subtext, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={[styles.input, { color: c.text, borderColor: c.line, backgroundColor: c.surface, fontFamily: fontFamily(500) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mealRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  mealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 36,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radius.iconBox,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualLink: { alignItems: 'center', paddingVertical: 14 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 20, paddingHorizontal: 24 },
  askNumiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 38,
  },
  selectedCard: { margin: 16, padding: 16, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
  selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  selectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  unitPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  previewText: { fontSize: 13, marginTop: 10 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnFlex: { flex: 1, marginTop: 0 },
  saveRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch', marginTop: 16 },
  saveMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    borderRadius: radius.iconBox,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.iconBox,
  },
  saveBtnText: { fontSize: 15 },
  manualForm: { padding: 16 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
