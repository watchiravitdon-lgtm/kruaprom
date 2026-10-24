import type { KruaData, Recipe } from "@/lib/krua-data";

export const BACKUP_FORMAT = "kruaprom-backup";
export const BACKUP_VERSION = 1;

export interface KruaBackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: KruaData;
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<Recipe>;
  return typeof recipe.id === "string"
    && typeof recipe.title === "string"
    && typeof recipe.category === "string"
    && typeof recipe.time === "number"
    && typeof recipe.servings === "number"
    && typeof recipe.imageUri === "string"
    && typeof recipe.description === "string"
    && Array.isArray(recipe.ingredients)
    && Array.isArray(recipe.steps);
}

function isBackupData(value: unknown): value is KruaData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<KruaData>;
  return Array.isArray(data.recipes)
    && data.recipes.every(isRecipe)
    && Array.isArray(data.plan)
    && Array.isArray(data.shoppingItems)
    && typeof data.hasOnboarded === "boolean"
    && typeof data.offlineMode === "boolean"
    && typeof data.notificationsEnabled === "boolean"
    && typeof data.notificationTime === "string"
    && typeof data.notificationPermission === "string"
    && (data.unitSystem === "เมตริก" || data.unitSystem === "ถ้วย/ช้อน")
    && typeof data.lastSavedAt === "string";
}

export function createBackupJson(data: KruaData): string {
  const backup: KruaBackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackupJson(raw: string): KruaData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("รูปแบบไฟล์สำรองไม่ถูกต้อง");
  const backup = parsed as Partial<KruaBackupFile>;
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || !isBackupData(backup.data)) {
    throw new Error("ไฟล์นี้ไม่ใช่ไฟล์สำรองของครัวพร้อม หรือเป็นเวอร์ชันที่ไม่รองรับ");
  }

  return {
    ...backup.data,
    removedRecipeIds: Array.isArray(backup.data.removedRecipeIds) ? backup.data.removedRecipeIds : [],
  };
}
