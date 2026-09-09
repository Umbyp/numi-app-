import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { motion } from '../lib/theme';

/**
 * แก้วน้ำที่ระดับน้ำขึ้นตามที่ดื่มไปแล้ว
 *
 * ทำไมไม่ animate prop ของ react-native-svg โดยตรง
 * ------------------------------------------------
 * react-native-svg 15 ประกาศ translateX/translateY บน <G> เป็น deprecated
 * (node_modules/react-native-svg/lib/typescript/lib/extract/types.d.ts)
 * และการขยับผ่าน Animated ต้องพึ่ง setNativeProps ซึ่งใช้ native driver ไม่ได้
 * ที่นี่จึงขยับด้วย Animated.View ธรรมดา แล้ววาง SVG ที่ "เจาะรูเป็นรูปแก้ว"
 * ทับข้างบนด้วย fillRule evenodd ทุกอย่างที่ล้นออกนอกแก้วจึงถูกกลบด้วยสีพื้นการ์ด
 * ได้ทั้งความลื่น (useNativeDriver) และรูปทรงแก้วที่สอบเข้าหาก้น
 *
 * ผลข้างเคียงที่ต้องรู้: ตัวเรียกต้องส่ง surface ที่ตรงกับพื้นหลังจริง ๆ ที่วางแก้วอยู่
 * ถ้าวางบนพื้นไล่สีหรือพื้นโปร่ง หน้ากากจะกลายเป็นสี่เหลี่ยมทึบให้เห็น
 */

// พิกัดทุกจุดอยู่ในระบบ 72x92 แล้วคูณ S ตอนวาดจริง
const VB_W = 72;
const VB_H = 92;

/** ขอบแก้ว — เปิดด้านบน ไม่ลากเส้นปิดปากแก้ว ไม่งั้นจะอ่านเป็นกล่องสี่เหลี่ยม */
const GLASS_OUT = 'M9 8 L18 77.5 Q19 84 25 84 L47 84 Q53 84 54 77.5 L63 8';
/** ผนังด้านในของแก้ว — ใช้เป็นรูที่เจาะบนหน้ากาก */
const GLASS_IN =
  'M9.9 9.5 L18.6 77 Q19.6 83.4 25.4 83.4 L46.6 83.4 Q52.4 83.4 53.4 77 L62.1 9.5 Z';

const WATER_FULL = 17; // ระดับผิวน้ำตอนถึงเป้า เว้นขอบไว้ไม่ให้ล้นปากแก้ว
// ต้องต่ำกว่าก้นแก้วด้านใน (83.4) ลบความสูงยอดคลื่น (3) ไม่งั้นตอน 0 มล.
// จะเหลือน้ำบาง ๆ ค้างอยู่ก้นแก้ว ทั้งที่ยังไม่ได้ดื่มอะไรเลย
const WATER_EMPTY = 86;
const WAVE_LEN = 36;
const WAVE_AMP = 3;
const STRIP = 9; // ความสูงแถบคลื่น
const BASE = WAVE_AMP + 1; // เส้นระดับน้ำภายในแถบคลื่น

/**
 * คลื่นลูกโซ่ต่อกันจาก fromX ถึง toX วาดเกินขอบทั้งสองข้างเผื่อตอนเลื่อน
 * รับ dx dy มาเลื่อนตั้งแต่ตอนสร้าง path เพราะ prop translate ของ react-native-svg
 * ก็ถูกประกาศ deprecated เหมือน translateX/translateY
 */
function wavePath(fromX: number, toX: number, dx = 0, dy = 0): string {
  let d = `M ${fromX + dx} ${BASE + dy}`;
  for (let x = fromX; x < toX; x += WAVE_LEN) {
    d += ` q ${WAVE_LEN / 4} ${-WAVE_AMP} ${WAVE_LEN / 2} 0 t ${WAVE_LEN / 2} 0`;
  }
  return `${d} L ${toX + dx} ${STRIP} L ${fromX + dx} ${STRIP} Z`;
}

const FROM = -WAVE_LEN * 2;
const TO = VB_W + WAVE_LEN * 2;
const WAVE_FRONT = wavePath(FROM, TO);
const WAVE_BACK = wavePath(FROM, TO, -WAVE_LEN / 2.4, 1.4);

interface Props {
  /** สัดส่วนที่ดื่มไปแล้ว 0-1 */
  pct: number;
  /** ความสูงของแก้วเป็น pt ความกว้างคำนวณตามสัดส่วนให้เอง */
  size?: number;
  water: string;
  /** สีส่วนที่ยังไม่ได้ดื่ม */
  track: string;
  /** สีพื้นหลังที่วางแก้วอยู่จริง ๆ ใช้ทำหน้ากาก */
  surface: string;
  /** ความเข้มของแสงสะท้อนบนผิวแก้ว ธีมมืดต้องจางกว่ามาก */
  shine?: number;
  /** ถึงเป้าแล้ว — เติมประกายสองดวงข้างแก้ว */
  celebrate?: boolean;
  /** ให้คลื่นไหลไหม ปิดตอนออกจากแท็บเพื่อไม่ให้ลูปกินแบตทิ้งไว้เฉย ๆ */
  flowing?: boolean;
}

export function WaterGlass({
  pct,
  size = 92,
  water,
  track,
  surface,
  shine = 0.75,
  celebrate = false,
  flowing = true,
}: Props) {
  const S = size / VB_H;
  const w = VB_W * S;

  const level = useRef(new Animated.Value(pct)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(level, {
      toValue: pct,
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pct]);

  useEffect(() => {
    if (!flowing) return;
    // เลื่อนไปหนึ่งช่วงคลื่นพอดีแล้ววนกลับ ตาจึงมองไม่เห็นรอยต่อ
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: motion.duration.ambient,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      drift.setValue(0);
    };
  }, [flowing]);

  const waterY = level.interpolate({
    inputRange: [0, 1],
    outputRange: [(WATER_EMPTY - BASE) * S, (WATER_FULL - BASE) * S],
  });
  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -WAVE_LEN * S] });

  const bubble = (left: number, top: number, d: number, opacity: number) => (
    <View
      style={{
        position: 'absolute',
        left: left * S,
        top: top * S,
        width: d * S,
        height: d * S,
        borderRadius: (d * S) / 2,
        backgroundColor: '#FFFFFF',
        opacity,
      }}
    />
  );

  return (
    <View style={{ width: w, height: size, overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: track }]} />

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          width: w,
          height: size,
          transform: [{ translateY: waterY }],
        }}
      >
        <Animated.View
          style={{
            width: (VB_W + WAVE_LEN * 2) * S,
            height: STRIP * S,
            marginLeft: -WAVE_LEN * S,
            transform: [{ translateX: driftX }],
          }}
        >
          <Svg
            width={(VB_W + WAVE_LEN * 2) * S}
            height={STRIP * S}
            viewBox={`${-WAVE_LEN} 0 ${VB_W + WAVE_LEN * 2} ${STRIP}`}
          >
            {/* คลื่นสองลูกเหลื่อมกัน ลูกหลังจางกว่า ทำให้ผิวน้ำดูมีความหนา */}
            <Path d={WAVE_BACK} fill={water} opacity={0.45} />
            {/* ลูกหน้าต้องทึบสนิทให้เท่ากับตัวน้ำข้างล่าง ถ้าตั้ง opacity < 1
                ลูกหลังจะทะลุขึ้นมาเฉพาะในแถบคลื่น กลายเป็นเส้นคาดตรงรอยต่อ */}
            <Path d={WAVE_FRONT} fill={water} />
          </Svg>
        </Animated.View>

        <View style={{ flex: 1, backgroundColor: water }}>
          {bubble(22, 12, 4.8, 0.5)}
          {bubble(36, 24, 3.2, 0.38)}
          {bubble(29, 5, 2.4, 0.45)}
        </View>
      </Animated.View>

      <Svg
        width={w}
        height={size}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={StyleSheet.absoluteFill}
      >
        {/* หน้ากาก: สี่เหลี่ยมเต็มพื้นที่ลบด้วยผนังในของแก้ว น้ำจึงโผล่เฉพาะในแก้ว */}
        <Path
          d={`M0 0 H${VB_W} V${VB_H} H0 Z ${GLASS_IN}`}
          fill={surface}
          fillRule="evenodd"
        />
        <Path
          d={GLASS_OUT}
          fill="none"
          stroke={water}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        {/* แสงสะท้อนบนผิวแก้ว ขาวเสมอเพราะเป็นแสงไม่ใช่สีของวัตถุ คุมน้ำหนักด้วย opacity */}
        <Path
          d="M14.2 17 L20.4 62"
          stroke="#FFFFFF"
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={shine}
        />
        {celebrate ? (
          <Path
            d="M67 15 v5 M64.5 17.5 h5 M6 26 v3.4 M4.3 27.7 h3.4"
            stroke={water}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
