import { useCallback, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, Check, X } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { type as textType, fontFamily } from '../lib/fonts';
import { radius, cardShadow, MIN_TOUCH } from '../lib/theme';
import { Squish } from '../components/squish';
import { EmptyState } from '../components/empty-state';
import {
  sendFriendRequest,
  listPendingRequests,
  respondToRequest,
  listFriends,
  type FriendRequest,
  type Friend,
} from '../lib/social/friends';

export default function FriendsScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [friendList, requests] = await Promise.all([listFriends(), listPendingRequests()]);
      setFriends(friendList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
    } catch (e) {
      Alert.alert('โหลดข้อมูลเพื่อนไม่สำเร็จ', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    try {
      await sendFriendRequest(email);
      setEmail('');
      await load();
      Alert.alert('ส่งคำขอแล้ว');
    } catch (e) {
      Alert.alert('ส่งคำขอไม่สำเร็จ', e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(requestId: string, accept: boolean) {
    try {
      await respondToRequest(requestId, accept);
      await load();
    } catch (e) {
      Alert.alert('ดำเนินการไม่สำเร็จ', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
          <Text style={[textType.label, { color: c.subtext, marginBottom: 8 }]}>เพิ่มเพื่อนด้วยอีเมล</Text>
          <View style={styles.addRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="อีเมลเพื่อน"
              placeholderTextColor={c.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt, fontFamily: fontFamily(600) }]}
            />
            <Squish
              scaleTo={0.94}
              disabled={sending || !email.trim()}
              onPress={handleSend}
              style={[styles.sendBtn, { backgroundColor: c.brand }, (sending || !email.trim()) && { opacity: 0.5 }]}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <UserPlus size={18} color="#fff" />}
            </Squish>
          </View>
        </View>

        {incoming.length > 0 && (
          <>
            <Text style={[textType.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>คำขอที่ส่งมา</Text>
            <View style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              {incoming.map((r, i) => (
                <View
                  key={r.id}
                  style={[styles.row, i < incoming.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
                >
                  <Text style={[textType.row, { color: c.text, fontSize: 14, flex: 1 }]}>
                    {r.otherDisplayName ?? 'ผู้ใช้'}
                  </Text>
                  <Squish scaleTo={0.9} onPress={() => handleRespond(r.id, true)} style={[styles.iconBtn, { backgroundColor: c.brandTint }]}>
                    <Check size={16} color={c.brand} />
                  </Squish>
                  <Squish scaleTo={0.9} onPress={() => handleRespond(r.id, false)} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
                    <X size={16} color={c.muted} />
                  </Squish>
                </View>
              ))}
            </View>
          </>
        )}

        {outgoing.length > 0 && (
          <>
            <Text style={[textType.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>คำขอที่ส่งไป</Text>
            <View style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
              {outgoing.map((r, i) => (
                <View
                  key={r.id}
                  style={[styles.row, i < outgoing.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
                >
                  <Text style={[textType.row, { color: c.text, fontSize: 14, flex: 1 }]}>
                    {r.otherDisplayName ?? 'ผู้ใช้'}
                  </Text>
                  <Text style={[textType.label, { color: c.faint, fontSize: 12 }]}>รอตอบรับ</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[textType.badge, { color: c.muted, letterSpacing: 0.4, paddingLeft: 6 }]}>เพื่อนของคุณ</Text>
        {!loading && friends.length === 0 ? (
          <EmptyState title="ยังไม่มีเพื่อน" description="เพิ่มเพื่อนด้วยอีเมลด้านบน แล้วให้กำลังใจกันได้เลย" />
        ) : (
          <View style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow(scheme)]}>
            {friends.map((f, i) => (
              <Squish
                scaleTo={0.98}
                key={f.userId}
                style={[styles.row, i < friends.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
                onPress={() => router.push({ pathname: '/friend-activity', params: { friendId: f.userId } })}
              >
                <Text style={[textType.row, { color: c.text, fontSize: 14, flex: 1 }]}>{f.displayName ?? 'ผู้ใช้'}</Text>
                <Text style={{ color: c.faint, fontSize: 17 }}>›</Text>
              </Squish>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 16 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderRadius: radius.iconBox, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  sendBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.iconBox, alignItems: 'center', justifyContent: 'center' },
  listCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, paddingVertical: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
