import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';
import { fontFamily } from '../lib/fonts';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * กันแอปพังทั้งจอเวลา component ไหนก็ตาม throw ตอน render — ต้องเป็น class component เพราะ
 * React error boundary ทำผ่าน hook ไม่ได้ ตั้งใจไม่พึ่ง useTheme/store เพราะถ้าตัวนั้นเป็นต้นเหตุ
 * ที่พัง หน้า fallback เองก็จะพังตามไปด้วย — ใช้ token สีตรง ๆ จาก lib/theme แทน
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const c = colors.light;
      return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
          <Text style={[styles.title, { color: c.text }]}>เกิดข้อผิดพลาดบางอย่าง</Text>
          <Text style={[styles.message, { color: c.subtext }]}>
            ขออภัย มีบางอย่างทำงานผิดพลาดจนแสดงผลไม่ได้ ลองกดปุ่มด้านล่างเพื่อลองใหม่อีกครั้ง
          </Text>
          {__DEV__ && (
            <Text style={[styles.debug, { color: c.faint, backgroundColor: c.surfaceAlt }]} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable style={[styles.button, { backgroundColor: c.brand }]} onPress={this.reset}>
            <Text style={styles.buttonText}>ลองใหม่</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontFamily: fontFamily(800), fontSize: 19, textAlign: 'center' },
  message: { fontFamily: fontFamily(500), fontSize: 14, textAlign: 'center', lineHeight: 21 },
  debug: { fontFamily: fontFamily(400), fontSize: 11, padding: 10, borderRadius: 10, marginTop: 4, width: '100%' },
  button: { marginTop: 12, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  buttonText: { fontFamily: fontFamily(700), fontSize: 15, color: '#fff' },
});
