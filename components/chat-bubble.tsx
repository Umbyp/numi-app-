import { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { FadeInView } from './fade-in';
import { Squish } from './squish';
import { type } from '../lib/fonts';
import { pillShadow, radius } from '../lib/theme';
import { stripMarkdown } from '../lib/ai/types';

interface Props {
  role: 'user' | 'assistant';
  text: string;
  imageUri: string | null;
  /** ข้อความสุดท้ายของชุดที่พูดติดกัน — ใส่หางฟองแค่ใบสุดท้าย */
  lastOfRun: boolean;
  /** ใบแรกของชุด — ฝั่ง Numi จะโชว์รูปมาสคอตเฉพาะใบแรก */
  firstOfRun: boolean;
}

export function ChatBubble({ role, text, imageUri, lastOfRun, firstOfRun }: Props) {
  const c = useTheme();
  const scheme = useScheme();
  const isUser = role === 'user';
  const displayText = isUser ? text : stripMarkdown(text);
  const imageOnly = !!imageUri && !text.trim();
  const [copied, setCopied] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** กดค้างเพื่อคัดลอก — ข้อความยาว ๆ (เช่นรายชื่อท่าออกกำลังกาย) ผู้ใช้มักอยากแปะไปที่อื่นต่อ */
  async function handleCopy() {
    if (!displayText.trim()) return;
    await Clipboard.setStringAsync(displayText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setCopied(false), 1400);
  }

  const bubble = (
    <View>
      <Squish
        scaleTo={0.98}
        onLongPress={handleCopy}
        disabled={!displayText.trim()}
        style={[
          styles.bubble,
          // รูปเดี่ยวไม่ต้องมีพื้นหลังหรือ padding รูปจะได้ชิดขอบฟองพอดี
          imageOnly ? styles.imageOnly : isUser
            ? { backgroundColor: c.brand }
            : [{ backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }, pillShadow(scheme)],
          isUser
            ? { borderBottomRightRadius: lastOfRun ? 6 : 20 }
            : { borderBottomLeftRadius: lastOfRun ? 6 : 20 },
        ]}
      >
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}
        {displayText.trim() ? (
          <Text
            style={[
              type.body,
              {
                color: isUser ? '#fff' : c.text,
                fontSize: 14.5,
                lineHeight: 21,
                marginTop: imageUri ? 8 : 0,
              },
            ]}
          >
            {displayText}
          </Text>
        ) : null}
      </Squish>
      {copied && (
        <FadeInView style={[styles.copiedPill, isUser ? { right: 6 } : { left: 6 }, { backgroundColor: c.text }]}>
          <Text style={[type.label, { color: c.bg, fontSize: 11 }]}>คัดลอกแล้ว</Text>
        </FadeInView>
      )}
    </View>
  );

  if (isUser) return <View style={styles.userRow}>{bubble}</View>;

  // ฝั่ง Numi มีรูปมาสคอตนำ ทำให้รู้ว่าใครพูด ของเดิมเป็นฟองลอย ๆ ไม่มีเจ้าของ
  return (
    <View style={styles.assistantRow}>
      {firstOfRun ? <Mascot size={30} pose="idle" /> : <View style={styles.avatarSpacer} />}
      {bubble}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 3 },
  avatarSpacer: { width: 30 },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  imageOnly: { padding: 0, backgroundColor: 'transparent', overflow: 'hidden' },
  image: { width: 210, height: 210, borderRadius: 18 },
  copiedPill: {
    position: 'absolute',
    bottom: -22,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
