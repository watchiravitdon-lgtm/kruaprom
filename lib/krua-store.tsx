import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createSeedData,
  type DayKey,
  type Ingredient,
  type KruaData,
  type MealType,
  type NotificationPermission,
  type PlanItem,
  type Recipe,
  type ShoppingItem,
} from "@/lib/krua-data";
import { createBackupJson } from "@/lib/krua-backup";
import { RECIPE_IMAGES_BY_ID } from "@/lib/recipe-images";

const STORAGE_KEY = "kruaprom-local-data-v1";
const STORAGE_TIMEOUT_MS = 4500;
type DataUpdater = (current: KruaData) => KruaData;
const SEED_DATA = createSeedData();

function getSeedData(): KruaData {
  return {
    ...SEED_DATA,
    recipes: [...SEED_DATA.recipes],
    plan: [...SEED_DATA.plan],
    shoppingItems: [...SEED_DATA.shoppingItems],
    removedRecipeIds: [...(SEED_DATA.removedRecipeIds ?? [])],
  };
}

async function withStorageTimeout<T>(operation: Promise<T>): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("local storage timeout")), STORAGE_TIMEOUT_MS);
    operation.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

interface KruaContextValue extends KruaData {
  isHydrating: boolean;
  loadError: string | null;
  saveError: string | null;
  message: string | null;
  retryLoad: () => Promise<void>;
  retrySave: () => Promise<void>;
  clearMessage: () => void;
  toggleFavorite: (recipeId: string) => void;
  addRecipe: (recipe: Omit<Recipe, "id">) => Promise<string | null>;
  updateRecipe: (recipeId: string, patch: Omit<Recipe, "id">) => Promise<boolean>;
  duplicateRecipe: (recipeId: string) => void;
  deleteRecipe: (recipeId: string) => void;
  addPlan: (dayKey: DayKey, mealType: MealType, recipeId: string) => void;
  movePlan: (planId: string, dayKey: DayKey) => void;
  removePlan: (planId: string) => void;
  createShoppingFromPlan: () => void;
  toggleShoppingItem: (itemId: string) => void;
  adjustShoppingItem: (itemId: string, amount: number) => void;
  addShoppingItem: (name: string) => void;
  clearCheckedShopping: () => void;
  setNotifications: (enabled: boolean, permission?: NotificationPermission) => void;
  setNotificationTime: (time: string) => void;
  setUnitSystem: (unitSystem: KruaData["unitSystem"]) => void;
  setOfflineMode: (offline: boolean) => void;
  restartOnboarding: () => void;
  finishOnboarding: () => void;
  resetData: () => void;
  simulateSaveError: () => void;
  exportData: () => string;
  importData: (data: KruaData) => Promise<boolean>;
}

const KruaContext = createContext<KruaContextValue | null>(null);

function stamp(data: KruaData): KruaData {
  return { ...data, lastSavedAt: new Date().toISOString() };
}

function isStoredData(value: unknown): value is KruaData {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<KruaData>;
  return Array.isArray(record.recipes)
    && record.recipes.every((recipe) => recipe && typeof recipe === "object" && typeof recipe.id === "string" && typeof recipe.title === "string" && Array.isArray(recipe.ingredients) && Array.isArray(recipe.steps))
    && Array.isArray(record.plan)
    && Array.isArray(record.shoppingItems);
}

function itemKey(item: Pick<ShoppingItem, "name" | "unit">) {
  return `${item.name.trim().toLocaleLowerCase("th-TH")}-${item.unit.trim().toLocaleLowerCase("th-TH")}`;
}

export function KruaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<KruaData>(() => ({ ...getSeedData(), recipes: [], hasOnboarded: true }));
  const [isHydrating, setIsHydrating] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failedSave, setFailedSave] = useState<KruaData | null>(null);

  const persist = useCallback(async (next: KruaData): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError(null);
      setFailedSave(null);
      return true;
    } catch {
      setFailedSave(next);
      setSaveError("บันทึกข้อมูลลงอุปกรณ์ไม่สำเร็จ ข้อมูลที่แก้ไขยังอยู่บนหน้าจอนี้");
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    setIsHydrating(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const raw = await withStorageTimeout(AsyncStorage.getItem(STORAGE_KEY));
      if (!raw) {
        setData(getSeedData());
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredData(parsed)) throw new Error("invalid local data");
      const defaults = getSeedData();
      const removedRecipeIds = new Set(parsed.removedRecipeIds ?? []);
      const storedRecipes = parsed.recipes.map((recipe) => {
        const matchingImage = RECIPE_IMAGES_BY_ID[recipe.id];
        return matchingImage ? { ...recipe, imageUri: matchingImage } : recipe;
      }).filter((recipe) => !removedRecipeIds.has(recipe.id));
      const storedRecipeIds = new Set(storedRecipes.map((recipe) => recipe.id));
      const mergedRecipes = [...storedRecipes, ...defaults.recipes.filter((recipe) => !storedRecipeIds.has(recipe.id) && !removedRecipeIds.has(recipe.id))];
      const imagesUpdated = storedRecipes.some((recipe, index) => recipe.imageUri !== parsed.recipes[index]?.imageUri);
      setData({
        ...defaults,
        ...parsed,
        recipes: mergedRecipes,
        removedRecipeIds: [...removedRecipeIds],
        plan: parsed.plan,
        shoppingItems: parsed.shoppingItems,
      });
      if (mergedRecipes.length !== parsed.recipes.length || imagesUpdated) {
        await persist(stamp({ ...parsed, recipes: mergedRecipes, removedRecipeIds: [...removedRecipeIds] }));
      }
    } catch {
      setLoadError("เปิดข้อมูลสูตรเดิมไม่สำเร็จ ข้อมูลในเครื่องยังไม่ถูกแทนที่ ลองโหลดอีกครั้งได้เลย");
    } finally {
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  const commit = useCallback((updater: DataUpdater, successMessage?: string) => {
    setData((current) => {
      const next = stamp(updater(current));
      void persist(next);
      return next;
    });
    if (successMessage) setMessage(successMessage);
  }, [persist]);

  const retrySave = useCallback(async () => {
    if (!failedSave) {
      await load();
      return;
    }
    const saved = await persist(failedSave);
    if (saved) {
      setData(failedSave);
      setMessage("บันทึกข้อมูลที่ค้างไว้สำเร็จแล้ว");
    }
  }, [failedSave, load, persist]);

  const value = useMemo<KruaContextValue>(() => ({
    ...data,
    isHydrating,
    loadError,
    saveError,
    message,
    retryLoad: load,
    retrySave,
    clearMessage: () => setMessage(null),
    toggleFavorite: (recipeId) => commit((current) => ({ ...current, recipes: current.recipes.map((recipe) => recipe.id === recipeId ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe) }), "อัปเดตรายการโปรดแล้ว"),
    addRecipe: async (recipe) => {
      const id = `recipe-${Date.now()}`;
      const next = stamp({ ...data, recipes: [{ ...recipe, id }, ...data.recipes] });
      if (!await persist(next)) return null;
      setData(next);
      setMessage("บันทึกสูตรใหม่แล้ว");
      return id;
    },
    updateRecipe: async (recipeId, patch) => {
      const next = stamp({ ...data, recipes: data.recipes.map((recipe) => recipe.id === recipeId ? { ...patch, id: recipeId } : recipe) });
      if (!await persist(next)) return false;
      setData(next);
      setMessage("บันทึกการแก้ไขแล้ว");
      return true;
    },
    duplicateRecipe: (recipeId) => commit((current) => {
      const source = current.recipes.find((recipe) => recipe.id === recipeId);
      if (!source) return current;
      const marker = Date.now();
      return {
        ...current,
        recipes: [{ ...source, id: `recipe-${marker}`, title: `${source.title} (คัดลอก)`, isFavorite: false, ingredients: source.ingredients.map((ingredient) => ({ ...ingredient, id: `${ingredient.id}-${marker}` })), steps: [...source.steps] }, ...current.recipes],
      };
    }, "ทำสำเนาสูตรไว้ให้แล้ว"),
    deleteRecipe: (recipeId) => commit((current) => ({ ...current, recipes: current.recipes.filter((recipe) => recipe.id !== recipeId), removedRecipeIds: [...new Set([...(current.removedRecipeIds ?? []), recipeId])], plan: current.plan.filter((item) => item.recipeId !== recipeId) }), "ลบสูตรและมื้อที่เกี่ยวข้องแล้ว"),
    addPlan: (dayKey, mealType, recipeId) => commit((current) => {
      const existing = current.plan.find((item) => item.dayKey === dayKey && item.mealType === mealType);
      const nextItem: PlanItem = existing ? { ...existing, recipeId } : { id: `plan-${Date.now()}`, dayKey, mealType, recipeId };
      return { ...current, plan: existing ? current.plan.map((item) => item.id === existing.id ? nextItem : item) : [...current.plan, nextItem] };
    }, "เพิ่มลงแผนประจำสัปดาห์แล้ว"),
    movePlan: (planId, dayKey) => commit((current) => {
      const moving = current.plan.find((item) => item.id === planId);
      if (!moving) return current;
      const collision = current.plan.find((item) => item.id !== planId && item.dayKey === dayKey && item.mealType === moving.mealType);
      return {
        ...current,
        plan: current.plan.filter((item) => item.id !== collision?.id).map((item) => item.id === planId ? { ...item, dayKey } : item),
      };
    }, "ย้ายมื้ออาหารแล้ว โดยแทนที่มื้อชนกัน"),
    removePlan: (planId) => commit((current) => ({ ...current, plan: current.plan.filter((item) => item.id !== planId) }), "นำมื้อนี้ออกจากแผนแล้ว"),
    createShoppingFromPlan: () => commit((current) => {
      const merged = new Map<string, ShoppingItem>();
      const merge = (item: ShoppingItem) => {
        const key = itemKey(item);
        const prior = merged.get(key);
        merged.set(key, prior ? { ...prior, quantity: prior.quantity + item.quantity, checked: prior.checked && item.checked, source: prior.source === "manual" ? "manual" : item.source } : item);
      };
      current.shoppingItems.filter((item) => item.source === "manual").forEach((item) => merge({ ...item }));
      current.plan.forEach((entry) => {
        const recipe = current.recipes.find((item) => item.id === entry.recipeId);
        recipe?.ingredients.forEach((ingredient: Ingredient) => merge({ id: `shop-${itemKey(ingredient).replace(/[^a-z0-9ก-๙]+/gi, "-")}`, name: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit, category: ingredient.category, checked: false, source: "plan" }));
      });
      return { ...current, shoppingItems: Array.from(merged.values()) };
    }, "รวมวัตถุดิบจากแผนเข้าสู่รายการแล้ว"),
    toggleShoppingItem: (itemId) => commit((current) => ({ ...current, shoppingItems: current.shoppingItems.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) })),
    adjustShoppingItem: (itemId, amount) => commit((current) => ({ ...current, shoppingItems: current.shoppingItems.map((item) => item.id === itemId ? { ...item, quantity: Math.max(0.5, item.quantity + amount) } : item) })),
    addShoppingItem: (name) => {
      const cleaned = name.trim();
      if (!cleaned) { setMessage("พิมพ์ชื่อรายการก่อนเพิ่ม"); return; }
      commit((current) => ({ ...current, shoppingItems: [...current.shoppingItems, { id: `manual-${Date.now()}`, name: cleaned, quantity: 1, unit: "ชิ้น", category: "อื่น ๆ", checked: false, source: "manual" }] }), "เพิ่มรายการเองแล้ว");
    },
    clearCheckedShopping: () => commit((current) => ({ ...current, shoppingItems: current.shoppingItems.filter((item) => !item.checked) }), "ล้างรายการที่ซื้อแล้ว"),
    setNotifications: (enabled, permission) => commit((current) => ({ ...current, notificationsEnabled: enabled, notificationPermission: permission ?? current.notificationPermission }), enabled ? "เปิดการแจ้งเตือนแล้ว" : "ปิดการแจ้งเตือนแล้ว"),
    setNotificationTime: (notificationTime) => commit((current) => ({ ...current, notificationTime }), "บันทึกเวลาแจ้งเตือนแล้ว"),
    setUnitSystem: (unitSystem) => commit((current) => ({ ...current, unitSystem }), "เปลี่ยนหน่วยวัดแล้ว"),
    setOfflineMode: (offlineMode) => commit((current) => ({ ...current, offlineMode }), offlineMode ? "เข้าสู่โหมดออฟไลน์" : "กลับมาเชื่อมต่อแล้ว"),
    restartOnboarding: () => commit((current) => ({ ...current, hasOnboarded: false })),
    finishOnboarding: () => commit((current) => ({ ...current, hasOnboarded: true })),
    resetData: () => {
      const fresh = { ...getSeedData(), hasOnboarded: true };
      setData(fresh);
      void persist(fresh);
      setMessage("กู้คืนข้อมูลตัวอย่างแล้ว");
    },
    simulateSaveError: () => setSaveError("ตัวอย่างข้อผิดพลาด: บันทึกครั้งล่าสุดไม่สำเร็จ ลองบันทึกใหม่ได้เลย"),
    exportData: () => createBackupJson(data),
    importData: async (importedData) => {
      const next = stamp({ ...importedData, removedRecipeIds: importedData.removedRecipeIds ?? [] });
      if (!await persist(next)) return false;
      setData(next);
      setMessage("นำเข้าข้อมูลสูตรสำเร็จแล้ว");
      return true;
    },
  }), [commit, data, isHydrating, load, loadError, message, persist, retrySave, saveError]);

  return <KruaContext.Provider value={value}>{children}</KruaContext.Provider>;
}

export function useKrua() {
  const context = useContext(KruaContext);
  if (!context) throw new Error("useKrua must be used inside KruaProvider");
  return context;
}
