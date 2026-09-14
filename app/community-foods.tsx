import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Flag, Download } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { getErrorMessage } from '../lib/errors';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, MIN_TOUCH } from '../lib/theme';
import { Squish } from '../components/squish';
import { FoodVisual } from '../components/food-visual';
import { EmptyState } from '../components/empty-state';
import { importCommunityFood } from '../lib/db/queries';
import { browseApprovedFoods, getMySubmissions, reportFood, type CommunityFood } from '../lib/social/community-foods';

type Tab = 'browse' | 'mine';

const STATUS_LABEL: Record<CommunityFood['status'], string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
};

export default function CommunityFoodsScreen() {
  const c = useTheme();
  const [tab, setTab] = useState<Tab>('browse');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommunityFood[]>([]);
  const [mine, setMine] = useState<CommunityFood[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadBrowse = useCallback((q: string) => {
    setLoading(true);
    browseApprovedFoods(q)
      .then(setResults)
      .catch((e) => Alert.alert('ค้นหาไม่สำเร็จ', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadMine = useCallback(() => {
    setLoading(true);
    getMySubmissions()
      .then(setMine)
      .catch((e) => Alert.alert('โหลดไม่สำเร็จ', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'browse') return;
    const timer = setTimeout(() => loadBrowse(query), 250);
    return () => clearTimeout(timer);
  }, [query, tab, loadBrowse]);

  useFocusEffect(
    useCallback(() => {
      if (tab === 'mine') loadMine();
    }, [tab, loadMine])
  );

  async function handleImport(food: CommunityFood) {
    try {
      await importCommunityFood({
        communityFoodId: food.id,
        name: food.name,
        nameEn: food.nameEn,
        brand: food.brand,
        kcalPer100: food.kcalPer100,
        proteinPer100: food.proteinPer100,
        carbPer100: food.carbPer100,
        fatPer100: food.fatPer100,
        fiberPer100: food.fiberPer100,
        sodiumPer100: food.sodiumPer100,
        servingUnits: food.servingUnits,
      });
      setImportedIds((prev) => new Set(prev).add(food.id));
    } catch (e) {
      Alert.alert('นำเข้าไม่สำเร็จ', getErrorMessage(e));
    }
  }

  function handleReport(food: CommunityFood) {
    Alert.alert('รายงานเมนูนี้', `รายงาน "${food.name}" ว่าข้อมูลไม่เหมาะสมหรือผิด?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'รายงาน',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportFood(food.id);
            Alert.alert('รายงานแล้ว', 'ขอบคุณที่ช่วยตรวจสอบ');
          } catch (e) {
            Alert.alert('รายงานไม่สำเร็จ', getErrorMessage(e));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <View style={styles.tabRow}>
        {(['browse', 'mine'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Squish key={t} onPress={() => setTab(t)} style={[styles.tabPill, { backgroundColor: active ? c.brandTint : c.surfaceAlt }]}>
              <Text style={[textType.row, { fontSize: 13, color: active ? c.brand : c.text }]}>
                {t === 'browse' ? 'ค้นหา' : 'ที่ฉันส่ง'}
              </Text>
            </Squish>
          );
        })}
      </View>

      {tab === 'browse' ? (
        <>
          <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
            <Search size={16} color={c.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาเมนูที่ชุมชนช่วยกันเพิ่ม"
              placeholderTextColor={c.faint}
              style={[styles.searchInput, { color: c.text, fontFamily: fontFamily(500) }]}
            />
          </View>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              !loading ? <EmptyState title="ยังไม่พบเมนู" description="ลองค้นด้วยคำอื่น หรือเป็นคนแรกที่แชร์เมนูนี้จากหน้าเพิ่มอาหาร" /> : null
            }
            renderItem={({ item }) => {
              const imported = importedIds.has(item.id);
              return (
                <View style={[styles.resultRow, { borderBottomColor: c.line }]}>
                  <FoodVisual name={item.name} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[textType.row, { color: c.text, fontSize: 15 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>{Math.round(item.kcalPer100)} kcal/100g</Text>
                  </View>
                  <Squish scaleTo={0.9} onPress={() => handleReport(item)} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
                    <Flag size={15} color={c.faint} />
                  </Squish>
                  <Squish
                    scaleTo={0.9}
                    disabled={imported}
                    onPress={() => handleImport(item)}
                    style={[styles.iconBtn, { backgroundColor: imported ? c.brandTint : c.surfaceAlt }]}
                  >
                    <Download size={15} color={imported ? c.brand : c.muted} />
                  </Squish>
                </View>
              );
            }}
            ListFooterComponent={
              results.length > 0 ? (
                <View style={[styles.tipBox, { backgroundColor: c.cream }]}>
                  <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 19 }]}>
                    เมนูที่แชร์ต้องผ่านการตรวจก่อนคนอื่นจะเห็น ตอนกรอกเองติ๊ก "แชร์เมนูนี้" ได้เลย
                  </Text>
                </View>
              ) : null
            }
          />
        </>
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="ยังไม่เคยส่งเมนู"
                description={'ตอนเพิ่มอาหารใหม่ เปิดตัวเลือก "แชร์เมนูนี้ให้คนอื่นเห็นด้วย" ได้เลย'}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.resultRow, { borderBottomColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[textType.row, { color: c.text, fontSize: 15 }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[textType.label, { color: c.muted, fontSize: 12 }]}>{Math.round(item.kcalPer100)} kcal/100g</Text>
                {item.status === 'rejected' && item.rejectionReason && (
                  <Text style={[textType.label, { color: c.danger, fontSize: 11, marginTop: 2 }]}>เหตุผล: {item.rejectionReason}</Text>
                )}
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      item.status === 'approved' ? c.brandTint : item.status === 'rejected' ? c.dangerBg : c.fatBg,
                  },
                ]}
              >
                <Text
                  style={[
                    textType.badge,
                    {
                      fontSize: 10.5,
                      color: item.status === 'approved' ? c.brand : item.status === 'rejected' ? c.danger : c.fatText,
                    },
                  ]}
                >
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  tabPill: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, height: MIN_TOUCH },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 52,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultRow: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.cardInner, alignItems: 'center', justifyContent: 'center' },
  statusPill: { height: 28, paddingHorizontal: 10, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center' },
  tipBox: { borderRadius: radius.cardInner, padding: 14, marginHorizontal: 16, marginTop: 4 },
});
