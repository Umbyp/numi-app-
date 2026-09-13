import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { getErrorMessage } from '../lib/errors';
import { type as textType } from '../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../lib/theme';
import { Squish } from '../components/squish';
import { EmptyState } from '../components/empty-state';
import { Mascot } from '../components/mascot';
import { PersonAvatar } from '../components/person-avatar';
import { supabase } from '../lib/auth/client';
import { getPrivacySettings, updatePrivacySettings } from '../lib/social/friends';
import { listActiveChallenges, getLeaderboard, type Challenge, type LeaderboardEntry } from '../lib/social/leaderboard';

const METRIC_UNIT: Record<Challenge['metric'], string> = {
  kcal_burned: 'kcal',
  workout_minutes: 'นาที',
  workout_count: 'ครั้ง',
};

export default function LeaderboardScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [privacy, session] = await Promise.all([getPrivacySettings(), supabase.auth.getSession()]);
      setSelfId(session.data.session?.user.id ?? null);
      setOptedIn(privacy.leaderboardOptIn);
      if (!privacy.leaderboardOptIn) return;

      const list = await listActiveChallenges();
      setChallenges(list);
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    } catch (e) {
      Alert.alert('โหลดไม่สำเร็จ', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!selectedId) return;
    getLeaderboard(selectedId)
      .then(setEntries)
      .catch((e) => Alert.alert('โหลดตารางอันดับไม่สำเร็จ', getErrorMessage(e)));
  }, [selectedId]);

  async function handleOptIn() {
    try {
      await updatePrivacySettings({ leaderboardOptIn: true });
      await load();
    } catch (e) {
      Alert.alert('เปิดใช้งานไม่สำเร็จ', getErrorMessage(e));
    }
  }

  const selectedChallenge = challenges.find((ch) => ch.id === selectedId) ?? null;
  const selfEntry = entries.find((e) => e.userId === selfId) ?? null;

  if (!loading && optedIn === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
        <EmptyState
          title="ยังไม่ได้เข้าร่วมตารางอันดับ"
          description="เปิดใช้งานเพื่อดูอันดับกับคนอื่นที่เปิดไว้เหมือนกัน ปิดได้ทุกเมื่อ"
          actionLabel="เข้าร่วมตารางอันดับ"
          onAction={handleOptIn}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      {challenges.length > 1 && (
        <View style={styles.pillRow}>
          {challenges.map((ch) => {
            const active = ch.id === selectedId;
            return (
              <Squish
                key={ch.id}
                onPress={() => setSelectedId(ch.id)}
                style={[styles.pill, { backgroundColor: active ? c.brandTint : c.surfaceAlt }]}
              >
                <Text style={[textType.row, { fontSize: 13, color: active ? c.brand : c.text }]} numberOfLines={1}>
                  {ch.title}
                </Text>
              </Squish>
            );
          })}
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {selfEntry && (
              <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
                <Mascot size={62} pose="goal" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[textType.row, { color: c.subtext, fontSize: 11.5 }]}>อันดับของคุณ</Text>
                  <View style={styles.heroBaseline}>
                    <Text style={[textType.metric, { color: c.text, fontSize: 38, letterSpacing: -1 }]}>{selfEntry.rank}</Text>
                    <Text style={[textType.row, { color: c.muted, fontSize: 13 }]}>
                      จาก {entries.length} คน · {Math.round(selfEntry.score)} {selectedChallenge ? METRIC_UNIT[selectedChallenge.metric] : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            {selectedChallenge && (
              <Text style={[textType.label, { color: c.muted, fontSize: 12, marginBottom: 8, paddingHorizontal: 4 }]}>
                {selectedChallenge.title}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={challenges.length === 0 ? 'ยังไม่มี challenge ตอนนี้' : 'ยังไม่มีใครติดอันดับ'}
              description={
                challenges.length === 0
                  ? 'รอ challenge ใหม่ได้เลย'
                  : 'บันทึกกิจกรรมแล้วเปิดตารางอันดับ เพื่อดูอันดับของคุณ'
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const isSelf = item.userId === selfId;
          return (
            <View style={[styles.row, { backgroundColor: isSelf ? c.brandTint : 'transparent', borderBottomColor: c.line }]}>
              <Text style={[textType.cardTitle, { color: isSelf ? c.brand : c.muted, fontSize: 15, width: 28, textAlign: 'center' }]}>{item.rank}</Text>
              <PersonAvatar name={item.displayName ?? 'ผู้ใช้'} size={38} />
              <Text style={[textType.row, { color: isSelf ? c.brand : c.text, fontSize: 14.5, flex: 1 }]} numberOfLines={1}>
                {item.displayName ?? 'ผู้ใช้'}
                {isSelf ? ' (คุณ)' : ''}
              </Text>
              <Text style={[textType.row, { color: isSelf ? c.brand : c.text, fontSize: 14 }]}>
                {Math.round(item.score)} {selectedChallenge ? METRIC_UNIT[selectedChallenge.metric] : ''}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          entries.length > 0 ? (
            <>
              <Text style={[textType.label, { color: c.faint, fontSize: 11, textAlign: 'center', marginTop: 12 }]}>
                แสดง 50 อันดับแรก
              </Text>
              <View style={[styles.tipBox, { backgroundColor: c.cream }]}>
                <Text style={[textType.label, { color: c.creamText, fontSize: 12.5, lineHeight: 19 }]}>
                  นับจำนวนครั้งที่ออกกำลังกาย ไม่ได้นับน้ำหนักหรือแคลอรี่ ปิดการเข้าร่วมได้ทุกเมื่อในหน้าบัญชี
                </Text>
              </View>
            </>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 14, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 14,
  },
  heroBaseline: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 1 },
  tipBox: { borderRadius: radius.cardInner, padding: 14, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62, paddingHorizontal: 8, borderRadius: radius.cardInner, borderBottomWidth: StyleSheet.hairlineWidth },
});
