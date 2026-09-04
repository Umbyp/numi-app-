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
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { AmountStepper } from '../components/amount-stepper';
import { searchFoods, addMealEntry, createUserFood, type MealType } from '../lib/db/queries';
import { scaleFood } from '../lib/nutrition';
import type { foods as foodsTable } from '../lib/db/schema';

type Food = typeof foodsTable.$inferSelect;

const MEAL_OPTIONS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'เช้า' },
  { key: 'lunch', label: 'กลางวัน' },
  { key: 'dinner', label: 'เย็น' },
  { key: 'snack', label: 'ของว่าง' },
];

export default function AddFoodScreen() {
  const c = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType }>();

  const [mealType, setMealType] = useState<MealType>(params.mealType ?? 'lunch');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [amountG, setAmountG] = useState(100);
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  // manual food fields
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');

  useEffect(() => {
    searchFoods(query).then(setResults);
  }, [query]);

  function pickFood(food: Food) {
    setSelected(food);
    const firstUnit = food.servingUnits?.[0];
    setAmountG(firstUnit?.grams ?? 100);
  }

  async function handleConfirmSelected() {
    if (!selected) return;
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.mealRow}>
          {MEAL_OPTIONS.map((opt) => {
            const active = opt.key === mealType;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setMealType(opt.key)}
                style={[
                  styles.mealPill,
                  { borderColor: c.border },
                  active && { backgroundColor: c.primary, borderColor: c.primary },
                ]}
              >
                <Text style={{ color: active ? '#fff' : c.text, fontSize: 13 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!showManual ? (
          <>
            <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.card }]}>
              <Search size={16} color={c.subtext} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ค้นหาอาหาร เช่น กะเพรา, ข้าวมันไก่"
                placeholderTextColor={c.subtext}
                style={[styles.searchInput, { color: c.text }]}
              />
            </View>

            {selected ? (
              <View style={[styles.selectedCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.selectedHeader}>
                  <Text style={[styles.selectedName, { color: c.text }]} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                    <X size={18} color={c.subtext} />
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
                          { borderColor: c.border },
                          amountG === u.grams && { backgroundColor: c.ghostBg },
                        ]}
                      >
                        <Text style={{ color: c.text, fontSize: 12 }}>{u.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.amountRow}>
                  <Text style={{ color: c.subtext, fontSize: 13 }}>ปริมาณ</Text>
                  <AmountStepper value={amountG} onChange={setAmountG} />
                </View>

                {scaledPreview && (
                  <Text style={[styles.previewText, { color: c.text }]}>
                    {Math.round(scaledPreview.kcal)} kcal · P {scaledPreview.proteinG.toFixed(1)}g · C{' '}
                    {scaledPreview.carbG.toFixed(1)}g · F {scaledPreview.fatG.toFixed(1)}g
                  </Text>
                )}

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={handleConfirmSelected}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable style={[styles.resultRow, { borderBottomColor: c.border }]} onPress={() => pickFood(item)}>
                    <Text style={{ color: c.text, fontSize: 15 }}>{item.name}</Text>
                    <Text style={{ color: c.subtext, fontSize: 12 }}>{Math.round(item.kcalPer100)} kcal/100g</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={{ color: c.subtext, textAlign: 'center', marginTop: 20 }}>
                    ไม่พบอาหาร ลองพิมพ์คำอื่น หรือเพิ่มเอง
                  </Text>
                }
              />
            )}

            {!selected && (
              <Pressable style={styles.manualLink} onPress={() => setShowManual(true)}>
                <Text style={{ color: c.primary, fontWeight: '500' }}>+ ไม่เจอ พิมพ์ข้อมูลเอง</Text>
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
              <Text style={{ color: c.subtext, fontSize: 13 }}>ปริมาณที่กิน</Text>
              <AmountStepper value={amountG} onChange={setAmountG} />
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]}
              disabled={saving || !manualName.trim() || !manualKcal}
              onPress={handleConfirmManual}
            >
              <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </Pressable>

            <Pressable onPress={() => setShowManual(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: c.subtext }}>กลับไปค้นหา</Text>
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
      <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mealRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  mealPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  manualLink: { alignItems: 'center', paddingVertical: 14 },
  selectedCard: { margin: 16, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  unitPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  previewText: { fontSize: 13, marginTop: 10 },
  saveBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  manualForm: { padding: 16 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
