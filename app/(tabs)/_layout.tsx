import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/custom-tab-bar';
import { FloatingAIButton } from '../../components/floating-ai-button';
import { QuickAddSheet } from '../../components/quick-add-sheet';

export default function TabsLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} onQuickAdd={() => setSheetOpen(true)} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="diary" />
        <Tabs.Screen name="add" listeners={{ tabPress: (e) => e.preventDefault() }} />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="account" />
      </Tabs>

      <FloatingAIButton />
      <QuickAddSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}
