import { useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../lib/hooks/use-theme';
import { formatDayShort } from '../lib/dates';
import type { SeriesPoint } from '../lib/nutrition';

interface Props {
  series: SeriesPoint[];
  /** ค่าเฉลี่ยเคลื่อนที่ ความยาวเท่ากับ series */
  average: (number | null)[];
  unit: string;
  emptyText: string;
  /** ข้อความกำกับเส้นในคำอธิบายกราฟ */
  lineLabel?: string;
  height?: number;
}

const PAD = { left: 42, right: 12, top: 12, bottom: 22 };

/**
 * กราฟเส้นค่าเฉลี่ยเคลื่อนที่ พร้อมจุดของค่าที่ชั่งจริง
 * เส้นหนา = เทรนด์จริง, จุดจาง = ค่ารายวันที่แกว่งจากน้ำในร่างกาย ±1-2 kg
 */
export function TrendChart({
  series,
  average,
  unit,
  emptyText,
  lineLabel = 'เฉลี่ย 7 วัน',
  height = 180,
}: Props) {
  const c = useTheme();
  const [width, setWidth] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const values: number[] = [];
  for (const p of series) if (p.raw !== null) values.push(p.raw);
  for (const a of average) if (a !== null) values.push(a);

  const hasData = values.length > 0;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;

  let min = 0;
  let max = 1;
  if (hasData) {
    min = Math.min(...values);
    max = Math.max(...values);
    const span = max - min;
    const pad = span === 0 ? 1 : span * 0.12;
    min -= pad;
    max += pad;
  }

  const n = series.length;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  // เส้นค่าเฉลี่ยเริ่มจากจุดแรกที่มีข้อมูล ช่วงก่อนหน้านั้นเว้นว่างไว้ ไม่ลากเดา
  let path = '';
  average.forEach((v, i) => {
    if (v === null) return;
    path += `${path ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
  });

  const gridValues = hasData ? [max, (max + min) / 2, min] : [];
  const decimals = max - min < 6 ? 1 : 0;

  const labelIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View onLayout={onLayout}>
      <View style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {gridValues.map((v, i) => (
            <Line
              key={`g${i}`}
              x1={PAD.left}
              y1={y(v)}
              x2={width - PAD.right}
              y2={y(v)}
              stroke={c.border}
              strokeWidth={1}
            />
          ))}
          {gridValues.map((v, i) => (
            <SvgText
              key={`gl${i}`}
              x={PAD.left - 6}
              y={y(v) + 4}
              fontSize={10}
              fill={c.subtext}
              textAnchor="end"
            >
              {v.toFixed(decimals)}
            </SvgText>
          ))}

          {hasData &&
            labelIdx.map((i) => (
              <SvgText
                key={`xl${i}`}
                x={x(i)}
                y={height - 6}
                fontSize={10}
                fill={c.subtext}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              >
                {formatDayShort(series[i].date)}
              </SvgText>
            ))}

          {path ? (
            <Path d={path.trim()} stroke={c.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ) : null}

          {series.map((p, i) =>
            p.raw === null ? null : (
              <Circle key={p.date} cx={x(i)} cy={y(p.raw)} r={2.5} fill={c.subtext} opacity={0.55} />
            )
          )}
        </Svg>
      )}

      {!hasData && (
        <View style={[StyleSheet.absoluteFill, styles.empty]}>
          <Text style={{ color: c.subtext, fontSize: 13, textAlign: 'center' }}>{emptyText}</Text>
        </View>
      )}
      </View>

      {hasData && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: c.primary }]} />
            <Text style={[styles.legendText, { color: c.subtext }]}>
              {lineLabel} ({unit})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.subtext }]} />
            <Text style={[styles.legendText, { color: c.subtext }]}>ค่าที่บันทึก</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2, paddingLeft: PAD.left },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 14, height: 2.5, borderRadius: 2 },
  legendDot: { width: 5, height: 5, borderRadius: 3, opacity: 0.55 },
  legendText: { fontSize: 11 },
});
