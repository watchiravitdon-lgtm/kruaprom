import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppScreen, Chip, EmptyState, ErrorRecovery, IconButton, LoadingState, OfflineBanner, palette, PrimaryButton } from "@/components/krua-ui";
import { DAYS, MEAL_TYPES, type DayKey, type MealType, type PlanItem } from "@/lib/krua-data";
import { useKrua } from "@/lib/krua-store";

export default function PlanScreen() {
  const { recipes, plan, isHydrating, offlineMode, setOfflineMode, saveError, retrySave, addPlan, movePlan, removePlan, createShoppingFromPlan } = useKrua();
  const [selectedDay, setSelectedDay] = useState<DayKey>("mon");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("มื้อเย็น");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moving, setMoving] = useState<PlanItem | null>(null);
  if (isHydrating) return <LoadingState />;
  const selectedDayLabel = DAYS.find((day) => day.key === selectedDay)?.label ?? "วันนี้";
  const entries = plan.filter((item) => item.dayKey === selectedDay);
  const plannedSlots = plan.length;

  return (
    <AppScreen>
      <View style={styles.header}><View><Text style={styles.kicker}>เตรียมไว้ล่วงหน้า</Text><Text style={styles.title}>แผนสัปดาห์</Text></View><IconButton icon="cart-outline" label="สร้างรายการซื้อของจากแผน" onPress={createShoppingFromPlan} soft /></View>
      {offlineMode ? <OfflineBanner onReconnect={() => setOfflineMode(false)} /> : null}
      {saveError ? <ErrorRecovery message={saveError} onRetry={() => void retrySave()} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRail}>
        {DAYS.map((day) => <TouchableOpacity key={day.key} onPress={() => setSelectedDay(day.key)} accessibilityRole="tab" accessibilityState={{ selected: selectedDay === day.key }} style={[styles.day, selectedDay === day.key && styles.dayActive]}><Text style={[styles.dayShort, selectedDay === day.key && styles.dayTextActive]}>{day.short}</Text><Text style={[styles.dayNum, selectedDay === day.key && styles.dayTextActive]}>{DAYS.indexOf(day) + 14}</Text></TouchableOpacity>)}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.dayHeading}><View><Text style={styles.dayLabel}>{selectedDayLabel}</Text><Text style={styles.daySummary}>{entries.length ? `${entries.length} มื้อในแผน` : "ยังเว้นว่างไว้"}</Text></View><Chip label={`${plannedSlots}/21 มื้อ`} active /></View>
        {MEAL_TYPES.map((meal) => {
          const entry = entries.find((item) => item.mealType === meal);
          const recipe = recipes.find((item) => item.id === entry?.recipeId);
          return <View key={meal} style={styles.slotCard}>
            <View style={styles.slotHeading}><View style={styles.mealTag}><Ionicons name={meal === "มื้อเช้า" ? "sunny-outline" : meal === "มื้อกลางวัน" ? "partly-sunny-outline" : "moon-outline"} size={15} color={palette.jade} /><Text style={styles.mealText}>{meal}</Text></View>{entry ? <TouchableOpacity onPress={() => setMoving(entry)} accessibilityRole="button" accessibilityLabel={`ย้าย ${meal}`}><Text style={styles.move}>ย้าย</Text></TouchableOpacity> : null}</View>
            {recipe ? <View style={styles.recipeRow}><View style={styles.recipeMark}><Ionicons name="restaurant" size={19} color={palette.forest} /></View><View style={{ flex: 1 }}><Text style={styles.recipeName}>{recipe.title}</Text><Text style={styles.recipeInfo}>{recipe.time} นาที · {recipe.servings} ที่</Text></View><TouchableOpacity onPress={() => removePlan(entry!.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`นำ ${recipe.title} ออกจากแผน`}><Ionicons name="close-circle-outline" size={22} color={palette.slate} /></TouchableOpacity></View> : <TouchableOpacity onPress={() => { setSelectedMeal(meal); setPickerOpen(true); }} style={styles.emptySlot} accessibilityRole="button" accessibilityLabel={`เพิ่มสูตรใน ${meal}`}><Ionicons name="add-circle-outline" size={19} color={palette.jade} /><Text style={styles.emptySlotText}>เพิ่มสูตรในมื้อนี้</Text></TouchableOpacity>}
          </View>;
        })}
        {plan.length === 0 ? <EmptyState icon="calendar-outline" title="เริ่มวางแผนมื้อแรก" detail="เลือกหนึ่งสูตร แล้วครัวพร้อมจะรวมของที่ต้องซื้อให้" /> : null}
        <View style={styles.tip}><Ionicons name="sparkles-outline" size={19} color={palette.mango} /><Text style={styles.tipText}>เพิ่มมื้อแล้วกดไอคอนรถเข็นด้านบน เพื่อรวมวัตถุดิบเป็นรายการซื้อของ</Text></View>
      </ScrollView>

      <Modal transparent visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHead}><View><Text style={styles.sheetTitle}>เลือกสูตรสำหรับ{`\n`}{selectedDayLabel}</Text><Text style={styles.sheetSub}>{selectedMeal} · สูตรที่เลือกจะแทนที่สูตรเดิมใน slot นี้</Text></View><IconButton icon="close" label="ปิด" onPress={() => setPickerOpen(false)} /></View><FlatList data={recipes} keyExtractor={(recipe) => recipe.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} initialNumToRender={10} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews renderItem={({ item: recipe }) => <TouchableOpacity style={styles.pickerRow} onPress={() => { addPlan(selectedDay, selectedMeal, recipe.id); setPickerOpen(false); }} accessibilityRole="button" accessibilityLabel={`เลือก ${recipe.title} สำหรับ${selectedMeal}`}><View style={styles.recipeMark}><Ionicons name="restaurant" size={18} color={palette.forest} /></View><View style={{ flex: 1 }}><Text style={styles.recipeName}>{recipe.title}</Text><Text style={styles.recipeInfo}>{recipe.category} · {recipe.time} นาที</Text></View><Ionicons name="add-circle" size={23} color={palette.forest} /></TouchableOpacity>} /></View></View>
      </Modal>
      <Modal transparent visible={Boolean(moving)} animationType="fade" onRequestClose={() => setMoving(null)}>
        <View style={styles.modalShade}><View style={styles.moveSheet}><Text style={styles.sheetTitle}>ย้ายมื้อนี้ไปวันไหน?</Text><View style={styles.dayChoices}>{DAYS.map((day) => <TouchableOpacity key={day.key} style={styles.dayChoice} onPress={() => { if (moving) movePlan(moving.id, day.key); setMoving(null); }} accessibilityRole="button" accessibilityLabel={`ย้ายไป${day.label}`}><Text style={styles.choiceShort}>{day.short}</Text><Text style={styles.choiceLabel}>{day.label.replace("วัน", "")}</Text></TouchableOpacity>)}</View><PrimaryButton label="ยกเลิก" tone="outline" onPress={() => setMoving(null)} /></View></View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 11, paddingBottom: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { color: palette.jade, fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, title: { color: palette.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 1 },
  dayRail: { paddingHorizontal: 20, paddingVertical: 11, gap: 8 }, day: { width: 47, height: 65, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, gap: 2 }, dayActive: { backgroundColor: palette.forest, borderColor: palette.forest }, dayShort: { color: palette.slate, fontSize: 11, fontWeight: "800" }, dayNum: { color: palette.ink, fontSize: 16, fontWeight: "900" }, dayTextActive: { color: palette.paper }, content: { paddingBottom: 28 }, dayHeading: { marginHorizontal: 20, marginTop: 3, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dayLabel: { color: palette.ink, fontSize: 19, fontWeight: "900" }, daySummary: { color: palette.slate, fontSize: 12, marginTop: 2 },
  slotCard: { marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 20, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, gap: 12 }, slotHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, mealTag: { flexDirection: "row", gap: 6, alignItems: "center" }, mealText: { color: palette.jade, fontSize: 12, fontWeight: "800" }, move: { color: palette.forest, fontSize: 12, fontWeight: "800" }, recipeRow: { flexDirection: "row", alignItems: "center", gap: 10 }, recipeMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center" }, recipeName: { color: palette.ink, fontSize: 14, fontWeight: "800" }, recipeInfo: { color: palette.slate, fontSize: 11, marginTop: 3 }, emptySlot: { minHeight: 42, borderRadius: 13, backgroundColor: palette.soft, flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 11 }, emptySlotText: { color: palette.forest, fontSize: 13, fontWeight: "800" }, tip: { marginHorizontal: 20, marginTop: 12, borderRadius: 18, padding: 14, backgroundColor: "#FFF3D7", flexDirection: "row", gap: 10 }, tipText: { flex: 1, color: palette.ink, fontSize: 12, lineHeight: 18 },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,45,37,0.45)" }, sheet: { maxHeight: "78%", backgroundColor: palette.cream, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }, moveSheet: { backgroundColor: palette.cream, borderRadius: 26, padding: 20, margin: 20, gap: 17, alignSelf: "stretch" }, handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#BCD1C7", alignSelf: "center", marginBottom: 14 }, sheetHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }, sheetTitle: { color: palette.ink, fontSize: 19, lineHeight: 25, fontWeight: "900" }, sheetSub: { color: palette.slate, fontSize: 12, lineHeight: 17, marginTop: 3 }, pickerRow: { padding: 10, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 10 }, dayChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, dayChoice: { width: "30%", flexGrow: 1, minHeight: 68, borderRadius: 16, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center", gap: 2 }, choiceShort: { color: palette.forest, fontSize: 14, fontWeight: "900" }, choiceLabel: { color: palette.slate, fontSize: 10 },
});
