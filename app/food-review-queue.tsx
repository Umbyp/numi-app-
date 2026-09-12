import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getErrorMessage } from '../lib/errors';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius } from '../lib/theme';
import { Squish } from '../components/squish';
import { EmptyState } from '../components/empty-state';
import { isModerator, listPendingForReview, approveFood, rejectFood, type CommunityFood } from '../lib/social/community-foods';

export default function FoodReviewQueueScreen() {
  const c = useTheme();
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
        ListEmptyComponent={!loading ? <EmptyState title="ไม่มีรายการรอตรวจ" description="เมนูใหม่ที่ผู้ใช้ส่งมาจะโผล่ที่นี่" /> : null}
        renderItem={({ item }) => {
          const rejecting = rejectingId === item.id;
          return (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[textType.cardTitle, { color: c.text, fontSize: 15, flex: 1 }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.reportCount > 0 && (
                  <Text style={[textType.badge, { color: c.danger, fontSize: 10 }]}>ถูกรายงาน {item.reportCount} ครั้ง</Text>
                )}
              </View>
              <Text style={[textType.label, { color: c.muted, fontSize: 12, marginTop: 4 }]}>
                {Math.round(item.kcalPer100)} kcal · P {item.proteinPer100}g · C {item.carbPer100}g · F {item.fatPer100}g (ต่อ 100g)
              </Text>

              {rejecting ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="เหตุผลที่ปฏิเสธ"
                    placeholderTextColor={c.faint}
                    style={[styles.input, { color: c.text, borderColor: c.line, fontFamily: fontFamily(500) }]}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Squish
                      style={[styles.actionBtn, { backgroundColor: c.surfaceAlt, flex: 1 }]}
                      onPress={() => {
                        setRejectingId(null);
                        setReason('');
                      }}
                    >
                      <Text style={[textType.row, { color: c.subtext, fontSize: 13 }]}>ยกเลิก</Text>
                    </Squish>
                    <Squish
                      style={[styles.actionBtn, { backgroundColor: c.danger, flex: 1 }, !reason.trim() && { opacity: 0.5 }]}
                      disabled={!reason.trim()}
                      onPress={() => handleReject(item.id)}
                    >
                      <Text style={[textType.row, { color: '#fff', fontSize: 13 }]}>ยืนยันปฏิเสธ</Text>
                    </Squish>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Squish style={[styles.actionBtn, { backgroundColor: c.surfaceAlt, flex: 1 }]} onPress={() => setRejectingId(item.id)}>
                    <X size={15} color={c.muted} />
                    <Text style={[textType.row, { color: c.text, fontSize: 13 }]}>ปฏิเสธ</Text>
                  </Squish>
                  <Squish style={[styles.actionBtn, { backgroundColor: c.brand, flex: 1 }]} onPress={() => handleApprove(item.id)}>
                    <Check size={15} color="#fff" />
                    <Text style={[textType.row, { color: '#fff', fontSize: 13 }]}>อนุมัติ</Text>
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

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 14, marginBottom: 12 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  actionBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.iconBox, paddingVertical: 10 },
});
