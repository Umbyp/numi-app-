// Tool schemas ที่ส่งให้โมเดล — ชื่อฟิลด์เป็น snake_case ตามธรรมเนียมของ tool calling
// เริ่มจากชุดที่แมปกับ query ที่มีอยู่จริงแล้วเท่านั้น ค่อยเพิ่มทีละตัวทีหลัง

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_food',
      description:
        'ค้นหาอาหารในฐานข้อมูลของแอปเพื่อเอาค่าโภชนาการจริง ต้องเรียกก่อน add_meal เสมอ ค้นหลายคำได้ในครั้งเดียว',
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
      name: 'add_meal',
      description: 'เพิ่มมื้ออาหารลงบันทึกของผู้ใช้ ใส่ได้หลายรายการในมื้อเดียว',
      parameters: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                food_id: { type: 'string', description: 'id จาก search_food ถ้าหาไม่เจอให้เว้นว่าง' },
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
  {
    type: 'function',
    function: {
      name: 'log_workout',
      description:
        'บันทึกการออกกำลังกาย ถ้าไม่ได้บอกแคลอรี่มา ระบบจะคำนวณจาก MET กับน้ำหนักตัวเอง',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          met_key: {
            type: 'string',
            description: 'key จากตาราง MET ของแอป เช่น run_10, cycle_mod, weights_hard',
          },
          duration_min: { type: 'number' },
          kcal_burned: { type: 'number', description: 'ใส่เฉพาะเมื่อผู้ใช้บอกค่าจากนาฬิกา' },
          distance_km: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['name', 'duration_min'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_weight',
      description: 'บันทึกน้ำหนักตัวของวันนี้',
      parameters: {
        type: 'object',
        properties: {
          weight_kg: { type: 'number' },
          body_fat_pct: { type: 'number' },
        },
        required: ['weight_kg'],
      },
    },
  },
] as const;

/**
 * tool ที่อ่านอย่างเดียว รันได้ทันทีโดยไม่ต้องขอยืนยัน
 * ที่เหลือเป็น tool ที่เขียน DB จึงต้องผ่านการ์ดให้ผู้ใช้กดก่อนเสมอ
 */
const READ_ONLY = new Set(['search_food']);

export function needsConfirmation(toolName: string): boolean {
  return !READ_ONLY.has(toolName);
}

export const TOOL_LABELS: Record<string, string> = {
  add_meal: 'เพิ่มมื้ออาหาร',
  log_workout: 'บันทึกการออกกำลังกาย',
  log_weight: 'บันทึกน้ำหนัก',
};
