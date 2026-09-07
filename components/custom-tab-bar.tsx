import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { fabShadow } from '../lib/theme';
import { type, fontFamily } from '../lib/fonts';
import { DashboardIcon, DiaryIcon, InsightsIcon, AccountIcon } from './icons/nav-icons';

const TAB_META: Record<string, { label: string; Icon: typeof DashboardIcon }> = {
  index: { label: 'แดชบอร์ด', Icon: DashboardIcon },
  diary: { label: 'ไดอารี่', Icon: DiaryIcon },
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
  onQuickAdd: () => void;
}

/** แถบแท็บล่างแบบกำหนดเอง 5 ช่อง มีปุ่ม + ยกสูงตรงกลางที่ไม่ใช่ tab จริง แค่เปิด quick-add sheet */
export function CustomTabBar({ state, navigation, onQuickAdd }: TabBarProps) {
  const c = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(10, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        if (route.name === 'add') {
          return (
            <View key={route.key} style={styles.centerSlot}>
              <Pressable
                style={[styles.fab, { backgroundColor: c.brand }, fabShadow(scheme, c.brand)]}
                onPress={onQuickAdd}
                hitSlop={8}
              >
                <Plus size={24} color="#fff" strokeWidth={2.8} />
              </Pressable>
            </View>
          );
        }

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
  centerSlot: { width: 64, alignItems: 'center' },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
});
