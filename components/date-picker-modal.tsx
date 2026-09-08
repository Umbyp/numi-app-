import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { localDateString } from '../lib/nutrition';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

interface Props {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

/** เดือนที่แสดง ต้องเริ่มจาก 1 เสมอ เพื่อคำนวณ offset วันแรกของเดือนได้ตรง */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function DatePickerModal({ visible, selectedDate, onSelect, onClose }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date(`${selectedDate}T00:00:00`)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstWeekday = (viewMonth.getDay() + 6) % 7; // 0 = จันทร์
  const totalDays = daysInMonth(viewMonth);
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  function goMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <View style={styles.headerRow}>
            <Pressable hitSlop={10} onPress={() => goMonth(-1)}>
              <ChevronLeft size={20} color={c.subtext} />
            </Pressable>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 15 }]}>
              {THAI_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
            </Text>
            <Pressable hitSlop={10} onPress={() => goMonth(1)}>
              <ChevronRight size={20} color={c.subtext} />
            </Pressable>
          </View>

          <View style={styles.weekLabelRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={[type.label, { color: c.faint, fontSize: 11, width: 36, textAlign: 'center' }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={styles.cell} />;
              const ds = localDateString(d);
              const isFuture = d > today;
              const isSelected = ds === selectedDate;
              const isToday = ds === localDateString(today);
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.cell,
                    styles.dayCircle,
                    isSelected && { backgroundColor: c.brand },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: c.brand },
                  ]}
                  disabled={isFuture}
                  onPress={() => onSelect(ds)}
                >
                  <Text
                    style={[
                      type.row,
                      { fontSize: 13, color: isSelected ? c.onBrand : isFuture ? c.faint : c.text },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.todayBtn, { backgroundColor: c.surfaceAlt }]}
            onPress={() => {
              setViewMonth(startOfMonth(today));
              onSelect(localDateString(today));
            }}
          >
            <Text style={[type.row, { color: c.brand, fontSize: 13 }]}>วันนี้</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,35,61,0.34)' },
  centerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 340, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  dayCircle: { borderRadius: 18 },
  todayBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: radius.iconBox, marginTop: 4 },
});
