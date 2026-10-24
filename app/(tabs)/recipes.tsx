import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppScreen, Chip, EmptyState, ErrorRecovery, IconButton, LoadingState, OfflineBanner, palette, PrimaryButton, RecipeImage, SectionHeading } from "@/components/krua-ui";
import { estimateNutrition } from "@/lib/nutrition";
import { useKrua } from "@/lib/krua-store";

type CalorieFilter = "ทั้งหมด" | "ไม่เกิน 300" | "301–600" | "601–900" | "มากกว่า 900";
type TimeFilter = "ทั้งหมด" | 30 | 60 | 90;
type ServingFilter = "ทั้งหมด" | 2 | 4 | 6;

export default function RecipesScreen() {
  const { recipes, isHydrating, offlineMode, setOfflineMode, loadError, retryLoad, saveError, retrySave, toggleFavorite } = useKrua();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [calorieFilter, setCalorieFilter] = useState<CalorieFilter>("ทั้งหมด");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ทั้งหมด");
  const [servingFilter, setServingFilter] = useState<ServingFilter>("ทั้งหมด");
  const [filterOpen, setFilterOpen] = useState(false);
  const categories = ["ทั้งหมด", ...Array.from(new Set(recipes.map((recipe) => recipe.category)))];
  const nutritionById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, estimateNutrition(recipe)])), [recipes]);
  const activeFilterCount = [calorieFilter !== "ทั้งหมด", timeFilter !== "ทั้งหมด", servingFilter !== "ทั้งหมด", favoritesOnly].filter(Boolean).length;
  const results = useMemo(() => recipes.filter((recipe) => {
    const haystack = `${recipe.title} ${recipe.category} ${recipe.ingredients.map((ingredient) => ingredient.name).join(" ")}`.toLowerCase();
    const calories = nutritionById.get(recipe.id)?.calories ?? 0;
    const calorieMatch = calorieFilter === "ทั้งหมด" || (calorieFilter === "ไม่เกิน 300" && calories <= 300) || (calorieFilter === "301–600" && calories >= 301 && calories <= 600) || (calorieFilter === "601–900" && calories >= 601 && calories <= 900) || (calorieFilter === "มากกว่า 900" && calories > 900);
    const timeMatch = timeFilter === "ทั้งหมด" || recipe.time <= timeFilter;
    const servingMatch = servingFilter === "ทั้งหมด" || recipe.servings === servingFilter;
    return haystack.includes(query.trim().toLowerCase()) && (category === "ทั้งหมด" || recipe.category === category) && calorieMatch && timeMatch && servingMatch && (!favoritesOnly || recipe.isFavorite);
  }), [calorieFilter, category, favoritesOnly, nutritionById, query, recipes, servingFilter, timeFilter]);
  if (isHydrating) return <LoadingState />;

  return (
    <AppScreen>
      <View style={styles.header}><View><Text style={styles.kicker}>คลังของคุณ</Text><Text style={styles.title}>สูตรอาหาร</Text></View><IconButton icon="add" label="สร้างสูตรใหม่" onPress={() => router.push("/recipe/form" as never)} soft /></View>
      {offlineMode ? <OfflineBanner onReconnect={() => setOfflineMode(false)} /> : null}
      {loadError ? <ErrorRecovery message={loadError} onRetry={() => void retryLoad()} /> : null}
      {saveError ? <ErrorRecovery message={saveError} onRetry={() => void retrySave()} /> : null}
      <View style={styles.search}><Ionicons name="search" color={palette.slate} size={19} /><TextInput value={query} onChangeText={setQuery} placeholder="ค้นหาชื่อสูตรหรือวัตถุดิบ" placeholderTextColor="#92A19B" style={styles.searchInput} accessibilityLabel="ค้นหาสูตรหรือวัตถุดิบ" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>
      <View style={styles.filterBar}><Text style={styles.filterSummary}>{activeFilterCount ? `เปิดตัวกรอง ${activeFilterCount} รายการ` : "ค้นหาแบบละเอียดด้วยแคลอรี เวลา และจำนวนเสิร์ฟ"}</Text><TouchableOpacity style={styles.filterButton} onPress={() => setFilterOpen(true)} accessibilityRole="button" accessibilityLabel="เปิดตัวกรองละเอียด"><Ionicons name="options-outline" size={17} color={palette.forest} /><Text style={styles.filterButtonText}>ตัวกรอง{activeFilterCount ? ` (${activeFilterCount})` : ""}</Text></TouchableOpacity></View>
      <FlatList
        data={results}
        keyExtractor={(recipe) => recipe.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={<SectionHeading title={`${results.length} สูตรที่ตรงใจ`} />}
        ListEmptyComponent={<EmptyState icon="search-outline" title="ยังไม่พบสูตรนี้" detail="ลองล้างตัวกรอง หรือเพิ่มสูตรโปรดของคุณเอง" action={<TouchableOpacity onPress={() => { setCategory("ทั้งหมด"); setFavoritesOnly(false); setQuery(""); }}><Text style={styles.reset}>ล้างตัวกรอง</Text></TouchableOpacity>} />}
        renderItem={({ item: recipe }) => {
          const nutrition = estimateNutrition(recipe);
          return (
          <View key={recipe.id} style={styles.card}>
            <TouchableOpacity activeOpacity={0.88} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } } as never)} accessibilityRole="button" accessibilityLabel={`ดูสูตร ${recipe.title}`}>
              <RecipeImage source={recipe.imageUri} height={133} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}><View style={styles.category}><Text style={styles.categoryText}>{recipe.category}</Text></View></View>
                <Text style={styles.recipeTitle}>{recipe.title}</Text><Text style={styles.desc} numberOfLines={2}>{recipe.description}</Text>
                <View style={styles.meta}><Ionicons name="time-outline" size={15} color={palette.slate} /><Text style={styles.metaText}>{recipe.time} นาที</Text><Text style={styles.bullet}>•</Text><Ionicons name="people-outline" size={15} color={palette.slate} /><Text style={styles.metaText}>{recipe.servings} ที่</Text><Text style={styles.bullet}>•</Text><Ionicons name="flame-outline" size={15} color={palette.coral} /><Text style={styles.calorieText}>{nutrition.calories} kcal</Text></View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.favoriteButton} accessibilityRole="button" accessibilityLabel={recipe.isFavorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"} onPress={() => toggleFavorite(recipe.id)} hitSlop={8}><Ionicons name={recipe.isFavorite ? "heart" : "heart-outline"} size={21} color={recipe.isFavorite ? palette.coral : palette.slate} /></TouchableOpacity>
          </View>
          );
        }}
      />
      <Modal transparent visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalShade}><View style={styles.filterSheet}><View style={styles.handle} /><View style={styles.sheetHead}><View><Text style={styles.sheetTitle}>กรองสูตรอาหาร</Text><Text style={styles.sheetSub}>เลือกเงื่อนไขได้หลายแบบพร้อมกัน</Text></View><IconButton icon="close" label="ปิดตัวกรอง" onPress={() => setFilterOpen(false)} /></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <Text style={styles.filterLabel}>แคลอรีต่อเสิร์ฟ</Text><View style={styles.chipWrap}>{(["ทั้งหมด", "ไม่เกิน 300", "301–600", "601–900", "มากกว่า 900"] as CalorieFilter[]).map((item) => <Chip key={item} label={item === "ทั้งหมด" ? item : `${item} kcal`} active={calorieFilter === item} onPress={() => setCalorieFilter(item)} />)}</View>
            <Text style={styles.filterLabel}>เวลาเตรียมไม่เกิน</Text><View style={styles.chipWrap}>{(["ทั้งหมด", 30, 60, 90] as TimeFilter[]).map((item) => <Chip key={String(item)} label={item === "ทั้งหมด" ? item : `${item} นาที`} active={timeFilter === item} onPress={() => setTimeFilter(item)} />)}</View>
            <Text style={styles.filterLabel}>จำนวนเสิร์ฟ</Text><View style={styles.chipWrap}>{(["ทั้งหมด", 2, 4, 6] as ServingFilter[]).map((item) => <Chip key={String(item)} label={item === "ทั้งหมด" ? item : `${item} ที่`} active={servingFilter === item} onPress={() => setServingFilter(item)} />)}</View>
            <Text style={styles.filterLabel}>รายการพิเศษ</Text><View style={styles.chipWrap}><Chip label="รายการโปรดเท่านั้น" icon="heart" active={favoritesOnly} onPress={() => setFavoritesOnly((current) => !current)} /></View>
            <View style={styles.filterActions}><PrimaryButton label="ล้างตัวกรอง" tone="outline" onPress={() => { setCategory("ทั้งหมด"); setCalorieFilter("ทั้งหมด"); setTimeFilter("ทั้งหมด"); setServingFilter("ทั้งหมด"); setFavoritesOnly(false); }} /><PrimaryButton label={`แสดง ${results.length} สูตร`} onPress={() => setFilterOpen(false)} /></View>
          </ScrollView>
        </View></View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 11, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { color: palette.jade, fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, title: { color: palette.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 1 },
  search: { height: 50, marginHorizontal: 20, paddingHorizontal: 14, borderRadius: 16, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center", gap: 9 }, searchInput: { flex: 1, color: palette.ink, fontSize: 14, paddingVertical: 0 }, filterBar: { marginHorizontal: 20, paddingTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, filterSummary: { flex: 1, color: palette.slate, fontSize: 11 }, filterButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12, backgroundColor: palette.mint }, filterButtonText: { color: palette.forest, fontSize: 12, fontWeight: "800" },
  filters: { paddingHorizontal: 20, paddingVertical: 13, gap: 8 }, content: { paddingBottom: 28 }, card: { marginHorizontal: 20, marginBottom: 14, borderRadius: 22, overflow: "hidden", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, position: "relative" }, cardBody: { padding: 15, gap: 8 }, cardTop: { flexDirection: "row", alignItems: "center" }, favoriteButton: { position: "absolute", right: 14, top: 146, width: 36, height: 36, borderRadius: 13, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }, category: { alignSelf: "flex-start", backgroundColor: palette.mint, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 10 }, categoryText: { color: palette.forest, fontSize: 11, fontWeight: "800" }, recipeTitle: { color: palette.ink, fontSize: 19, fontWeight: "900", letterSpacing: -0.3, paddingRight: 35 }, desc: { color: palette.slate, fontSize: 13, lineHeight: 19, paddingRight: 30 }, meta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1, flexWrap: "wrap" }, metaText: { color: palette.slate, fontSize: 12 }, calorieText: { color: palette.coral, fontSize: 12, fontWeight: "800" }, bullet: { color: palette.slate, fontSize: 12, marginHorizontal: 2 }, reset: { color: palette.forest, fontWeight: "800", fontSize: 13 }, modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,45,37,0.45)" }, filterSheet: { maxHeight: "88%", backgroundColor: palette.cream, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }, handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#BCD1C7", alignSelf: "center", marginBottom: 14 }, sheetHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }, sheetTitle: { color: palette.ink, fontSize: 20, lineHeight: 25, fontWeight: "900" }, sheetSub: { color: palette.slate, fontSize: 12, lineHeight: 17, marginTop: 3 }, filterContent: { paddingBottom: 12, gap: 10 }, filterLabel: { color: palette.ink, fontSize: 13, fontWeight: "900", marginTop: 5 }, chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, filterActions: { flexDirection: "row", gap: 8, marginTop: 14 },
});
