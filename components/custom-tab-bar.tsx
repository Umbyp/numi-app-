import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/hooks/use-theme';
import { type, fontFamily } from '../lib/fonts';
import { DashboardIcon, DiaryIcon, WorkoutPlanIcon, InsightsIcon, AccountIcon } from './icons/nav-icons';

const TAB_META: Record<string, { label: string; Icon: typeof DashboardIcon }> = {
  index: { label: 'แดชบอร์ด', Icon: DashboardIcon },
  diary: { label: 'ไดอารี่', Icon: DiaryIcon },
  'workout-plan': { label: 'ออกกำลังกาย', Icon: WorkoutPlanIcon },
  insights: { label: 'เชิงลึก', Icon: InsightsIcon },
  account: { label: 'บัญชี', Icon: AccountIcon },
};

interface Route {
  key: string;
  name: string;
}

// พิมพ์แบบหลวม ๆ ตั้งใจ: BottomTabBarProps เป็น internal type ของ expo-router ไม่ได้ export ออกมาให้ import ตรง ๆ
interface TabBarProps {
  state: { index: number; routes: Route[] };
  descriptors: Record<string, unknown>;
  navigation: any;
}

/** แถบแท็บล่างแบบกำหนดเอง 5 ช่องเท่ากันหมด — ปุ่มเพิ่มด่วนลอยอยู่นอกแถบ (ดู floating-quickadd-button.tsx) เพื่อให้แถบสมดุล ไม่มีช่องพิเศษมาเบียดซ้าย-ขวา */
export function CustomTabBar({ state, navigation }: TabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(10, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const { label, Icon } = meta;
        const color = isFocused ? c.brand : c.faint;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress}>
            <Icon color={color} active={isFocused} size={22} />
            <Text style={[type.badge, { color, fontFamily: fontFamily(isFocused ? 800 : 600), fontSize: 10 }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { width: 60, alignItems: 'center', gap: 4 },
});
