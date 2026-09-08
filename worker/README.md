# Numi Worker

Proxy บาง ๆ ระหว่างแอปกับ OpenRouter หน้าที่มีแค่ **ซ่อน API key** กับ **กันบิลบานปลาย**

## ทำไมต้องมี ทั้งที่เป็นแอปใช้คนเดียว

JS bundle ของ React Native แตกออกมาอ่านได้ (`npx react-native-decompiler` หรือแค่แตก APK ดู `index.android.bundle` ก็เจอ string ตรง ๆ) ถ้าฝัง OpenRouter key ไว้ในแอปแล้วเผลอ push ขึ้น GitHub บอตกวาด repo จะเจอภายในไม่กี่นาที

Cloudflare Workers ฟรี 100,000 requests/วัน ซึ่งเกินพอสำหรับใช้คนเดียวหลายพันเท่า

## ขั้นตอนติดตั้ง

คำสั่งพวกนี้ต้องรันเองทั้งหมด เพราะมีค่าที่เป็นความลับของบัญชีคุณ

### 1. สร้าง KV namespace สำหรับนับโควตา

```bash
cd worker
npx wrangler kv namespace create RATE_LIMIT
```

เอา `id` ที่ได้ไปใส่ใน `wrangler.toml` แทนข้อความ `ใส่-id-ที่ได้จากคำสั่งด้านบน`

### 2. สุ่ม APP_TOKEN

```bash
openssl rand -hex 32
```

เก็บค่านี้ไว้ ต้องใช้สองที่: ใส่เป็น secret ของ Worker และใส่ใน `.env` ของแอป

โทเค็นนี้ไม่ใช่ security ระดับสูง มันแค่กันคนสุ่มเจอ URL แล้วยิงฟรี ถ้าหลุดก็แค่สร้างใหม่แล้ว deploy ทับ — ต่างจาก OpenRouter key ที่หลุดแล้วโดนใช้เครดิตได้จริง

### 3. ใส่ secret สองตัว

```bash
npx wrangler secret put OPENROUTER_KEY
npx wrangler secret put APP_TOKEN
```

`OPENROUTER_KEY` เอามาจาก https://openrouter.ai/keys — คีย์นี้อยู่แค่บน Cloudflare เท่านั้น ไม่เคยเข้ามาในโค้ดแอปหรือใน git

### 4. Deploy

```bash
npx wrangler deploy
```

จะได้ URL หน้าตาแบบ `https://numi-worker.<บัญชีคุณ>.workers.dev`

### 5. ทดสอบด้วย curl ก่อนแตะแอป

ขั้นนี้อย่าข้าม ถ้าข้ามแล้วเจอปัญหาจะแยกไม่ออกว่าพังที่ฝั่งแอปหรือที่ AI

```bash
curl -X POST https://numi-worker.<บัญชีคุณ>.workers.dev \
  -H "Content-Type: application/json" \
  -H "x-app-token: <APP_TOKEN ของคุณ>" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "messages": [
      {"role":"system","content":"คุณคือผู้ช่วยบันทึกอาหาร เรียก tool เมื่อผู้ใช้เล่าว่ากินอะไร"},
      {"role":"user","content":"เมื่อเช้ากินข้าวกะเพราหมูไข่ดาว"}
    ],
    "tools": [{"type":"function","function":{
      "name":"add_meal","description":"เพิ่มมื้ออาหาร",
      "parameters":{"type":"object","properties":{
        "meal_type":{"type":"string","enum":["breakfast","lunch","dinner","snack"]},
        "items":{"type":"array","items":{"type":"object","properties":{
          "name":{"type":"string"},"amount_g":{"type":"number"},"kcal":{"type":"number"}
        },"required":["name","amount_g","kcal"]}}
      },"required":["meal_type","items"]}}}],
    "tool_choice": "auto"
  }' | jq '.choices[0].message'
```

ควรได้ `tool_calls` กลับมา ถ้าได้แต่ `content` เป็นข้อความเปล่า ๆ แปลว่า system prompt ยังไม่ชัดพอ

### 6. ต่อเข้ากับแอป

```bash
cd ..
cp .env.example .env
```

แล้วแก้ `.env`:

```
EXPO_PUBLIC_NUMI_WORKER_URL=https://numi-worker.<บัญชีคุณ>.workers.dev
EXPO_PUBLIC_NUMI_APP_TOKEN=<APP_TOKEN ตัวเดียวกับข้อ 2>
```

รีสตาร์ท Metro ด้วย `npx expo start -c` (ต้องล้าง cache ไม่งั้นค่า env เดิมยังค้างอยู่ใน bundle)

แท็บ "ผู้ช่วย" จะเลิกขึ้นแบนเนอร์เตือนเมื่อทั้งสองค่าถูกใส่ครบ

## ตั้งเพดานค่าใช้จ่าย

ทำทั้งสองชั้น:

1. **ที่ OpenRouter** — Settings → Limits ตั้ง max spend ต่อเดือน
2. **ที่ Worker** — `DAILY_REQUEST_CAP` ใน `src/index.ts` ตั้งไว้ที่ 300 requests/วัน

ใช้จริงประมาณ chat 30 ข้อความ/วัน ตกราว $3-6/เดือน

## สิ่งที่ Worker กันให้

| ป้องกัน | วิธี |
| --- | --- |
| API key หลุดจาก bundle | key อยู่ที่ Cloudflare ฝั่งเดียว |
| คนสุ่มเจอ URL แล้วยิงฟรี | ต้องมี `x-app-token` ที่ตรงกัน |
| เดา token จากเวลาที่ตอบกลับ | เทียบแบบใช้เวลาคงที่ |
| โค้ดยิง loop จนบิลบาน | โควตารายวันใน KV |
| ยิงโมเดลแพงที่ไม่ได้ตั้งใจ | allowlist ตรวจทั้ง `model` และ `models` |
| payload ใหญ่ผิดปกติ | จำกัดที่ 1 MB |
