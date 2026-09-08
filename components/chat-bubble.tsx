import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme, useScheme } from '../lib/hooks/use-theme';
import { Mascot } from './mascot';
import { type } from '../lib/fonts';
import { pillShadow } from '../lib/theme';

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
  const imageOnly = !!imageUri && !text.trim();

  const bubble = (
    <View
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
      {text.trim() ? (
        <Text
          style={[
            type.body,
            {
              color: isUser ? c.onBrand : c.text,
              fontSize: 14.5,
              lineHeight: 21,
              marginTop: imageUri ? 8 : 0,
            },
          ]}
        >
          {text}
        </Text>
      ) : null}
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
});
