import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
  NotoSansThai_800ExtraBold,
} from '@expo-google-fonts/noto-sans-thai';
import { migrateDb } from '../lib/db/client';
import { seedFoodsIfEmpty } from '../lib/db/queries';
import { useNumiStore } from '../lib/store';
import { useScheme } from '../lib/hooks/use-theme';
import { colors } from '../lib/theme';
import { ErrorBoundary } from '../components/error-boundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutInner />
    </ErrorBoundary>
  );
}

function RootLayoutInner() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
    NotoSansThai_800ExtraBold,
  });
  const refresh = useNumiStore((s) => s.refresh);
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme = useScheme(); // เคารพ theme preference ที่ผู้ใช้เลือกเอง (โหลดเสร็จก่อน ready เสมอ)
  const ready = dbReady && fontsLoaded;
  const c = colors[ready ? scheme : systemScheme];

  useEffect(() => {
    (async () => {
      await migrateDb();
      await seedFoodsIfEmpty();
      await refresh();
      setDbReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', headerShown: true, title: 'เพิ่มอาหาร' }} />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account-edit" options={{ presentation: 'modal', headerShown: true, title: 'แก้ไขโปรไฟล์และเป้าหมาย' }} />
        <Stack.Screen name="weight-history" options={{ presentation: 'modal', headerShown: true, title: 'ประวัติน้ำหนัก' }} />
        <Stack.Screen name="log-workout" options={{ presentation: 'modal', headerShown: true, title: 'บันทึกออกกำลังกาย' }} />
        <Stack.Screen name="activity-history" options={{ presentation: 'modal', headerShown: true, title: 'ประวัติกิจกรรม' }} />
        <Stack.Screen name="scan-barcode" options={{ presentation: 'modal', headerShown: true, title: 'สแกนบาร์โค้ด' }} />
        <Stack.Screen name="workout-plan" options={{ presentation: 'modal', headerShown: true, title: 'แผนออกกำลังกาย' }} />
        <Stack.Screen name="workout-plan-detail" options={{ presentation: 'modal', headerShown: true, title: 'รายละเอียดแผน' }} />
      </Stack>
    </>
  );
}
