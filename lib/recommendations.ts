import type { Recipe } from "@/lib/krua-data";
import { estimateNutrition } from "@/lib/nutrition";

export type DietaryFocus = "แพ้ถั่ว" | "แพ้นม" | "แพ้อาหารทะเล" | "มังสวิรัติ" | "ควบคุมน้ำหนัก";

export const DIETARY_FOCUSES: DietaryFocus[] = ["แพ้ถั่ว", "แพ้นม", "แพ้อาหารทะเล", "มังสวิรัติ", "ควบคุมน้ำหนัก"];

const containsAny = (recipe: Recipe, keywords: string[]) => recipe.ingredients.some((ingredient) => {
  const name = ingredient.name.toLocaleLowerCase("th-TH");
  return keywords.some((keyword) => name.includes(keyword));
});

function isSuitable(recipe: Recipe, focus: DietaryFocus) {
  if (focus === "แพ้ถั่ว") return !containsAny(recipe, ["ถั่ว", "อัลมอนด์", "เม็ดมะม่วง", "พิสตาชิโอ", "วอลนัต", "งา", "peanut", "almond", "nut"]);
  if (focus === "แพ้นม") return !containsAny(recipe, ["นม", "ชีส", "เนย", "โยเกิร์ต", "ครีม", "milk", "cheese", "butter", "cream"]);
  if (focus === "แพ้อาหารทะเล") return !containsAny(recipe, ["กุ้ง", "ปู", "ปลา", "ปลาหมึก", "หอย", "แซลมอน", "ทะเล", "prawn", "shrimp", "fish", "seafood"]);
  if (focus === "มังสวิรัติ") return !containsAny(recipe, ["ไก่", "หมู", "เนื้อ", "วัว", "ปลา", "กุ้ง", "ปู", "ปลาหมึก", "หอย", "แซลมอน", "ไก่งวง", "เบคอน", "ไส้กรอก", "chicken", "pork", "beef", "fish"]);
  return estimateNutrition(recipe).calories <= 550;
}

export function getRecipeAlternatives(current: Recipe, recipes: Recipe[], focus: DietaryFocus, limit = 3): Recipe[] {
  const eligible = recipes.filter((recipe) => recipe.id !== current.id && isSuitable(recipe, focus));
  return eligible
    .map((recipe) => {
      const nutrition = estimateNutrition(recipe);
      const sameCategory = recipe.category === current.category ? 4 : 0;
      const healthScore = focus === "ควบคุมน้ำหนัก" ? Math.max(0, 600 - nutrition.calories) / 100 + nutrition.fiber / 3 : 0;
      const proteinScore = focus === "ควบคุมน้ำหนัก" ? Math.min(3, nutrition.protein / 10) : 0;
      return { recipe, score: sameCategory + healthScore + proteinScore };
    })
    .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title, "th"))
    .slice(0, limit)
    .map(({ recipe }) => recipe);
}
