// Tool ที่เปิดใช้ตอนนี้: search_food (read-only) + add_meal (เขียน DB ผ่านการ์ด)
// เพิ่ม log_workout / log_weight / build_meal / get_history ทีหลังทีละตัวตามที่ใช้จริง
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_food',
      description:
        'ค้นหาอาหารในฐานข้อมูลเพื่อเอาค่าโภชนาการจริง เรียกก่อน add_meal เสมอ ค้นได้ทีละหลายคำในครั้งเดียว',
      parameters: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            items: { type: 'string' },
            description: 'ชื่ออาหารที่ต้องการค้น เช่น ["ข้าวสวย","ผัดกะเพราหมู","ไข่ดาว"]',
          },
        },
        required: ['queries'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_workout_plan',
      description:
        'ออกแบบแผนออกกำลังกายหลายวันให้เหมาะกับร่างกายและเป้าหมายของผู้ใช้ ผู้ใช้จะเห็นการ์ดและกดยืนยันเอง',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          rationale: { type: 'string', description: 'อธิบายสั้น ๆ ว่าทำไมออกแบบแบบนี้ให้เหมาะกับผู้ใช้คนนี้' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                day_type: {
                  type: 'string',
                  enum: ['cardio', 'strength', 'both'],
                  description: 'ประเภทของวันนี้ ตัดสินจากเป้าหมายและระดับกิจกรรมของผู้ใช้',
                },
                warmup: { type: 'string', description: 'สิ่งที่ควรทำก่อนเริ่มเล่น เช่น warm-up 5-10 นาที' },
                during_note: { type: 'string', description: 'คำแนะนำภาพรวมระหว่างเล่น เช่น เน้นฟอร์ม พักเพิ่มถ้าจำเป็น' },
                cooldown: { type: 'string', description: 'สิ่งที่ควรทำหลังเล่น เช่น ยืดเหยียดกล้ามเนื้อที่ใช้ไป' },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      category: { type: 'string', enum: ['cardio', 'strength', 'flexibility', 'sport', 'other'] },
                      met: { type: 'number' },
                      duration_min: { type: 'number', description: 'เวลารวมโดยประมาณ รวมเวลาพักระหว่างเซตด้วย' },
                      sets: { type: 'number', description: 'จำนวนเซต (สำหรับท่าเวท)' },
                      reps: { type: 'string', description: 'จำนวนครั้งต่อเซต เช่น "8-12" หรือ "ถึงล้า"' },
                      rest_sec: { type: 'number', description: 'เวลาพักระหว่างเซต (วินาที)' },
                      note: { type: 'string' },
                    },
                    required: ['name', 'category', 'met', 'duration_min'],
                  },
                },
              },
              required: ['label', 'day_type', 'exercises'],
            },
          },
        },
        required: ['title', 'rationale', 'days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_meal',
      description: 'เพิ่มมื้ออาหารลงบันทึกของผู้ใช้ ใส่ได้หลายรายการในมื้อเดียว',
      parameters: {
        type: 'object',
        properties: {
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          },
          date: {
            type: 'string',
            description: 'YYYY-MM-DD เว้นว่างถ้าเป็นวันนี้',
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                food_id: {
                  type: 'string',
                  description: 'id จาก search_food ถ้าหาไม่เจอให้เว้นว่าง',
                },
                name: { type: 'string' },
                amount_g: { type: 'number' },
                kcal: { type: 'number' },
                protein_g: { type: 'number' },
                carb_g: { type: 'number' },
                fat_g: { type: 'number' },
                estimated: {
                  type: 'boolean',
                  description: 'true ถ้าค่าเหล่านี้เป็นการประมาณ ไม่ได้มาจากฐานข้อมูล',
                },
              },
              required: ['name', 'amount_g', 'kcal', 'estimated'],
            },
          },
          note: { type: 'string' },
        },
        required: ['meal_type', 'items'],
      },
    },
  },
] as const;

/** ชื่อ tool ที่แอปรันทันทีโดยไม่ต้องผ่านการ์ดยืนยัน เพราะแค่อ่านข้อมูล ไม่เขียนอะไร */
export const READ_ONLY_TOOLS = new Set(['search_food']);
