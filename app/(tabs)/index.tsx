import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppScreen, ErrorRecovery, IconButton, LoadingState, OfflineBanner, palette, PrimaryButton, RecipeImage, SectionHeading } from "@/components/krua-ui";
import { DAYS } from "@/lib/krua-data";
import { useKrua } from "@/lib/krua-store";

export default function HomeScreen() {
  const { recipes, plan, shoppingItems, isHydrating, offlineMode, setOfflineMode, saveError, retrySave } = useKrua();
  if (isHydrating) return <LoadingState />;

  const highlightPlan = plan[0];
  const highlightRecipe = recipes.find((recipe) => recipe.id === highlightPlan?.recipeId) ?? recipes[0];
  const purchased = shoppingItems.filter((item) => item.checked).length;
  const total = shoppingItems.length;
  const plannedDays = new Set(plan.map((item) => item.dayKey)).size;

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.brand}>ครัวพร้อม</Text><Text style={styles.greeting}>วันนี้กินอะไรดี?</Text></View>
          <IconButton icon="notifications-outline" label="ไปยังการตั้งค่าการแจ้งเตือน" onPress={() => router.push("/settings" as never)} soft />
        </View>
        {offlineMode ? <OfflineBanner onReconnect={() => setOfflineMode(false)} /> : null}
        {saveError ? <ErrorRecovery message={saveError} onRetry={() => void retrySave()} /> : null}

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>แผนของสัปดาห์นี้</Text>
          <Text style={styles.heroTitle}>{plannedDays} วันถูกวางไว้แล้ว{`\n`}เหลือแค่ลงมือทำ</Text>
          <View style={styles.heroFooter}>
            <View style={styles.avatarStack}><View style={[styles.avatar, { backgroundColor: palette.mango }]}><Ionicons name="restaurant" size={14} color={palette.ink} /></View><View style={[styles.avatar, { backgroundColor: "#9BD7BF" }]}><Ionicons name="leaf" size={14} color={palette.ink} /></View></View>
            <Text style={styles.heroNote}>ทีละมื้อก็พอ</Text>
          </View>
        </View>

        <SectionHeading title="มื้อถัดไป" action={<TouchableOpacity onPress={() => router.push("/plan" as never)} accessibilityRole="button"><Text style={styles.link}>ดูแผน</Text></TouchableOpacity>} />
        {highlightRecipe ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: highlightRecipe.id } } as never)} style={styles.nextCard} accessibilityRole="button" accessibilityLabel={`ดูสูตร ${highlightRecipe.title}`}>
            <View style={styles.nextImage}><RecipeImage source={highlightRecipe.imageUri} height={115} /></View>
            <View style={styles.nextBody}>
              <Text style={styles.slot}>{DAYS.find((day) => day.key === highlightPlan?.dayKey)?.label ?? "เมนูแนะนำ"} · {highlightPlan?.mealType ?? "มื้อเย็น"}</Text>
              <Text style={styles.nextTitle}>{highlightRecipe.title}</Text>
              <View style={styles.meta}><Ionicons name="time-outline" size={15} color={palette.slate} /><Text style={styles.metaText}>{highlightRecipe.time} นาที</Text><View style={styles.dot} /><Text style={styles.metaText}>{highlightRecipe.servings} ที่</Text></View>
              <Text style={styles.nextAction}>ดูวิธีทำ <Ionicons name="arrow-forward" size={13} /></Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <SectionHeading title="จัดครัวให้พร้อม" />
        <View style={styles.quickGrid}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: palette.mint }]} onPress={() => router.push("/recipes" as never)} accessibilityRole="button" accessibilityLabel="เลือกสูตรอาหาร">
            <View style={[styles.quickIcon, { backgroundColor: palette.paper }]}><Ionicons name="book-outline" size={21} color={palette.forest} /></View>
            <Text style={styles.quickTitle}>เลือกสูตร</Text><Text style={styles.quickDetail}>จากคลังของคุณ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: palette.peach }]} onPress={() => router.push("/shopping" as never)} accessibilityRole="button" accessibilityLabel="เปิดรายการซื้อของ">
            <View style={[styles.quickIcon, { backgroundColor: palette.paper }]}><Ionicons name="cart-outline" size={21} color={palette.coral} /></View>
            <Text style={styles.quickTitle}>ซื้อของ</Text><Text style={styles.quickDetail}>{purchased}/{total} รายการเสร็จแล้ว</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shoppingCard}>
          <View style={styles.shoppingIcon}><Ionicons name="checkmark-done" size={18} color={palette.paper} /></View>
          <View style={{ flex: 1 }}><Text style={styles.shoppingTitle}>รายการซื้อของพร้อมแล้ว</Text><Text style={styles.shoppingDetail}>ติ๊กไปแล้ว {purchased} จาก {total} รายการ</Text></View>
          <PrimaryButton label="เปิด" compact tone="outline" onPress={() => router.push("/shopping" as never)} />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  header: { paddingHorizontal: 20, paddingTop: 11, paddingBottom: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: palette.jade, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  greeting: { color: palette.ink, fontWeight: "900", fontSize: 28, lineHeight: 35, letterSpacing: -0.8, marginTop: 2 },
  hero: { marginHorizontal: 20, padding: 20, minHeight: 176, borderRadius: 26, overflow: "hidden", backgroundColor: palette.forest, justifyContent: "space-between" },
  heroGlow: { position: "absolute", width: 175, height: 175, borderRadius: 87, backgroundColor: "#2D9876", right: -38, top: -54 },
  heroEyebrow: { color: "#BFE9D7", fontSize: 12, fontWeight: "800", letterSpacing: 0.7 },
  heroTitle: { color: palette.paper, fontSize: 22, lineHeight: 29, fontWeight: "900", letterSpacing: -0.4, marginTop: 5 },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatarStack: { flexDirection: "row" }, avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: palette.forest, marginRight: -7 },
  heroNote: { color: "#DDF5E8", fontSize: 12, fontWeight: "700" },
  link: { color: palette.forest, fontSize: 13, fontWeight: "800" },
  nextCard: { marginHorizontal: 20, minHeight: 140, borderRadius: 22, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, flexDirection: "row", overflow: "hidden" },
  nextImage: { width: 116, overflow: "hidden" }, nextBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, justifyContent: "space-between" },
  slot: { color: palette.jade, fontSize: 11, fontWeight: "800" }, nextTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", lineHeight: 22 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 }, metaText: { color: palette.slate, fontSize: 12 }, dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.slate, marginHorizontal: 2 },
  nextAction: { color: palette.forest, fontSize: 12, fontWeight: "800" },
  quickGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 11 }, quickCard: { flex: 1, padding: 15, borderRadius: 21, gap: 7, minHeight: 135 }, quickIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  quickTitle: { color: palette.ink, fontSize: 15, fontWeight: "800", marginTop: 2 }, quickDetail: { color: palette.slate, fontSize: 11, lineHeight: 15 },
  shoppingCard: { marginHorizontal: 20, marginTop: 21, padding: 14, backgroundColor: palette.paper, borderRadius: 20, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center", gap: 10 },
  shoppingIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.jade, alignItems: "center", justifyContent: "center" }, shoppingTitle: { color: palette.ink, fontSize: 13, fontWeight: "800" }, shoppingDetail: { color: palette.slate, fontSize: 11, marginTop: 2 },
});
