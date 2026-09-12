import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Alert, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, X, Camera, Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useChat } from '../lib/hooks/use-chat';
import { textOf, imageOf } from '../lib/ai/types';
import { captureFoodPhoto } from '../lib/ai/capture-photo';
import { takePendingImage } from '../lib/ai/pending-image';
import { CommandCard } from '../components/command-card';
import { ChatBubble } from '../components/chat-bubble';
import { TypingBubble } from '../components/typing-bubble';
import { Mascot } from '../components/mascot';
import { FadeInView } from '../components/fade-in';
import { useNumiStore } from '../lib/store';
import { type } from '../lib/fonts';
import { radius, pillShadow, fabShadow, MIN_TOUCH } from '../lib/theme';
import { Squish } from '../components/squish';

type Row =
  | {
      kind: 'message';
      key: string;
      role: 'user' | 'assistant';
      text: string;
      imageUri: string | null;
      firstOfRun: boolean;
      lastOfRun: boolean;
    }
  | { kind: 'card'; key: string }
  | { kind: 'typing'; key: string };

/** ตัวอย่างที่กดส่งได้เลย — ผู้ใช้ใหม่ส่วนใหญ่ไม่รู้ว่าพิมพ์อะไรได้ */
const SUGGESTIONS = [
  'เมื่อเช้ากินข้าวกะเพราหมูไข่ดาว',
  'วันนี้เหลือกินได้อีกเท่าไหร่',
  'จัดแผนเล่นเวท 3 วันต่อสัปดาห์ให้',
  'วิ่ง 30 นาที เผาไปเท่าไหร่',
];

export default function ChatScreen() {
  const c = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ initialText?: string }>();
  const { messages, pendingCards, loading, historyLoaded, send, sendImage, confirmCard, dismissCard, clearHistory } = useChat();
  const refresh = useNumiStore((s) => s.refresh);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // รอให้ประวัติเก่าโหลดเสร็จก่อน กัน race กับ setMessages(rows) ตอนโหลดประวัติมาทับข้อความใหม่
    if (!historyLoaded || startedRef.current) return;
    startedRef.current = true;
    const pendingImage = takePendingImage();
    if (pendingImage) {
      sendImage(pendingImage);
    } else if (params.initialText) {
      send(params.initialText);
    }
  }, [historyLoaded, params.initialText]);

  const rows: Row[] = useMemo(() => {
    const visible = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        text: textOf(m.content),
        imageUri: imageOf(m.content),
      }))
      .filter((r) => r.text.trim() || r.imageUri);

    const out: Row[] = visible.map((r, i) => ({
      kind: 'message' as const,
      key: `m${i}`,
      ...r,
      // จัดกลุ่มข้อความที่พูดติดกัน ใส่หางฟองแค่ใบสุดท้ายของชุด
      firstOfRun: i === 0 || visible[i - 1].role !== r.role,
      lastOfRun: i === visible.length - 1 || visible[i + 1].role !== r.role,
    }));

    for (const card of pendingCards) out.push({ kind: 'card', key: card.id });
    if (loading) out.push({ kind: 'typing', key: 'typing' });
    return out;
  }, [messages, pendingCards, loading]);

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    if (!text) setInput('');
    await send(value);
    listRef.current?.scrollToEnd({ animated: true });
  }

  async function handleCamera() {
    if (loading) return;
    const dataUrl = await captureFoodPhoto();
    if (!dataUrl) return;
    await sendImage(dataUrl);
    listRef.current?.scrollToEnd({ animated: true });
  }

  async function handleConfirm(id: string, editedArgs?: unknown) {
    await confirmCard(id, editedArgs);
    await refresh();
  }

  function handleClearHistory() {
    Alert.alert('ล้างประวัติแชท', 'ลบบทสนทนาทั้งหมดถาวร — ยกเลิกไม่ได้', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ล้างเลย', style: 'destructive', onPress: () => clearHistory() },
    ]);
  }

  const hasHistory = messages.some((m) => m.role === 'user' || m.role === 'assistant');
  const canSend = !!input.trim() && !loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={[styles.header, { borderBottomColor: c.line }]}>
          <Mascot size={40} pose="start" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 16 }]}>Numi</Text>
            <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>เห็นบันทึกวันนี้ของคุณ</Text>
          </View>
          {/* ปุ่มล้างประวัติโชว์เฉพาะตอนมีอะไรให้ล้าง และวางห่างจากปุ่มปิดไม่ให้กดพลาด */}
          {hasHistory && (
            <Squish onPress={handleClearHistory} style={styles.headerBtn}>
              <Trash2 size={17} color={c.faint} />
            </Squish>
          )}
          <View style={styles.headerGap} />
          <Squish onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: c.surfaceAlt }]}>
            <X size={19} color={c.subtext} />
          </Squish>
        </View>

        {!historyLoaded ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.muted} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Mascot size={92} pose="start" />
            <Text style={[type.cardTitle, { color: c.text, fontSize: 17, textAlign: 'center' }]}>คุยกับ Numi ได้เลย</Text>
            <Text style={[type.label, { color: c.subtext, fontSize: 12.5, textAlign: 'center', lineHeight: 19 }]}>
              เล่าว่ากินอะไรมา ถ่ายรูปอาหารให้ดู หรือถามเรื่องเป้าหมายของวันนี้
              {'\n'}Numi จะเสนอเป็นการ์ดให้ตรวจก่อนบันทึกเสมอ
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Squish
                  key={s}
                  onPress={() => handleSend(s)}
                  style={[styles.suggestion, { backgroundColor: c.surface, borderColor: c.line }, pillShadow(scheme)]}
                >
                  <Text style={[type.row, { color: c.text, fontSize: 12.5 }]}>{s}</Text>
                </Squish>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <FadeInView>
                {item.kind === 'typing' ? (
                  <TypingBubble />
                ) : item.kind === 'card' ? (
                  <View style={styles.cardWrap}>
                    <CommandCard
                      card={pendingCards.find((p) => p.id === item.key)!}
                      onConfirm={handleConfirm}
                      onDismiss={dismissCard}
                    />
                  </View>
                ) : (
                  <ChatBubble
                    role={item.role}
                    text={item.text}
                    imageUri={item.imageUri}
                    firstOfRun={item.firstOfRun}
                    lastOfRun={item.lastOfRun}
                  />
                )}
              </FadeInView>
            )}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.line }]}>
          <Squish
            style={[styles.cameraBtn, { backgroundColor: c.surfaceAlt }, loading && { opacity: 0.5 }]}
            disabled={loading}
            onPress={handleCamera}
          >
            <Camera size={19} color={c.brand} />
          </Squish>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="เล่าว่ากินอะไรมา..."
            placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
            multiline
            onSubmitEditing={() => handleSend()}
          />
          <Squish
            style={[
              styles.sendBtn,
              canSend ? [{ backgroundColor: c.brand }, fabShadow(scheme, c.brand)] : { backgroundColor: c.line },
            ]}
            disabled={!canSend}
            onPress={() => handleSend()}
          >
            <Send size={18} color={canSend ? '#fff' : c.faint} />
          </Squish>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  headerGap: { width: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 8 },
  cardWrap: { marginVertical: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  suggestions: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  suggestion: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cameraBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    borderRadius: radius.pill + 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: MIN_TOUCH,
    maxHeight: 110,
    fontSize: 14.5,
  },
  sendBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
});
