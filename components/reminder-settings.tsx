import { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { getReminderSetting, saveReminderSetting, type ReminderSetting } from '../lib/db/queries';
import {
  REMINDERS,
  formatTime,
  requestPermission,
  scheduleReminder,
  cancelReminder,
  type ReminderKey,
} from '../lib/notifications';
import { type } from '../lib/fonts';
import { radius, cardShadow } from '../lib/theme';
import { Squish } from './squish';

type SettingsMap = Partial<Record<ReminderKey, ReminderSetting>>;

/**
 * ตั้งค่าการเตือน — ปิดไว้เป็นค่าเริ่มต้นทั้งหมด
 * การเตือนเรื่องอาหารซ้ำ ๆ กดดันบางคนมากกว่าช่วย จึงต้องให้ผู้ใช้เปิดเอง
 */
export function ReminderSettings() {
  const c = useTheme();
  const scheme = useScheme();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all(REMINDERS.map((r) => getReminderSetting(r.key))).then((values) => {
      const map: SettingsMap = {};
      REMINDERS.forEach((r, i) => {
        map[r.key] = values[i] ?? { enabled: false, ...r.defaultTime };
      });
      setSettings(map);
    });
  }, []);

  useFocusEffect(load);

  async function apply(key: ReminderKey, next: ReminderSetting) {
    setBusy(true);
    try {
      if (next.enabled) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'ยังไม่ได้อนุญาตการแจ้งเตือน',
            'เปิดสิทธิ์แจ้งเตือนให้ Numi ในการตั้งค่าเครื่องก่อน แล้วลองใหม่',
            [
              { text: 'ไว้ก่อน', style: 'cancel' },
              { text: 'เปิดการตั้งค่า', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
        await scheduleReminder(key, next.hour, next.minute);
      } else {
        await cancelReminder(key);
      }
      await saveReminderSetting(key, next);
      setSettings((s) => ({ ...s, [key]: next }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
      {REMINDERS.map((def, i) => {
        const setting = settings[def.key] ?? { enabled: false, ...def.defaultTime };
        return (
          <View
            key={def.key}
            style={[
              styles.block,
              i < REMINDERS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
            ]}
          >
            <View style={styles.headRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.row, { color: c.text, fontSize: 14 }]}>{def.label}</Text>
                <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>{def.description}</Text>
              </View>
              <Switch
                value={setting.enabled}
                disabled={busy}
                onValueChange={(v) => apply(def.key, { ...setting, enabled: v })}
                trackColor={{ true: c.brand, false: c.line }}
              />
            </View>

            {setting.enabled && (
              <View style={styles.timeRow}>
                {def.timeOptions.map((t) => {
                  const active = t.hour === setting.hour && t.minute === setting.minute;
                  return (
                    <Squish
                      key={formatTime(t.hour, t.minute)}
                      disabled={busy}
                      onPress={() => apply(def.key, { enabled: true, hour: t.hour, minute: t.minute })}
                      style={[styles.timeChip, { backgroundColor: active ? c.brand : c.surfaceAlt }]}
                    >
                      <Text style={[type.badge, { color: active ? '#fff' : c.subtext, fontSize: 12 }]}>
                        {formatTime(t.hour, t.minute)}
                      </Text>
                    </Squish>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, paddingHorizontal: 16 },
  block: { paddingVertical: 14, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  timeChip: { height: 30, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
