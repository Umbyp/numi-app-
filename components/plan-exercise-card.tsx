import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, Pencil, Timer } from 'lucide-react-native';
import { useTheme } from '../lib/hooks/use-theme';
import { muscleGroupLabel } from '../lib/met';
import { CategoryIcon, categoryTint } from './icons/workout-icons';
import { type as textType } from '../lib/fonts';
import { radius } from '../lib/theme';
import type { WorkoutPlanExercise } from '../lib/db/schema';

interface Props {
  exercise: WorkoutPlanExercise;
  /** สถานะเซตที่ทำไปแล้ว ความยาวเท่ากับจำนวนเซต (ท่าที่ไม่ได้นับเซตจะมีช่องเดียว) */
  done: boolean[];
  onToggleSet: (index: number) => void;
  /** เรียกเมื่อเพิ่งติ๊กเซตเสร็จ เพื่อเปิดนาฬิกาพักให้อัตโนมัติ */
  onRest: (seconds: number) => void;
  onEdit: () => void;
}

/**
 * การ์ดหนึ่งท่าในแผน
 *
 * จัดเป็นแนวตั้ง (ชื่อบรรทัดบน รายละเอียดบรรทัดล่าง) แทนที่จะวางชื่อกับ meta ไว้ข้างกัน
 * เพราะข้อความ meta ยาวจะบีบคอลัมน์ชื่อจนเหลือความกว้างเกือบศูนย์
 * แล้วชื่อกล้ามเนื้อภาษาไทยจะขึ้นบรรทัดละตัวอักษร
 */
export function PlanExerciseCard({ exercise, done, onToggleSet, onRest, onEdit }: Props) {
  const c = useTheme();
  const tint = categoryTint(exercise.category, c);
  const muscle = muscleGroupLabel(exercise.muscleGroup);

  const total = done.length;
  const completed = done.filter(Boolean).length;
  const allDone = total > 0 && completed === total;
  const countsSets = exercise.sets != null && exercise.sets > 0;

  function handleToggle(i: number) {
    const turningOn = !done[i];
    onToggleSet(i);
    // พักเฉพาะตอนเพิ่งทำเสร็จ ไม่ใช่ตอนกดยกเลิกที่ติ๊กพลาด
    // และไม่ต้องพักหลังเซตสุดท้าย เพราะจบท่านั้นแล้ว
    if (turningOn && exercise.restSec && i < total - 1) onRest(exercise.restSec);
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: allDone ? tint.bg : c.surfaceAlt },
      ]}
    >
      <View style={styles.headRow}>
        <View style={[styles.iconBox, { backgroundColor: allDone ? c.surface : tint.bg }]}>
          {allDone ? (
            <Check size={16} color={tint.icon} />
          ) : (
            <CategoryIcon category={exercise.category} size={16} color={tint.icon} />
          )}
        </View>

        <View style={styles.titleCol}>
          <Text style={[textType.row, { color: c.text, fontSize: 14 }]} numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text style={[textType.label, { color: c.muted, fontSize: 11 }]} numberOfLines={2}>
            {[
              muscle,
              countsSets ? `${exercise.sets} เซต${exercise.reps ? ` × ${exercise.reps}` : ''}` : null,
              `${exercise.durationMin} นาที`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <Pressable hitSlop={10} onPress={onEdit} style={styles.editBtn}>
          <Pencil size={14} color={c.faint} />
        </Pressable>
      </View>

      {exercise.note ? (
        <Text style={[textType.label, { color: c.faint, fontSize: 11 }]}>{exercise.note}</Text>
      ) : null}

      <View style={styles.setRow}>
        {done.map((isDone, i) => (
          <Pressable
            key={i}
            onPress={() => handleToggle(i)}
            style={[
              styles.setPill,
              isDone
                ? { backgroundColor: tint.icon }
                : { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line },
            ]}
          >
            {isDone ? (
              <Check size={14} color="#fff" />
            ) : (
              <Text style={[textType.badge, { color: c.subtext, fontSize: 12 }]}>
                {countsSets ? i + 1 : '✓'}
              </Text>
            )}
          </Pressable>
        ))}

        {exercise.restSec ? (
          <Pressable
            onPress={() => onRest(exercise.restSec!)}
            style={[styles.restBtn, { backgroundColor: c.surface }]}
          >
            <Timer size={13} color={c.brand} />
            <Text style={[textType.badge, { color: c.brand, fontSize: 11 }]}>พัก {exercise.restSec} วิ</Text>
          </Pressable>
        ) : null}
      </View>

      {countsSets && total > 1 ? (
        <Text style={[textType.label, { color: allDone ? tint.icon : c.faint, fontSize: 11 }]}>
          {allDone ? 'ครบทุกเซตแล้ว' : `ทำไป ${completed} จาก ${total} เซต`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card - 8, padding: 12, gap: 9 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  // minWidth 0 จำเป็นกับ flex child ที่มีข้อความยาว ไม่งั้นมันไม่ยอมหดแล้วดันตัวอื่นล้น
  titleCol: { flex: 1, minWidth: 0, gap: 3 },
  editBtn: { padding: 4 },
  // wrap ไว้เพราะท่า 5 เซตขึ้นไปบวกปุ่มพัก จะกว้างเกินจอแคบ
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  setPill: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  restBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
});
