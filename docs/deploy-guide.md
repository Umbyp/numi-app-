# คู่มือ Deploy Numi ขึ้น App Store

เอกสารนี้เขียนสำหรับ **Account Holder / Admin** ของทีม Apple Developer — ครอบคลุมทุกขั้นตอนตั้งแต่ตั้งค่า Xcode Cloud จนถึง submit review จริง

สถานะล่าสุด (ตอนเขียนเอกสารนี้): repo พร้อมฝั่งโค้ดแล้ว เหลือแต่ขั้นตอนที่ต้องทำผ่าน Xcode / App Store Connect โดยตรง ซึ่งทำแทนไม่ได้เพราะต้อง sign in ด้วย Apple ID ของทีม

---

## 0. สิ่งที่เตรียมไว้ในโค้ดแล้ว

| รายการ | สถานะ | อยู่ที่ไหน |
|---|---|---|
| Bundle ID | `com.enablebrain.numi` | `app.json` → `expo.ios.bundleIdentifier` |
| Apple Team ID | `XH8KHJL4LS` | `app.json` → `expo.ios.appleTeamId` |
| App icon (1024×1024, ไม่มี alpha) | ผ่านเกณฑ์ Apple แล้ว | `assets/icon.png` |
| สคริปต์ให้ Xcode Cloud รัน build เอง | พร้อมแล้ว | `ios/ci_scripts/ci_post_clone.sh` |
| คำอธิบายสิทธิ์กล้อง (NSCameraUsageDescription) | มีข้อความไทยแล้ว | generate จาก `app.json` plugin `expo-camera` |

**จุดสำคัญที่ต้องรู้**: โฟลเดอร์ `ios/` ทั้งหมด **ไม่ได้ถูก commit เข้า git** (ยกเว้นไฟล์ `ios/ci_scripts/ci_post_clone.sh` ที่ force-add ไว้เป็นกรณีพิเศษ) โปรเจกต์นี้ใช้วิธี "generate ใหม่ทุกครั้ง" ด้วย `expo prebuild` — หมายความว่า:

- ทุกครั้งที่ Xcode Cloud build มันจะ clone repo แล้วรัน `expo prebuild` ใหม่เองผ่าน `ci_post_clone.sh`
- **การแก้ไขใดๆ ที่ทำตรงๆ ใน Xcode (ไม่ผ่าน `app.json`)** เช่น เพิ่ม/ลบ capability, entitlement, หรือแก้ Info.plist มือ — **จะหายไปเวลา build บน Xcode Cloud** เพราะมันสร้าง `ios/` ใหม่จาก `app.json` ทุกครั้ง
- ถ้าต้องแก้อะไรใน native project ให้แก้ผ่าน `app.json` (config plugin) แทนเสมอ ไม่ใช่แก้ใน Xcode โดยตรง

---

## 1. เช็คสิทธิ์และ Apple ID ใน Xcode

1. เปิด Xcode → **Settings (⌘,) → Accounts**
2. เลือก Apple ID ของทีม (ต้องเป็นบัญชีที่ถูก invite เข้าทีมด้วย role **Admin** หรือ **Account Holder**)
3. ดู team ด้านขวา — ต้องเห็นชื่อทีม/บริษัท ไม่ใช่ "(Personal Team)"
   - ถ้ายังเห็นแต่ Personal Team ให้เช็คที่ [developer.apple.com/account](https://developer.apple.com/account) ว่า membership เป็น **Active** แล้วจริง แล้ว sign out/sign in ใหม่ใน Xcode

---

## 2. สร้าง App record ใน App Store Connect

1. เข้า [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → กด **"+"** → **New App**
2. กรอก:
   - **Platform**: iOS
   - **Name**: Numi (หรือชื่อที่ต้องการโชว์บน Store)
   - **Primary Language**: ไทย
   - **Bundle ID**: เลือก `com.enablebrain.numi` (ถ้าไม่มีในลิสต์ ต้องไป **Certificates, Identifiers & Profiles → Identifiers** register bundle ID นี้ก่อน)
   - **SKU**: รหัสภายในอะไรก็ได้ ไม่โชว์ public เช่น `numi-ios-001`
3. กด Create

### App Privacy questionnaire (บังคับ)
แอปเก็บข้อมูลหลายอย่าง ต้องตอบให้ตรงความจริง — ไปที่ App record → **App Privacy**:
- **Health & Fitness** (น้ำหนัก, แคลอรี่, การออกกำลังกาย)
- **Contact Info** (อีเมล — ใช้ตอนสมัคร/เพิ่มเพื่อน)
- **Identifiers** (user ID จาก Supabase auth)
- ระบุว่าข้อมูลเชื่อมกับตัวตนผู้ใช้ (linked to identity) เพราะมีระบบเพื่อน/บัญชี

### Privacy Policy URL (บังคับ)
ต้องมี URL หน้าเว็บ privacy policy จริง ก่อน submit ได้ — ถ้ายังไม่มี ต้องทำหน้าเว็บนี้ก่อน (ไม่จำเป็นต้องซับซ้อน แต่ต้องระบุว่าเก็บข้อมูลอะไร ใช้ทำอะไร ลบยังไง)

### Age Rating
ตอบ questionnaire ตามเนื้อหาจริง (ไม่มีเนื้อหา 18+ ในแอปนี้ น่าจะได้ 4+)

---

## 3. ตั้งค่า Xcode Cloud

1. เปิด `ios/Numi.xcworkspace` ใน Xcode (ต้องมี `ios/` อยู่ในเครื่องก่อน — รัน `npx expo prebuild --platform ios` หรือ `npx expo run:ios` ถ้ายังไม่เคย generate)
2. เมนู **Product → Xcode Cloud → Create Workflow**
   - ถ้าเมนูนี้ไม่ขึ้น ดูหัวข้อ [Troubleshooting](#troubleshooting) ด้านล่าง
3. Sign in ด้วย Apple ID ของทีม (ถ้ายังไม่เคย)
4. เชื่อม GitHub: เลือก repo **Umbyp/numi-app-** → ถ้าเป็นครั้งแรก Xcode จะพาไปหน้า authorize GitHub App ชื่อ "Xcode Cloud" — กด Authorize
5. เลือก **branch**: `main` (แนะนำ merge `claude/sync-engine` เข้า main ก่อนตั้ง workflow เพื่อความง่าย) หรือจะชี้ไปที่ branch ปัจจุบันก่อนก็ได้
6. เลือก **scheme**: `Numi`
7. ตั้ง **workflow actions** (หน้าถัดไป): เลือก **Archive** เป็น action หลัก (สำหรับส่งขึ้น TestFlight) ตั้ง trigger เป็น "on push to branch" หรือ manual ก็ได้ตามต้องการ
8. กด **Next → Complete**

### ตั้ง Environment Variables (สำคัญมาก — ขาดแล้ว build จะพังตอน bundle JS)
ไปที่ App Store Connect → **Xcode Cloud → workflow ที่สร้าง → Environment** → เพิ่ม:

| ชื่อตัวแปร | ค่า |
|---|---|
| `EXPO_PUBLIC_WORKER_URL` | เอาค่าจาก `.env` ในเครื่อง dev |
| `EXPO_PUBLIC_APP_TOKEN` | เอาค่าจาก `.env` ในเครื่อง dev |

(`.env` ไม่ถูก commit เข้า git ด้วยเหตุผลด้านความปลอดภัย เลยต้อง copy ค่ามาใส่ตรงนี้เอง)

### Build แรก
Xcode Cloud จะ trigger build อัตโนมัติตาม trigger ที่ตั้งไว้ ดูผลได้ที่:
- ใน Xcode: ไอคอนรูปเมฆใน Navigator ซ้าย (Report Navigator)
- หรือ App Store Connect → Xcode Cloud → build history

ถ้า build fail ที่ `ci_post_clone.sh` มักจะเป็นเพราะ:
- ลืมตั้ง Environment Variables (ข้อด้านบน)
- `brew install node@20` ล้มเหลว (Xcode Cloud image เปลี่ยน — ลอง `brew install node` เฉยๆ แทน)

---

## 4. Version / Build Number

- **Marketing Version** (เช่น `1.0`) — เวอร์ชันที่ผู้ใช้เห็นบน Store แก้ที่ `app.json` ก็ได้แต่ปัจจุบัน pin ไว้ที่ `1.0` ใน `ios/Numi.xcodeproj` (regenerate ใหม่ทุกครั้งจาก `app.json` → `expo.version`)
- **Build Number** (`CURRENT_PROJECT_VERSION`) — **ต้อง unique ทุกครั้งที่ upload** App Store Connect ไม่รับ build number ซ้ำ ถ้า Xcode Cloud ตั้ง auto-increment ไว้จะจัดการให้เอง ไม่งั้นต้องเพิ่มเลขเองใน `app.json` → `expo.ios.buildNumber` ก่อน build ใหม่ทุกรอบ

---

## 5. TestFlight → Submit for Review

1. หลัง Xcode Cloud build สำเร็จ → build จะขึ้นอัตโนมัติใน App Store Connect → **TestFlight**
2. ตอบ **Export Compliance** คำถาม (แอปนี้ใช้ HTTPS ธรรมดา ไม่ได้เข้ารหัสเอง ตอบ **"No"** / "Uses standard encryption only")
3. ทดสอบผ่าน TestFlight ก่อน (เชิญตัวเองหรือทีมเป็น internal tester)
4. พอพร้อมแล้ว ไปที่แท็บ **App Store** → เลือก build จาก TestFlight → กรอก metadata ที่เหลือ (description, keywords, screenshots) → **Submit for Review**

### เรื่องที่ตรวจแล้วไม่ต้องกังวล
- **Sign in with Apple**: Apple บังคับว่าถ้ามี third-party login (Google) ต้องมีตัวเลือกที่ privacy-friendly เทียบเท่าด้วย (guideline 4.8) — แอปนี้มีสมัครด้วยอีเมล/รหัสผ่านอยู่แล้ว ถือว่าผ่านเกณฑ์ ไม่ต้องเพิ่ม Sign in with Apple

### เรื่องที่ต้องตัดสินใจก่อน submit
- **Push Notifications**: ปัจจุบันถอด `expo-notifications` ออกจาก `app.json` ชั่วคราว (ตามที่ทีมตัดสินใจไว้ก่อนหน้า) — ถ้าจะเปิดใช้ตอน launch ต้อง:
  1. เพิ่ม `expo-notifications` กลับเข้า `plugins` ใน `app.json`
  2. สร้าง APNs Key ใน developer.apple.com → Keys
  3. อัปโหลด key นั้นเข้า Expo/backend push service ที่ใช้ส่ง notification

---

## Troubleshooting

**เมนู Product → Xcode Cloud ไม่ขึ้น**
- ส่วนใหญ่เกิดจาก Xcode ยังไม่เห็นว่า Apple ID ผูกกับทีมที่มี Developer Program membership — เช็ค Settings → Accounts ว่าเห็นชื่อทีมจริง (ไม่ใช่ Personal Team)
- อีกทางเข้าเมนูเดียวกัน: Navigator ซ้ายมือ → ไอคอนรูปเมฆ (Report Navigator) → ปุ่ม "Create Workflow" ตรงนั้นเลย
- ลอง quit Xcode แล้วเปิด `Numi.xcworkspace` ใหม่ให้มันรีเฟรช cache team

**build fail ตอน `pod install` หา node ไม่เจอ**
- เช็คว่า `ci_post_clone.sh` รัน `brew install node@20` สำเร็จก่อน `npm ci` — ถ้า Xcode Cloud image เปลี่ยนเวอร์ชัน node ที่มีให้ preinstall อาจต้องแก้เลขเวอร์ชันใน script

**build fail ตอน bundle JS หา env var ไม่เจอ**
- ลืมตั้ง `EXPO_PUBLIC_WORKER_URL` / `EXPO_PUBLIC_APP_TOKEN` ใน Xcode Cloud workflow → Environment Variables (ข้อ 3 ด้านบน)

**แก้อะไรใน Xcode (Signing & Capabilities, entitlements) แล้วหายตอน build บน Xcode Cloud**
- ตามที่อธิบายไว้หัวข้อ 0 — `ios/` ถูก regenerate ใหม่จาก `app.json` ทุกครั้ง ต้องย้ายการตั้งค่านั้นไปไว้ใน `app.json` (เช่นผ่าน config plugin) แทนการแก้ native project ตรงๆ
