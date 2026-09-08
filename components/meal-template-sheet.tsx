import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import {
  getMealTemplates,
  applyMealTemplate,
  createTemplateFromMeal,
  deleteMealTemplate,
  getMealEntriesForDate,
  type MealType,
} from '../lib/db/queries';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

type Template = Awaited<ReturnType<typeof getMealTemplates>>[number];

interface Props {
  visible: boolean;
  /** pick = เลือกมื้อชุดมาลง, save = เก็บมื้อที่บันทึกไว้แล้วเป็นมื้อชุดใหม่ */
  mode: 'pick' | 'save';
  mealType: MealType;
  mealLabel: string;
  localDate: string;
  onClose: () => void;
  onDone: () => void;
}

/** มื้อชุด — ชุดอาหารที่กินซ้ำบ่อย กดครั้งเดียวลงทั้งมื้อ */
export function MealTemplateSheet({ visible, mode, mealType, mealLabel, localDate, onClose, onDone }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'pick') {
      getMealTemplates().then(setTemplates);
      return;
    }
    // ตั้งชื่อให้ล่วงหน้าจากรายการหลัก จะได้กดบันทึกได้เลยโดยไม่ต้องคิดชื่อ
    getMealEntriesForDate(localDate).then((rows) => {
      const mine = rows.filter((r) => r.mealType === mealType);
      if (mine.length === 1) setName(mine[0].name);
      else if (mine.length > 1) setName(`${mine[0].name} +${mine.length - 1}`);
    });
  }, [visible, mode, mealType, localDate]);

  async function handleApply(tpl: Template) {
    setBusy(true);
    try {
      await applyMealTemplate(tpl.id, mealType);
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(tpl: Template) {
    Alert.alert('ลบมื้อชุด', `ลบ "${tpl.name}" ออกจากรายการ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          await deleteMealTemplate(tpl.id);
          setTemplates(await getMealTemplates());
        },
      },
    ]);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('ยังไม่ได้ตั้งชื่อ', 'ตั้งชื่อมื้อชุดเพื่อให้หาเจอทีหลัง');
      return;
    }
    setBusy(true);
    try {
      const id = await createTemplateFromMeal(trimmed, localDate, mealType);
      if (!id) {
        Alert.alert('บันทึกไม่ได้', 'มื้อนี้ไม่มีรายการอาหาร');
        return;
      }
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={[styles.sheet, { backgroundColor: c.surface }, cardShadow(scheme)]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>
              {mode === 'pick' ? `เลือกมื้อชุดลงมื้อ${mealLabel}` : `เก็บมื้อ${mealLabel}นี้เป็นมื้อชุด`}
            </Text>

            {mode === 'save' ? (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="เช่น ข้าวเช้าปกติ"
                  placeholderTextColor={c.faint}
                  style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
                />
                <Pressable
                  onPress={handleSave}
                  disabled={busy}
                  style={[styles.primaryBtn, { backgroundColor: c.brand }, busy && { opacity: 0.6 }]}
                >
                  <Text style={[type.row, { color: '#fff', fontSize: 14 }]}>
                    {busy ? 'กำลังบันทึก...' : 'บันทึกมื้อชุด'}
                  </Text>
                </Pressable>
              </>
            ) : templates.length === 0 ? (
              <Text style={[type.label, { color: c.faint, fontSize: 12.5, lineHeight: 19 }]}>
                ยังไม่มีมื้อชุด — บันทึกมื้อให้ครบก่อน แล้วกด “เก็บเป็นมื้อชุด” ที่ท้ายมื้อนั้น
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {templates.map((tpl) => {
                  const kcal = tpl.items.reduce((s, x) => s + x.kcal, 0);
                  return (
                    <View key={tpl.id} style={[styles.row, { backgroundColor: c.surfaceAlt }]}>
                      <Pressable style={{ flex: 1 }} disabled={busy} onPress={() => handleApply(tpl)}>
                        <Text style={[type.row, { color: c.text, fontSize: 14 }]} numberOfLines={1}>
                          {tpl.name}
                        </Text>
                        <Text style={[type.label, { color: c.muted, fontSize: 11 }]} numberOfLines={1}>
                          {tpl.items.length} รายการ · {Math.round(kcal)} kcal
                          {tpl.useCount > 0 ? ` · ใช้ไป ${tpl.useCount} ครั้ง` : ''}
                        </Text>
                      </Pressable>
                      <Pressable hitSlop={10} onPress={() => handleDelete(tpl)}>
                        <Trash2 size={15} color={c.faint} />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={[type.row, { color: c.subtext, fontSize: 14 }]}>ปิด</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, borderRadius: radius.card, padding: 20, gap: 12 },
  input: { borderRadius: radius.iconBox, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  primaryBtn: { borderRadius: radius.iconBox, paddingVertical: 13, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 4 },
});
