import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/hooks/use-theme';
import { getWeightHistory } from '../lib/db/queries';
import { type } from '../lib/fonts';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function WeightHistoryScreen() {
  const c = useTheme();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getWeightHistory>>>([]);

  useEffect(() => {
    getWeightHistory(365).then((rows) => setHistory([...rows].reverse()));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <FlatList
        data={history}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
        ListEmptyComponent={
          <Text style={[type.label, { color: c.subtext, textAlign: 'center', marginTop: 24 }]}>ยังไม่มีประวัติน้ำหนัก</Text>
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.localDate}T00:00:00`);
          return (
            <View style={styles.row}>
              <Text style={[type.row, { color: c.text, fontSize: 14 }]}>
                {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]} {d.getFullYear() + 543}
              </Text>
              <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>{item.weightKg.toFixed(1)} กก.</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
});
