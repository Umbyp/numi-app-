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
import { Trash2, Plus } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import {
  getMealTemplates,
  applyMealTemplate,
  createTemplateFromMeal,
  deleteMealTemplate,
  getMealEntriesForDate,
  type MealType,
} from '../lib/db/queries';
import { type } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';
import { Squish } from './squish';
import { Mascot } from './mascot';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: c.line }]} />

          <View>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 18 }]}>
              {mode === 'pick' ? `มื้อชุดสำหรับมื้อ${mealLabel}` : `เก็บมื้อ${mealLabel}นี้เป็นมื้อชุด`}
            </Text>
            {mode === 'pick' && (
              <Text style={[type.label, { color: c.subtext, fontSize: 12.5, lineHeight: 19, marginTop: 2 }]}>
                ชุดที่เคยเก็บไว้ กดครั้งเดียวบันทึกทั้งชุด
              </Text>
            )}
          </View>

          {mode === 'save' ? (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="เช่น ข้าวเช้าปกติ"
                placeholderTextColor={c.faint}
                style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
              />
              <Squish
                onPress={handleSave}
                disabled={busy}
                style={[styles.primaryBtn, { backgroundColor: c.brand }, busy && { opacity: 0.6 }]}
              >
                <Text style={[type.row, { color: '#fff', fontSize: 14 }]}>
                  {busy ? 'กำลังบันทึก...' : 'บันทึกมื้อชุด'}
                </Text>
              </Squish>
            </>
          ) : templates.length === 0 ? (
            <Text style={[type.label, { color: c.faint, fontSize: 12.5, lineHeight: 19 }]}>
              ยังไม่มีมื้อชุด — บันทึกมื้อให้ครบก่อน แล้วกด “เก็บเป็นมื้อชุด” ที่ท้ายมื้อนั้น
            </Text>
          ) : (
            <>
              <ScrollView style={{ maxHeight: 320 }}>
                <View style={{ gap: 9 }}>
                  {templates.map((tpl) => {
                    const kcal = tpl.items.reduce((s, x) => s + x.kcal, 0);
                    const protein = tpl.items.reduce((s, x) => s + x.proteinG, 0);
                    return (
                      <View key={tpl.id} style={[styles.row, { backgroundColor: c.surfaceAlt }]}>
                        <Squish style={{ flex: 1, minWidth: 0 }} disabled={busy} onPress={() => handleApply(tpl)}>
                          <Text style={[type.row, { color: c.text, fontSize: 15 }]} numberOfLines={1}>
                            {tpl.name}
                          </Text>
                          <Text style={[type.label, { color: c.muted, fontSize: 11.5 }]} numberOfLines={1}>
                            {tpl.items.length} อย่าง · {Math.round(kcal)} kcal · โปรตีน {Math.round(protein)} ก.
                            {tpl.useCount > 0 ? ` · ใช้ไป ${tpl.useCount} ครั้ง` : ''}
                          </Text>
                        </Squish>
                        <Squish hitSlop={15} onPress={() => handleDelete(tpl)}>
                          <Trash2 size={15} color={c.faint} />
                        </Squish>
                        <Squish
                          disabled={busy}
                          onPress={() => handleApply(tpl)}
                          style={[styles.applyBtn, { backgroundColor: c.brand }]}
                        >
                          <Plus size={20} color="#fff" />
                        </Squish>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={[styles.divider, { backgroundColor: c.line }]} />

              <View style={styles.hintRow}>
                <Mascot pose="heart" size={56} />
                <Text style={[type.label, { color: c.text, fontSize: 12.5, lineHeight: 19, flex: 1 }]}>
                  กินมื้อเดิมบ่อย ๆ ใช่ไหม บันทึกมื้อนี้เสร็จแล้วกด “เก็บเป็นมื้อชุด” ไว้ใช้ครั้งหน้าได้
                </Text>
              </View>
            </>
          )}

          <Squish onPress={onClose} style={[styles.cancelBtn, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[type.row, { color: c.text, fontSize: 15 }]}>ปิด</Text>
          </Squish>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.34)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 15,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  input: { height: MIN_TOUCH, borderRadius: radius.cardInner, paddingHorizontal: 14, fontSize: 15 },
  primaryBtn: { height: 52, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card - 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  applyBtn: { width: 48, height: 48, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: radius.cardInner },
});
