import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/hooks/use-theme';
import { getMealEntriesForDate, createTemplateFromMeal, type MealType } from '../lib/db/queries';
import { localDateString } from '../lib/dates';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'เช้า',
  lunch: 'กลางวัน',
  dinner: 'เย็น',
  snack: 'ของว่าง',
};

interface Item {
  id: string;
  name: string;
  amountG: number;
  kcal: number;
}

export default function SaveTemplateScreen() {
  const c = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; mealType?: MealType }>();
  const date = params.date ?? localDateString();
  const mealType = (params.mealType ?? 'lunch') as MealType;

  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMealEntriesForDate(date).then((rows) => {
      const mine = rows
        .filter((r) => r.mealType === mealType)
        .map((r) => ({ id: r.id, name: r.name, amountG: r.amountG, kcal: r.kcal }));
      setItems(mine);
      // ตั้งชื่อให้ล่วงหน้าจากรายการหลัก จะได้กดบันทึกได้เลยโดยไม่ต้องคิดชื่อ
      if (mine.length === 1) setName(mine[0].name);
      else if (mine.length > 1) setName(`${mine[0].name} +${mine.length - 1}`);
    });
  }, [date, mealType]);

  const totalKcal = items.reduce((s, i) => s + i.kcal, 0);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('ยังไม่ได้ตั้งชื่อ', 'ตั้งชื่อมื้อชุดเพื่อให้หาเจอทีหลัง');
      return;
    }
    setSaving(true);
    try {
      const id = await createTemplateFromMeal(trimmed, date, mealType);
      if (!id) {
        Alert.alert('บันทึกไม่ได้', 'มื้อนี้ไม่มีรายการอาหาร');
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.subtext, fontSize: 13 }}>
          เก็บมื้อ{MEAL_LABELS[mealType]}นี้ไว้ กดครั้งเดียวก็บันทึกได้ทั้งชุด
        </Text>

        <View>
          <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 6 }}>ชื่อมื้อชุด</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="เช่น ข้าวเช้าปกติ"
            placeholderTextColor={c.subtext}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {items.length === 0 ? (
            <Text style={{ color: c.subtext, fontSize: 13 }}>มื้อนี้ยังไม่มีรายการอาหาร</Text>
          ) : (
            <>
              {items.map((i) => (
                <View key={i.id} style={styles.itemRow}>
                  <Text style={{ color: c.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {i.name}
                  </Text>
                  <Text style={{ color: c.subtext, fontSize: 12 }}>
                    {Math.round(i.amountG)} g · {Math.round(i.kcal)} kcal
                  </Text>
                </View>
              ))}
              <View style={[styles.totalRow, { borderTopColor: c.border }]}>
                <Text style={{ color: c.subtext, fontSize: 13, flex: 1 }}>รวม</Text>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                  {Math.round(totalKcal)} kcal
                </Text>
              </View>
            </>
          )}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving || items.length === 0}
          style={[
            styles.saveBtn,
            { backgroundColor: c.primary },
            (saving || items.length === 0) && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.saveBtnText}>{saving ? 'กำลังบันทึก...' : 'บันทึกมื้อชุด'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 2,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
