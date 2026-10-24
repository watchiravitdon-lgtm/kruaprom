import type { Ingredient, Recipe } from "@/lib/krua-data";

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const round = (value: number) => Math.round(value * 10) / 10;

const profiles: { keywords: string[]; nutritionPer100g: Nutrition }[] = [
  { keywords: ["น้ำมัน", "oil", "เนย", "butter"], nutritionPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 } },
  { keywords: ["กะทิ", "coconut milk"], nutritionPer100g: { calories: 190, protein: 2, carbs: 7, fat: 18, fiber: 1 } },
  { keywords: ["ชีส", "cheese", "มอสซาเรลลา", "เชดดาร์"], nutritionPer100g: { calories: 350, protein: 23, carbs: 3, fat: 28, fiber: 0 } },
  { keywords: ["ไข่", "egg"], nutritionPer100g: { calories: 143, protein: 13, carbs: 1, fat: 10, fiber: 0 } },
  { keywords: ["ไก่", "หมู", "เนื้อ", "วัว", "ปลา", "กุ้ง", "ปลาหมึก", "แซลมอน", "ไก่งวง", "chicken", "pork", "beef", "fish", "salmon"], nutritionPer100g: { calories: 190, protein: 22, carbs: 0, fat: 10, fiber: 0 } },
  { keywords: ["ข้าว", "เส้น", "พาสต้า", "ขนมปัง", "แป้ง", "โอ๊ต", "มักกะโรนี", "rice", "pasta", "bread", "noodle", "oat"], nutritionPer100g: { calories: 350, protein: 9, carbs: 72, fat: 3, fiber: 3 }, },
  { keywords: ["ถั่ว", "เต้าหู้", "ฮัมมุส", "ถั่วลูกไก่", "bean", "tofu", "hummus"], nutritionPer100g: { calories: 160, protein: 9, carbs: 22, fat: 4, fiber: 7 } },
  { keywords: ["น้ำตาล", "น้ำผึ้ง", "ซอส", "ซีอิ๊ว", "พริกแกง", "sugar", "honey", "sauce"], nutritionPer100g: { calories: 180, protein: 2, carbs: 42, fat: 1, fiber: 1 } },
  { keywords: ["กล้วย", "มะม่วง", "แอปเปิล", "มะเขือเทศ", "ผัก", "เห็ด", "แครอท", "บรอกโคลี", "อะโวคาโด", "ผลไม้", "banana", "apple", "vegetable"], nutritionPer100g: { calories: 45, protein: 2, carbs: 9, fat: 1, fiber: 3 } },
];

const categoryDefaults: Record<string, Nutrition> = {
  โปรตีน: { calories: 180, protein: 20, carbs: 0, fat: 9, fiber: 0 },
  "ผักและผลไม้": { calories: 45, protein: 2, carbs: 9, fat: 1, fiber: 3 },
  "ของแห้ง": { calories: 300, protein: 8, carbs: 58, fat: 5, fiber: 4 },
  เครื่องปรุง: { calories: 120, protein: 2, carbs: 24, fat: 2, fiber: 1 },
  "อื่น ๆ": { calories: 120, protein: 5, carbs: 16, fat: 4, fiber: 2 },
};

function profileFor(ingredient: Ingredient): Nutrition {
  const name = ingredient.name.toLocaleLowerCase("th-TH");
  return profiles.find((profile) => profile.keywords.some((keyword) => name.includes(keyword.toLocaleLowerCase("th-TH"))))?.nutritionPer100g ?? categoryDefaults[ingredient.category] ?? categoryDefaults["อื่น ๆ"];
}

function gramsFor(ingredient: Ingredient): number {
  const unit = ingredient.unit.toLocaleLowerCase("th-TH");
  if (unit.includes("กรัม") || unit === "g") return ingredient.quantity;
  if (unit.includes("มล") || unit === "ml") return ingredient.quantity;
  if (unit.includes("ถ้วย")) return ingredient.quantity * 180;
  if (unit.includes("ช้อนโต๊ะ")) return ingredient.quantity * 15;
  if (unit.includes("ช้อนชา")) return ingredient.quantity * 5;
  if (unit.includes("ฟอง")) return ingredient.quantity * 50;
  if (unit.includes("กลีบ")) return ingredient.quantity * 3;
  if (unit.includes("ใบ") || unit.includes("เม็ด")) return ingredient.quantity * 2;
  if (unit.includes("กำมือ")) return ingredient.quantity * 30;
  if (unit.includes("ต้น")) return ingredient.quantity * 20;
  return ingredient.quantity * 100;
}

export function estimateNutrition(recipe: Pick<Recipe, "ingredients" | "servings">): Nutrition {
  const total = recipe.ingredients.reduce<Nutrition>((sum, ingredient) => {
    const profile = profileFor(ingredient);
    const factor = gramsFor(ingredient) / 100;
    return {
      calories: sum.calories + profile.calories * factor,
      protein: sum.protein + profile.protein * factor,
      carbs: sum.carbs + profile.carbs * factor,
      fat: sum.fat + profile.fat * factor,
      fiber: sum.fiber + profile.fiber * factor,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  return {
    calories: Math.round(total.calories / recipe.servings),
    protein: round(total.protein / recipe.servings),
    carbs: round(total.carbs / recipe.servings),
    fat: round(total.fat / recipe.servings),
    fiber: round(total.fiber / recipe.servings),
  };
}
