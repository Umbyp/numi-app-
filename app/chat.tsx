import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, X, Camera, Trash2 } from 'lucide-react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { useChat } from '../lib/hooks/use-chat';
import { textOf, imageOf } from '../lib/ai/types';
import { captureFoodPhoto } from '../lib/ai/capture-photo';
import { takePendingImage } from '../lib/ai/pending-image';
import { CommandCard } from '../components/command-card';
import { Mascot } from '../components/mascot';
import { FadeInView } from '../components/fade-in';
import { useNumiStore } from '../lib/store';
import { type, fontFamily } from '../lib/fonts';
import { radius, pillShadow, fabShadow } from '../lib/theme';

type Row =
  | { kind: 'message'; key: string; role: 'user' | 'assistant'; text: string; imageUri: string | null }
  | { kind: 'card'; key: string };

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

  const rows: Row[] = [
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        kind: 'message' as const,
        key: `m${i}`,
        role: m.role as 'user' | 'assistant',
        text: textOf(m.content),
        imageUri: imageOf(m.content),
      }))
      .filter((r) => r.text.trim() || r.imageUri),
    ...pendingCards.map((card) => ({ kind: 'card' as const, key: card.id })),
  ];

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await send(text);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <Mascot size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[type.cardTitle, { color: c.text, fontSize: 17 }]}>Numi</Text>
            <Text style={[type.label, { color: c.muted, fontSize: 11 }]}>เห็นบันทึกวันนี้ของคุณ</Text>
          </View>
          <Pressable hitSlop={10} onPress={handleClearHistory} style={[styles.closeBtn, { backgroundColor: c.surfaceAlt }]}>
            <Trash2 size={16} color={c.subtext} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: c.surfaceAlt }]}>
            <X size={18} color={c.subtext} />
          </Pressable>
        </View>

        {!historyLoaded ? (
          <View style={styles.empty}>
            <ActivityIndicator color={c.muted} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[type.cardTitle, { color: c.text }]}>คุยกับ Numi ได้เลย</Text>
            <Text style={[type.label, { color: c.subtext, textAlign: 'center', marginTop: 6 }]}>
              ลองพิมพ์เช่น "เมื่อเช้ากินข้าวกะเพราหมูไข่ดาว" หรือถ่ายรูปอาหารให้ดู
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <FadeInView>
                {item.kind === 'card' ? (
                  <CommandCard
                    card={pendingCards.find((p) => p.id === item.key)!}
                    onConfirm={handleConfirm}
                    onDismiss={dismissCard}
                  />
                ) : (
                  <View
                    style={[
                      styles.bubble,
                      item.role === 'user'
                        ? [styles.bubbleUser, { backgroundColor: item.imageUri ? 'transparent' : c.brand }]
                        : [styles.bubbleAssistant, { backgroundColor: c.surface, borderColor: c.line }, pillShadow(scheme)],
                    ]}
                  >
                    {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.imageThumb} />}
                    {item.text.trim() ? (
                      <Text
                        style={{
                          color: item.role === 'user' ? '#fff' : c.text,
                          fontSize: 14,
                          fontFamily: fontFamily(500),
                          lineHeight: 20,
                          marginTop: item.imageUri ? 8 : 0,
                        }}
                      >
                        {item.text}
                      </Text>
                    ) : null}
                  </View>
                )}
              </FadeInView>
            )}
          />
        )}

        {loading && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={c.muted} />
            <Text style={[type.label, { color: c.muted, fontSize: 12 }]}>Numi กำลังพิมพ์...</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <Pressable
            style={[styles.cameraBtn, { backgroundColor: c.surface }, pillShadow(scheme), loading && { opacity: 0.5 }]}
            disabled={loading}
            onPress={handleCamera}
          >
            <Camera size={19} color={c.brand} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="พิมพ์ข้อความ"
            placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text, backgroundColor: c.surface }, pillShadow(scheme)]}
            multiline
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: c.brand }, fabShadow(scheme, c.brand), (!input.trim() || loading) && { opacity: 0.5 }]}
            disabled={!input.trim() || loading}
            onPress={handleSend}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 18, gap: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  bubble: { maxWidth: '85%', paddingHorizontal: 15, paddingVertical: 11, marginBottom: 4 },
  bubbleUser: { alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 6 },
  bubbleAssistant: { alignSelf: 'flex-start', borderRadius: 20, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  imageThumb: { width: 200, height: 200, borderRadius: 16 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingBottom: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  cameraBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    borderRadius: radius.pill + 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
