import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/custom-tab-bar';
import { FloatingAIButton } from '../../components/floating-ai-button';
import { FloatingQuickAddButton } from '../../components/floating-quickadd-button';
import { QuickAddSheet } from '../../components/quick-add-sheet';

export default function TabsLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="diary" />
        <Tabs.Screen name="workout-plan" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="account" />
      </Tabs>

      <FloatingAIButton />
      <FloatingQuickAddButton onPress={() => setSheetOpen(true)} />
      <QuickAddSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}
