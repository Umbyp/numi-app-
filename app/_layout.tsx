import { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { migrateDb } from '../lib/db/client';
import { syncSeedFoods } from '../lib/db/queries';
import { useNumiStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const refresh = useNumiStore((s) => s.refresh);
  const scheme = useColorScheme();
  const c = colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    (async () => {
      await migrateDb();
      await syncSeedFoods();
      await refresh();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', headerShown: true, title: 'เพิ่มอาหาร' }} />
        <Stack.Screen name="day/[date]" options={{ headerShown: true, title: 'รายละเอียดวัน' }} />
        <Stack.Screen name="exercise/[name]" options={{ headerShown: true, title: 'สถิติท่าเวท' }} />
        <Stack.Screen
          name="save-template"
          options={{ presentation: 'modal', headerShown: true, title: 'บันทึกเป็นมื้อชุด' }}
        />
        <Stack.Screen
          name="log-cardio"
          options={{ presentation: 'modal', headerShown: true, title: 'บันทึกคาร์ดิโอ' }}
        />
        <Stack.Screen
          name="log-strength"
          options={{ presentation: 'modal', headerShown: true, title: 'บันทึกเวท' }}
        />
      </Stack>
    </>
  );
}
