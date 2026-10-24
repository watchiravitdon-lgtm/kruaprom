import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppScreen, Chip, IconButton, palette, PrimaryButton, SectionHeading } from "@/components/krua-ui";
import { RECIPE_IMAGES, type Ingredient, type Recipe } from "@/lib/krua-data";
import { useKrua } from "@/lib/krua-store";

const categories = ["จานเดียว", "แกงและซุป", "สุขภาพดี", "ของว่าง"];
const newIngredient = (): Ingredient => ({ id: `draft-${Date.now()}`, name: "", quantity: 1, unit: "ชิ้น", category: "อื่น ๆ" });

export default function RecipeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { recipes, addRecipe, updateRecipe } = useKrua();
  const existing = recipes.find((recipe) => recipe.id === id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? categories[0]);
  const [time, setTime] = useState(String(existing?.time ?? 25));
  const [servings, setServings] = useState(String(existing?.servings ?? 2));
  const [description, setDescription] = useState(existing?.description ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(existing?.ingredients.map((item) => ({ ...item })) ?? [newIngredient()]);
  const [stepsText, setStepsText] = useState(existing?.steps.join("\n") ?? "เตรียมวัตถุดิบให้พร้อม\nปรุงและเสิร์ฟขณะร้อน");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateIngredient = (ingredientId: string, patch: Partial<Ingredient>) => setIngredients((items) => items.map((item) => item.id === ingredientId ? { ...item, ...patch } : item));
  const save = async () => {
    const numericTime = Number(time);
    const numericServings = Number(servings);
    const invalidIngredient = ingredients.find((ingredient) => !ingredient.name.trim() || !ingredient.unit.trim() || !Number.isFinite(Number(ingredient.quantity)) || Number(ingredient.quantity) <= 0);
    const cleanedIngredients = ingredients.map((ingredient) => ({ ...ingredient, name: ingredient.name.trim(), unit: ingredient.unit.trim(), quantity: Number(ingredient.quantity) }));
    const steps = stepsText.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!title.trim()) { setError("ใส่ชื่อสูตรก่อนบันทึก"); return; }
    if (!Number.isFinite(numericTime) || numericTime <= 0) { setError("เวลาทำต้องเป็นตัวเลขมากกว่า 0 นาที"); return; }
    if (!Number.isFinite(numericServings) || numericServings <= 0) { setError("จำนวนเสิร์ฟต้องเป็นตัวเลขมากกว่า 0"); return; }
    if (invalidIngredient) { setError("กรอกชื่อ ปริมาณที่มากกว่า 0 และหน่วยให้ครบทุกวัตถุดิบ"); return; }
    if (steps.length === 0) { setError("เพิ่มขั้นตอนทำอย่างน้อย 1 ขั้นตอน"); return; }
    const payload: Omit<Recipe, "id"> = { title: title.trim(), category, time: numericTime, servings: numericServings, description: description.trim() || "สูตรโปรดที่ทำให้มื้อธรรมดาง่ายขึ้น", imageUri: existing?.imageUri ?? (category === "แกงและซุป" ? RECIPE_IMAGES.curry : category === "จานเดียว" ? RECIPE_IMAGES.basil : RECIPE_IMAGES.tofu), ingredients: cleanedIngredients, steps, isFavorite: existing?.isFavorite ?? false };
    setError(null);
    setSaving(true);
    const saved = existing ? await updateRecipe(existing.id, payload) : Boolean(await addRecipe(payload));
    setSaving(false);
    if (!saved) { setError("บันทึกลงอุปกรณ์ไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ครบ ลองบันทึกอีกครั้งได้เลย"); return; }
    router.back();
  };

  return (
    <AppScreen>
      <View style={styles.header}><IconButton icon="close" label="ยกเลิก" onPress={() => router.back()} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.kicker}>{existing ? "ปรับให้ถูกใจ" : "เริ่มจากสิ่งที่มี"}</Text><Text style={styles.title}>{existing ? "แก้ไขสูตร" : "สร้างสูตรใหม่"}</Text></View><TouchableOpacity onPress={() => void save()} disabled={saving} accessibilityRole="button" accessibilityLabel="บันทึกสูตร"><Text style={[styles.save, saving && styles.saveDisabled]}>{saving ? "กำลังบันทึก" : "บันทึก"}</Text></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={19} color={palette.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
        <Text style={styles.label}>ชื่อสูตร <Text style={styles.required}>*</Text></Text><TextInput value={title} onChangeText={setTitle} placeholder="เช่น ผัดกะเพราเต้าหู้" placeholderTextColor="#92A19B" style={styles.input} accessibilityLabel="ชื่อสูตร" />
        <Text style={styles.label}>คำอธิบายสั้น ๆ</Text><TextInput value={description} onChangeText={setDescription} placeholder="รสชาติหรือเหตุผลที่อยากทำเมนูนี้" placeholderTextColor="#92A19B" style={[styles.input, styles.multiline]} multiline accessibilityLabel="คำอธิบายสูตร" />
        <Text style={styles.label}>หมวดหมู่</Text><View style={styles.chips}>{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</View>
        <View style={styles.numberRow}><View style={{ flex: 1 }}><Text style={styles.label}>เวลาทำ (นาที)</Text><TextInput value={time} onChangeText={setTime} keyboardType="number-pad" style={styles.input} accessibilityLabel="เวลาทำเป็นนาที" /></View><View style={{ flex: 1 }}><Text style={styles.label}>จำนวนเสิร์ฟ</Text><TextInput value={servings} onChangeText={setServings} keyboardType="number-pad" style={styles.input} accessibilityLabel="จำนวนเสิร์ฟ" /></View></View>
        <SectionHeading title="วัตถุดิบ" />
        <View style={styles.ingredients}>{ingredients.map((ingredient, index) => <View key={ingredient.id} style={styles.ingredientBox}><View style={styles.ingredientTop}><Text style={styles.ingredientLabel}>รายการ {index + 1}</Text>{ingredients.length > 1 ? <TouchableOpacity onPress={() => setIngredients((items) => items.filter((item) => item.id !== ingredient.id))} accessibilityRole="button" accessibilityLabel={`ลบวัตถุดิบ ${index + 1}`}><Ionicons name="trash-outline" size={18} color={palette.danger} /></TouchableOpacity> : null}</View><TextInput value={ingredient.name} onChangeText={(name) => updateIngredient(ingredient.id, { name })} placeholder="ชื่อวัตถุดิบ" placeholderTextColor="#92A19B" style={styles.input} accessibilityLabel={`ชื่อวัตถุดิบ ${index + 1}`} /><View style={styles.ingredientNumbers}><TextInput value={String(ingredient.quantity)} onChangeText={(value) => updateIngredient(ingredient.id, { quantity: Number(value) || 0 })} keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} accessibilityLabel={`จำนวนวัตถุดิบ ${index + 1}`} /><TextInput value={ingredient.unit} onChangeText={(unit) => updateIngredient(ingredient.id, { unit })} style={[styles.input, { flex: 1 }]} accessibilityLabel={`หน่วยวัตถุดิบ ${index + 1}`} /></View></View>)}</View>
        <PrimaryButton label="เพิ่มวัตถุดิบ" tone="outline" icon="add-circle-outline" onPress={() => setIngredients((items) => [...items, newIngredient()])} />
        <SectionHeading title="วิธีทำ" /><Text style={styles.help}>เขียนทีละบรรทัด ระบบจะเรียงเป็นขั้นตอนให้</Text><TextInput value={stepsText} onChangeText={setStepsText} multiline placeholder="ขั้นตอนที่ 1\nขั้นตอนที่ 2" placeholderTextColor="#92A19B" style={[styles.input, styles.stepsInput]} accessibilityLabel="วิธีทำ เขียนหนึ่งขั้นตอนต่อหนึ่งบรรทัด" />
        <PrimaryButton label={saving ? "กำลังบันทึก…" : existing ? "บันทึกการแก้ไข" : "บันทึกสูตรใหม่"} icon="checkmark-circle-outline" disabled={saving} onPress={() => void save()} />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 11, flexDirection: "row", alignItems: "center" }, kicker: { color: palette.jade, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }, title: { color: palette.ink, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }, save: { color: palette.forest, fontSize: 15, fontWeight: "900", padding: 8 }, saveDisabled: { color: palette.slate }, content: { padding: 20, paddingTop: 6, gap: 8, paddingBottom: 35 }, error: { borderRadius: 15, padding: 12, backgroundColor: "#FFF0ED", flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 5 }, errorText: { flex: 1, color: palette.danger, fontSize: 13, fontWeight: "700" }, label: { color: palette.ink, fontSize: 13, fontWeight: "800", marginTop: 5 }, required: { color: palette.coral }, input: { minHeight: 48, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, color: palette.ink, fontSize: 14 }, multiline: { minHeight: 79, textAlignVertical: "top" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 5 }, numberRow: { flexDirection: "row", gap: 10, marginTop: 1 }, ingredients: { gap: 9, marginBottom: 3 }, ingredientBox: { padding: 12, backgroundColor: palette.paper, borderRadius: 18, borderWidth: 1, borderColor: palette.line, gap: 8 }, ingredientTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, ingredientLabel: { color: palette.jade, fontSize: 11, fontWeight: "900" }, ingredientNumbers: { flexDirection: "row", gap: 8 }, help: { color: palette.slate, fontSize: 12, lineHeight: 17, marginTop: -4, marginBottom: 2 }, stepsInput: { minHeight: 132, textAlignVertical: "top", marginBottom: 4 },
});
