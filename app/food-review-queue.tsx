import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { getErrorMessage } from '../lib/errors';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { Squish } from '../components/squish';
import { EmptyState } from '../components/empty-state';
import { isModerator, listPendingForReview, approveFood, rejectFood, type CommunityFood } from '../lib/social/community-foods';

export default function FoodReviewQueueScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const [items, setItems] = useState<CommunityFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const allowed = await isModerator();
      if (!allowed) {
        Alert.alert('ไม่มีสิทธิ์เข้าถึง', 'หน้านี้สำหรับผู้ตรวจสอบเท่านั้น');
        router.back();
        return;
      }
      setItems(await listPendingForReview());
    } catch (e) {
      Alert.alert('โหลดคิวไม่สำเร็จ', getErrorMessage(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleApprove(id: string) {
    try {
      await approveFood(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      Alert.alert('อนุมัติไม่สำเร็จ', getErrorMessage(e));
    }
  }

  async function handleReject(id: string) {
    if (!reason.trim()) return;
    try {
      await rejectFood(id, reason.trim());
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRejectingId(null);
      setReason('');
    } catch (e) {
      Alert.alert('ปฏิเสธไม่สำเร็จ', getErrorMessage(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={[textType.label, { color: c.muted, fontSize: 12.5, marginBottom: 10, paddingHorizontal: 2 }]}>
              รอ {items.length} รายการ
            </Text>
          ) : null
        }
        ListEmptyComponent={!loading ? <EmptyState title="ไม่มีรายการรอตรวจ" description="เมนูใหม่ที่ผู้ใช้ส่งมาจะโผล่ที่นี่" /> : null}
        renderItem={({ item }) => {
          const rejecting = rejectingId === item.id;
          return (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 16, flex: 1 }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.reportCount > 0 && (
                  <View style={[styles.reportPill, { backgroundColor: c.dangerBg }]}>
                    <Text style={[textType.badge, { color: c.danger, fontSize: 10.5 }]}>ถูกรายงาน {item.reportCount} ครั้ง</Text>
                  </View>
                )}
              </View>

              <View style={[styles.macroChipRow, { backgroundColor: c.surfaceAlt }]}>
                <MacroStat label="kcal/100g" value={Math.round(item.kcalPer100)} c={c} />
                <MacroStat label="โปรตีน" value={item.proteinPer100} c={c} />
                <MacroStat label="คาร์บ" value={item.carbPer100} c={c} />
                <MacroStat label="ไขมัน" value={item.fatPer100} c={c} />
              </View>

              {rejecting ? (
                <View style={{ gap: 10 }}>
                  <View>
                    <Text style={[textType.row, { color: c.subtext, fontSize: 12, marginBottom: 6 }]}>เหตุผลที่ปฏิเสธ</Text>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="ตัวเลขไม่ตรงกับสูตรทั่วไปของเมนูนี้"
                      placeholderTextColor={c.faint}
                      multiline
                      style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(500) }]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 9 }}>
                    <Squish
                      style={[styles.actionBtn, { backgroundColor: c.surfaceAlt, flex: 1 }]}
                      onPress={() => {
                        setRejectingId(null);
                        setReason('');
                      }}
                    >
                      <Text style={[textType.row, { color: c.subtext, fontSize: 14 }]}>ยกเลิก</Text>
                    </Squish>
                    <Squish
                      style={[styles.actionBtn, { backgroundColor: c.danger, flex: 1 }, !reason.trim() && { opacity: 0.5 }]}
                      disabled={!reason.trim()}
                      onPress={() => handleReject(item.id)}
                    >
                      <Text style={[textType.row, { color: '#fff', fontSize: 14.5 }]}>ยืนยันปฏิเสธ</Text>
                    </Squish>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  <Squish style={[styles.actionBtn, { backgroundColor: c.surfaceAlt, flex: 1 }]} onPress={() => setRejectingId(item.id)}>
                    <X size={15} color={c.muted} />
                    <Text style={[textType.row, { color: c.text, fontSize: 14 }]}>ปฏิเสธ</Text>
                  </Squish>
                  <Squish style={[styles.actionBtn, { backgroundColor: c.brand, flex: 1 }]} onPress={() => handleApprove(item.id)}>
                    <Check size={15} color="#fff" />
                    <Text style={[textType.row, { color: '#fff', fontSize: 14.5 }]}>อนุมัติ</Text>
                  </Squish>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function MacroStat({ label, value, c }: { label: string; value: number; c: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[textType.label, { color: c.muted, fontSize: 11 }]}>{label}</Text>
      <Text style={[textType.cardTitle, { color: c.text, fontSize: 16, marginTop: 2 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16, marginBottom: 12, gap: 12 },
  macroChipRow: { flexDirection: 'row', gap: 12, borderRadius: radius.cardInner, padding: 13 },
  reportPill: { height: 26, paddingHorizontal: 9, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { minHeight: 58, borderRadius: radius.cardInner, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, textAlignVertical: 'top' },
  actionBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.cardInner, height: 52 },
});
