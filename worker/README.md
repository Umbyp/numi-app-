# numi-worker

Cloudflare Worker ที่ทำ 2 อย่าง: (1) ซ่อน OpenRouter API key ไม่ให้ไปอยู่ใน JS bundle ของแอป พร้อมกันบิลบานปลายด้วย rate limit รายวัน (2) route `/delete-account` ให้ผู้ใช้ลบบัญชีตัวเองถาวรได้ (ต้องใช้ service_role key ซึ่งห้ามฝังในแอป)

## Deploy

```bash
cd worker
npm install
npx wrangler login

# สร้าง KV namespace สำหรับ rate limit แล้วเอา id ที่ได้ไปใส่ใน wrangler.toml
npx wrangler kv namespace create RATE_LIMIT

# ตั้ง secrets
npx wrangler secret put OPENROUTER_KEY   # จาก https://openrouter.ai/keys
npx wrangler secret put APP_TOKEN        # สุ่มเอง เช่น: openssl rand -hex 32
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # ดูวิธีสร้างด้านล่าง

npm run deploy
```

### สร้างค่า SUPABASE_SERVICE_ROLE_KEY

เป็น JWT `role: service_role` เซ็นด้วย `GOTRUE_JWT_SECRET` ตัวเดียวกับที่ backend ใช้ (ดูใน
`~/NaselerProject/numi/.env` บนเซิร์ฟเวอร์) — **ต้องสร้างเองบนเซิร์ฟเวอร์ อย่าคัดลอก JWT_SECRET ออกมานอกเครื่อง**
เพราะใครถือ service_role JWT ตัวนี้ bypass RLS ทุกตารางได้หมด

SSH เข้าเซิร์ฟเวอร์แล้วรัน:

```bash
node -e '
const crypto = require("crypto");
const fs = require("fs");
const env = fs.readFileSync(process.env.HOME + "/NaselerProject/numi/.env", "utf8");
const secret = env.match(/^JWT_SECRET=(.*)$/m)[1].trim();
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
const header = { alg: "HS256", typ: "JWT" };
const payload = { role: "service_role", iss: "supabase", iat: 1893456000, exp: 2208816000 };
const data = b64url(header) + "." + b64url(payload);
const sig = crypto.createHmac("sha256", secret).update(data).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
console.log(data + "." + sig);
'
```

เอา output ที่ได้ (ขึ้นต้นด้วย `eyJ...`) มา `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` จากเครื่อง dev ตามปกติ

Deploy เสร็จจะได้ URL แบบ `https://numi-worker.<your-subdomain>.workers.dev`

## ทดสอบด้วย curl ก่อนแตะแอป

```bash
curl -X POST https://numi-worker.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -H "x-app-token: <APP_TOKEN ที่ตั้งไว้>" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "messages": [
      {"role": "system", "content": "คุณคือผู้ช่วยบันทึกอาหาร เรียก tool เมื่อผู้ใช้เล่าว่ากินอะไร"},
      {"role": "user", "content": "เมื่อเช้ากินข้าวกะเพราหมูไข่ดาว"}
    ],
    "tools": [{"type":"function","function":{
      "name":"add_meal",
      "description":"เพิ่มมื้ออาหาร",
      "parameters":{"type":"object","properties":{
        "meal_type":{"type":"string","enum":["breakfast","lunch","dinner","snack"]},
        "items":{"type":"array","items":{"type":"object","properties":{
          "name":{"type":"string"},"amount_g":{"type":"number"},"kcal":{"type":"number"}
        },"required":["name","amount_g","kcal"]}}
      },"required":["meal_type","items"]}
    }}],
    "tool_choice": "auto"
  }' | jq '.choices[0].message'
```

ควรได้ `tool_calls` กลับมา ถ้าได้ `content` เป็นข้อความเปล่า ๆ แปลว่า system prompt ยังไม่ชัดพอ — แก้ที่ prompt ก่อนค่อยกลับมาแตะโค้ด React Native

## ต่อกับแอป

เพิ่มไฟล์ `.env` ที่ root ของโปรเจกต์ (ไม่ commit — อยู่ใน `.gitignore` แล้ว):

```
EXPO_PUBLIC_WORKER_URL=https://numi-worker.<your-subdomain>.workers.dev
EXPO_PUBLIC_APP_TOKEN=<APP_TOKEN เดียวกับที่ตั้งใน wrangler secret>
```

ตั้ง spend limit ที่ OpenRouter ไว้ด้วย (Settings → Limits) กันกรณีโค้ดพังแล้วยิง loop — สำหรับใช้คนเดียว $5-10/เดือนเหลือเฟือ
