import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Search, X } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { AmountStepper } from '../components/amount-stepper';
import { MealTypeIcon } from '../components/icons/meal-type-icons';
import { FoodVisual } from '../components/food-visual';
import { Mascot } from '../components/mascot';
import { FadeInView } from '../components/fade-in';
import { MEAL_TYPES, detectMealType, getMealTypeMeta, type MealType } from '../lib/meal-type';
import {
  searchFoods,
  addMealEntry,
  createUserFood,
  getMealEntryById,
  getFoodById,
  updateMealEntry,
  deleteMealEntry,
} from '../lib/db/queries';
import { scaleFood } from '../lib/nutrition';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import type { foods as foodsTable } from '../lib/db/schema';
import { Squish } from '../components/squish';

type Food = typeof foodsTable.$inferSelect;

export default function AddFoodScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; mode?: 'search' | 'manual'; entryId?: string }>();
  const isEditing = !!params.entryId;

  const [mealType, setMealType] = useState<MealType>(params.mealType ?? detectMealType());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [amountG, setAmountG] = useState(100);
  const [showManual, setShowManual] = useState(params.mode === 'manual');
  const [saving, setSaving] = useState(false);

  // แก้ไขรายการที่บันทึกไว้แล้ว — โหลดอาหารเดิมกับปริมาณเดิมมาแทนที่จะเริ่มค้นหาใหม่
  useEffect(() => {
    if (!params.entryId) return;
    (async () => {
      const entry = await getMealEntryById(params.entryId!);
      if (!entry) return;
      setMealType(entry.mealType as MealType);
      setAmountG(entry.amountG);
      if (entry.foodId) {
        const food = await getFoodById(entry.foodId);
        if (food) setSelected(food);
      }
    })();
  }, [params.entryId]);

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

  async function handleConfirmSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      const scaled = scaleFood(selected, amountG);
      if (params.entryId) {
        await updateMealEntry(params.entryId, {
          mealType,
          amountG,
          kcal: scaled.kcal,
          proteinG: scaled.proteinG,
          carbG: scaled.carbG,
          fatG: scaled.fatG,
          estimated: selected.source === 'ai',
        });
      } else {
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
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry() {
    if (!params.entryId) return;
    setSaving(true);
    try {
      await deleteMealEntry(params.entryId);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
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
      <Stack.Screen options={{ title: isEditing ? 'แก้ไขอาหาร' : 'เพิ่มอาหาร' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.mealRow}>
          {MEAL_TYPES.map((opt) => {
            const active = opt.key === mealType;
            return (
              <Squish
                key={opt.key}
                onPress={() => setMealType(opt.key)}
                style={[
                  styles.mealPill,
                  { backgroundColor: active ? c[opt.colorKey] : c.surfaceAlt },
                ]}
              >
                <MealTypeIcon type={opt.key} color={active ? '#fff' : c[opt.colorKey]} size={13} />
                <Text style={[textType.row, { fontSize: 13, color: active ? '#fff' : c.text }]}>{opt.label}</Text>
              </Squish>
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
                  <Squish onPress={() => setSelected(null)} hitSlop={10}>
                    <X size={18} color={c.muted} />
                  </Squish>
                </View>

                {selected.servingUnits && selected.servingUnits.length > 0 && (
                  <View style={styles.unitRow}>
                    {selected.servingUnits.map((u) => (
                      <Squish
                        key={u.label}
                        onPress={() => setAmountG(u.grams)}
                        style={[
                          styles.unitPill,
                          { backgroundColor: amountG === u.grams ? c.brandTint : c.surfaceAlt },
                        ]}
                      >
                        <Text style={[textType.label, { color: amountG === u.grams ? c.brand : c.subtext, fontSize: 12 }]}>{u.label}</Text>
                      </Squish>
                    ))}
                  </View>
                )}

                <View style={styles.amountRow}>
                  <Text style={[textType.row, { color: c.text, fontSize: 13.5 }]}>ปริมาณ (กรัม)</Text>
                  <AmountStepper value={amountG} onChange={setAmountG} />
                </View>

                {scaledPreview && (
                  <View style={[styles.macroPreviewCard, { backgroundColor: c.surfaceAlt }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[textType.metric, { color: c.text, fontSize: 34 }]}>{Math.round(scaledPreview.kcal)}</Text>
                      <Text style={[textType.label, { color: c.muted, fontSize: 12.5 }]}>kcal</Text>
                    </View>
                    <View style={styles.macroCols}>
                      <MacroCol label="โปรตีน" value={scaledPreview.proteinG} c={c} />
                      <MacroCol label="คาร์บ" value={scaledPreview.carbG} c={c} />
                      <MacroCol label="ไขมัน" value={scaledPreview.fatG} c={c} />
                    </View>
                  </View>
                )}

                <Squish scaleTo={0.97}
                  style={[styles.saveBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={handleConfirmSelected}
                >
                  <Text style={[textType.row, styles.saveBtnText]}>
                    {saving
                      ? 'กำลังบันทึก...'
                      : isEditing
                        ? 'บันทึกการแก้ไข'
                        : `บันทึกลงมื้อ${getMealTypeMeta(mealType).label}`}
                  </Text>
                </Squish>

                {isEditing && (
                  <Squish onPress={handleDeleteEntry} disabled={saving} style={{ alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={[textType.row, { color: c.danger, fontSize: 13.5 }]}>ลบเมนูนี้</Text>
                  </Squish>
                )}

                {selected.servingUnits && selected.servingUnits.length > 0 && (
                  <View style={[styles.disclaimerCard, { backgroundColor: c.cream }]}>
                    <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 20 }]}>
                      เลือกหน่วยที่คนพูดกันจริง (จาน ทัพพี แก้ว) ก่อน ค่อยให้ปรับกรัมเองถ้าต้องการ
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.resultsWrap}>
                {results.length > 0 && (
                  <View style={[styles.resultsCard, { backgroundColor: c.surface }, cardShadow(scheme)]}>
                    <FlatList
                      style={styles.resultsList}
                      data={results}
                      keyExtractor={(item) => item.id}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <FadeInView>
                          <Squish
                            scaleTo={0.98}
                            style={[
                              styles.resultRow,
                              index < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
                            ]}
                            onPress={() => pickFood(item)}
                          >
                            <FoodVisual name={item.name} size={38} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[textType.row, { color: c.text, fontSize: 15 }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>{Math.round(item.kcalPer100)} kcal/100g</Text>
                            </View>
                          </Squish>
                        </FadeInView>
                      )}
                    />
                  </View>
                )}

                {results.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={[textType.label, { color: c.subtext, textAlign: 'center' }]}>
                      ไม่พบอาหาร ลองพิมพ์คำอื่น หรือเพิ่มเอง
                    </Text>
                    {query.trim().length > 0 && (
                      <Squish style={[styles.askNumiCard, { backgroundColor: c.brandTint }]} onPress={askNumiToEstimate}>
                        <Mascot pose="idle" size={52} />
                        <Text style={[textType.row, { color: c.text, fontSize: 13, flex: 1, lineHeight: 19 }]}>
                          ไม่เจอที่ตรงเลย ให้ Numi ช่วยประมาณ &ldquo;{query.trim()}&rdquo; ให้ไหม
                        </Text>
                      </Squish>
                    )}
                  </View>
                )}
              </View>
            )}

            {!selected && (
              <Squish style={styles.manualLink} onPress={() => setShowManual(true)}>
                <Text style={[textType.row, { color: c.brand, fontSize: 14 }]}>+ ไม่เจอ พิมพ์ข้อมูลเอง</Text>
              </Squish>
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.manualForm} keyboardShouldPersistTaps="handled">
            <View style={[styles.stepCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <ManualInput label="ชื่ออาหาร" value={manualName} onChange={setManualName} c={c} />
              <ManualInput label="แคลอรี่ต่อ 100 กรัม" value={manualKcal} onChange={setManualKcal} c={c} numeric />
              <View style={styles.manualMacroRow}>
                <ManualInput label="โปรตีน (ก./100ก.)" value={manualProtein} onChange={setManualProtein} c={c} numeric compact />
                <ManualInput label="คาร์บ" value={manualCarb} onChange={setManualCarb} c={c} numeric compact />
                <ManualInput label="ไขมัน" value={manualFat} onChange={setManualFat} c={c} numeric compact />
              </View>

              <View style={styles.amountRow}>
                <Text style={[textType.row, { color: c.text, fontSize: 13.5 }]}>กินไปกี่กรัม</Text>
                <AmountStepper value={amountG} onChange={setAmountG} />
              </View>
            </View>

            {!!manualKcal && (
              <View style={[styles.manualTotalCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Text style={[textType.label, { color: c.subtext, fontSize: 11.5, flex: 1 }]}>มื้อนี้จะบันทึกเป็น</Text>
                <Text style={[textType.metric, { color: c.text, fontSize: 30 }]}>
                  {Math.round(((parseFloat(manualKcal) || 0) * amountG) / 100)}
                </Text>
                <Text style={[textType.label, { color: c.muted, fontSize: 12.5 }]}>kcal</Text>
              </View>
            )}

            <Squish scaleTo={0.97}
              style={[styles.saveBtn, { backgroundColor: c.brand }, saving && { opacity: 0.6 }]}
              disabled={saving || !manualName.trim() || !manualKcal}
              onPress={handleConfirmManual}
            >
              <Text style={[textType.row, styles.saveBtnText]}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Squish>

            <Squish onPress={() => setShowManual(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={[textType.row, { color: c.subtext, fontSize: 13.5 }]}>กลับไปค้นหา</Text>
            </Squish>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroCol({ label, value, c }: { label: string; value: number; c: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
      <Text style={[textType.row, { color: c.text, fontSize: 14.5 }]}>{value.toFixed(1)} ก.</Text>
    </View>
  );
}

function ManualInput({
  label,
  value,
  onChange,
  c,
  numeric,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  c: ReturnType<typeof useTheme>;
  numeric?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[{ marginBottom: 12 }, compact && { flex: 1, marginBottom: 0 }]}>
      <Text
        style={[textType.label, { color: c.subtext, marginBottom: 4, fontSize: compact ? 11.5 : 12.5 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(700), fontSize: 15 },
          compact && { textAlign: 'center' },
        ]}
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
  resultsWrap: { flex: 1, paddingHorizontal: 16 },
  resultsCard: { flex: 1, borderRadius: radius.card, overflow: 'hidden' },
  resultsList: { flex: 1 },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
  },
  manualLink: { alignItems: 'center', paddingVertical: 14 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 20, paddingHorizontal: 8 },
  askNumiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.cardInner,
    padding: 13,
    alignSelf: 'stretch',
  },
  selectedCard: { margin: 16, padding: 16, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth },
  selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  selectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  unitPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  macroPreviewCard: { borderRadius: radius.cardInner, padding: 14, marginTop: 12, gap: 10 },
  macroCols: { flexDirection: 'row', gap: 12 },
  disclaimerCard: { borderRadius: radius.cardInner, padding: 14, marginTop: 12 },
  saveBtn: { borderRadius: radius.iconBox, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15 },
  manualForm: { padding: 16, paddingBottom: 24 },
  stepCard: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  manualMacroRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  manualTotalCard: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 10 },
});
