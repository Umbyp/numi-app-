import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * ถ่ายรูปแล้วย่อ/บีบอัดก่อนส่งให้ AI ดู — รูปจากกล้องมือถือ 4000px กินโทเค็นมหาศาลโดยไม่ได้ความแม่นเพิ่ม
 * คืนค่า null ถ้าผู้ใช้ยกเลิกหรือไม่อนุญาตกล้อง (เงียบ ๆ ไม่ต้อง error)
 */
export async function captureFoodPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;

  const resized = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1024 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!resized.base64) return null;
  return `data:image/jpeg;base64,${resized.base64}`;
}
