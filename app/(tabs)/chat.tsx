import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Trash2 } from 'lucide-react-native';
import { CommandCard } from '../../components/command-card';
import { useTheme } from '../../lib/hooks/use-theme';
import { useChat } from '../../lib/hooks/use-chat';
import { isAiConfigured } from '../../lib/ai/config';

const EXAMPLES = [
  'เช้านี้กินข้าวกะเพราหมูไข่ดาว',
  'วิ่ง 30 นาที',
  'วันนี้เหลืออีกกี่แคล',
];

export default function ChatScreen() {
  const c = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const { bubbles, loading, error, send, confirmCard, dismissCard, updateCardArgs, clear } =
    useChat();

  const configured = isAiConfigured();

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput('');
    await send(value);
  }

  function handleClear() {
    Alert.alert('ล้างบทสนทนา', 'ลบประวัติแชตทั้งหมด? รายการอาหารที่บันทึกไว้แล้วจะไม่ถูกลบ', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => clear() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={[styles.heading, { color: c.text }]}>ผู้ช่วย</Text>
          {bubbles.length > 0 && (
            <Pressable hitSlop={10} onPress={handleClear}>
              <Trash2 size={18} color={c.subtext} />
            </Pressable>
          )}
        </View>

        {!configured && (
          <View style={[styles.banner, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>
              ยังใช้ผู้ช่วยไม่ได้
            </Text>
            <Text style={{ color: c.subtext, fontSize: 12, marginTop: 3, lineHeight: 18 }}>
              ต้อง deploy Cloudflare Worker ก่อน แล้วใส่ค่า EXPO_PUBLIC_NUMI_WORKER_URL กับ
              EXPO_PUBLIC_NUMI_APP_TOKEN ในไฟล์ .env — ขั้นตอนทั้งหมดอยู่ใน worker/README.md
            </Text>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {bubbles.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ color: c.subtext, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                เล่าว่ากินอะไรหรือออกกำลังกายอะไร แล้วผู้ช่วยจะเสนอเป็นการ์ดให้ตรวจก่อนบันทึก
                {'\n'}ตัวเลขทุกอย่างแก้ได้ก่อนกดยืนยัน
              </Text>
              <View style={styles.examples}>
                {EXAMPLES.map((ex) => (
                  <Pressable
                    key={ex}
                    onPress={() => handleSend(ex)}
                    disabled={!configured || loading}
                    style={[styles.example, { borderColor: c.border, backgroundColor: c.card }]}
                  >
                    <Text style={{ color: c.text, fontSize: 13 }}>{ex}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {bubbles.map((b) =>
            b.kind === 'card' && b.card ? (
              <CommandCard
                key={b.key}
                card={b.card}
                onConfirm={confirmCard}
                onDismiss={dismissCard}
                onChangeArgs={updateCardArgs}
                disabled={loading}
              />
            ) : (
              <View
                key={b.key}
                style={[
                  styles.bubble,
                  b.role === 'user'
                    ? { backgroundColor: c.primary, alignSelf: 'flex-end' }
                    : { backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Text style={{ color: b.role === 'user' ? '#fff' : c.text, fontSize: 14.5, lineHeight: 21 }}>
                  {b.content}
                </Text>
              </View>
            )
          )}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={{ color: c.subtext, fontSize: 12 }}>กำลังคิด...</Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { borderColor: c.border, backgroundColor: c.ghostBg }]}>
              <Text style={{ color: c.subtext, fontSize: 12.5, lineHeight: 18 }}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={configured ? 'เล่าว่ากินอะไรมา...' : 'ยังไม่ได้ตั้งค่า Worker'}
            placeholderTextColor={c.subtext}
            editable={configured && !loading}
            multiline
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!configured || loading || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: c.primary },
              (!configured || loading || !input.trim()) && { opacity: 0.4 },
            ]}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heading: { fontSize: 22, fontWeight: '700' },
  banner: { marginHorizontal: 16, marginTop: 6, borderWidth: 1, borderRadius: 12, padding: 12 },
  scroll: { padding: 16, gap: 10 },
  empty: { paddingTop: 40, gap: 16, alignItems: 'center' },
  examples: { gap: 8, alignItems: 'center' },
  example: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubble: { maxWidth: '86%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
