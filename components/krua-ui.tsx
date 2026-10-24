import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useState, type ReactNode } from "react";

import { ScreenContainer } from "@/components/screen-container";

export const palette = {
  ink: "#16362E",
  forest: "#16624B",
  jade: "#1D8767",
  mint: "#DDF4E9",
  cream: "#FFFCF5",
  paper: "#FFFFFF",
  mango: "#F6B94A",
  coral: "#F17D63",
  peach: "#FFF0E9",
  slate: "#5E716A",
  line: "#DFE8E2",
  soft: "#F2F7F3",
  danger: "#B74736",
};

type IconName = keyof typeof Ionicons.glyphMap;

export function AppScreen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.screen, style]}>
      {children}
    </ScreenContainer>
  );
}

export function TopBar({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tint = palette.forest,
  soft = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tint?: string;
  soft?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: soft ? palette.mint : palette.paper, borderColor: soft ? palette.mint : palette.line }]}
    >
      <Ionicons name={icon} size={20} color={tint} />
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  tone = "forest",
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: "forest" | "mango" | "outline" | "danger";
  disabled?: boolean;
  compact?: boolean;
}) {
  const isOutline = tone === "outline";
  const isMango = tone === "mango";
  const isDanger = tone === "danger";
  const backgroundColor = isOutline ? palette.paper : isMango ? palette.mango : isDanger ? palette.danger : palette.forest;
  const color = isOutline ? palette.forest : isMango ? palette.ink : palette.paper;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.primaryButton, compact && styles.primaryCompact, { backgroundColor, borderColor: isOutline ? palette.line : backgroundColor, opacity: disabled ? 0.48 : 1 }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.primaryLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={14} color={active ? palette.paper : palette.forest} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={[styles.chip, active && styles.chipActive]}>{content}</View>;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.78}
      style={[styles.chip, active && styles.chipActive]}
    >
      {content}
    </TouchableOpacity>
  );
}

const FALLBACK_RECIPE_IMAGE = "/manus-storage/green-curry_09a26921.jpg";

export function RecipeImage({ source, height = 148 }: { source: ImageSourcePropType | string; height?: number }) {
  const [failedSourceKey, setFailedSourceKey] = useState<string | null>(null);
  const sourceKey = typeof source === "string" ? source : JSON.stringify(source);
  const hasFailed = failedSourceKey === sourceKey;
  const resolvedSource = hasFailed ? FALLBACK_RECIPE_IMAGE : source;
  const imageSource = typeof resolvedSource === "string" ? { uri: resolvedSource } : resolvedSource;
  return <Image source={imageSource} onError={hasFailed ? undefined : () => setFailedSourceKey(sourceKey)} style={[styles.recipeImage, { height }]} resizeMode="cover" accessibilityLabel="ภาพประกอบสูตรอาหาร" />;
}

export function OfflineBanner({ onReconnect }: { onReconnect: () => void }) {
  return (
    <View style={styles.offlineBanner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={18} color={palette.ink} />
      <View style={{ flex: 1 }}>
        <Text style={styles.offlineTitle}>กำลังใช้งานออฟไลน์</Text>
        <Text style={styles.offlineText}>ข้อมูลในเครื่องยังแก้ไขและบันทึกได้</Text>
      </View>
      <TouchableOpacity onPress={onReconnect} accessibilityRole="button" accessibilityLabel="ลองเชื่อมต่ออีกครั้ง">
        <Text style={styles.offlineAction}>ลองใหม่</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ErrorRecovery({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={20} color={palette.danger} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.errorTitle}>ต้องการการดูแลเล็กน้อย</Text>
        <Text style={styles.errorText}>{message}</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="ลองใหม่">
          <Text style={styles.retryText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={palette.forest} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action ? <View style={{ marginTop: 6 }}>{action}</View> : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <AppScreen>
      <View style={styles.loading} accessibilityLabel="กำลังโหลดข้อมูล">
        <View style={styles.loadingMark}><Ionicons name="leaf" size={27} color={palette.paper} /></View>
        <ActivityIndicator color={palette.forest} />
        <Text style={styles.loadingText}>กำลังจัดครัวของคุณ…</Text>
      </View>
    </AppScreen>
  );
}

export function SuccessToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <TouchableOpacity style={styles.toast} onPress={onDismiss} activeOpacity={0.9} accessibilityRole="alert" accessibilityLabel={message}>
      <Ionicons name="checkmark-circle" size={20} color={palette.mint} />
      <Text style={styles.toastText}>{message}</Text>
      <Ionicons name="close" size={18} color={palette.mint} />
    </TouchableOpacity>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.cream },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  topText: { flex: 1, gap: 3 },
  eyebrow: { color: palette.jade, fontWeight: "800", fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase" },
  title: { color: palette.ink, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: palette.slate, fontSize: 14, lineHeight: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryCompact: { minHeight: 40, paddingHorizontal: 13, borderRadius: 13 },
  primaryLabel: { fontWeight: "800", fontSize: 15 },
  chip: { minHeight: 32, paddingHorizontal: 12, borderRadius: 15, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center", gap: 5 },
  chipActive: { backgroundColor: palette.forest, borderColor: palette.forest },
  chipText: { fontSize: 12, fontWeight: "700", color: palette.forest },
  chipTextActive: { color: palette.paper },
  recipeImage: { width: "100%", backgroundColor: palette.mint },
  offlineBanner: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFF1C9", borderRadius: 16, padding: 12, flexDirection: "row", gap: 9, alignItems: "center" },
  offlineTitle: { fontSize: 13, color: palette.ink, fontWeight: "800" },
  offlineText: { fontSize: 12, color: palette.slate, lineHeight: 17 },
  offlineAction: { color: palette.forest, fontWeight: "800", fontSize: 13 },
  errorBox: { marginHorizontal: 20, marginBottom: 14, backgroundColor: "#FFF0ED", borderRadius: 16, padding: 14, gap: 10, flexDirection: "row", borderWidth: 1, borderColor: "#F3C4BA" },
  errorTitle: { color: palette.danger, fontSize: 14, fontWeight: "800" },
  errorText: { color: "#76443C", fontSize: 12, lineHeight: 17 },
  retryText: { color: palette.danger, fontSize: 13, fontWeight: "800", paddingTop: 3 },
  emptyState: { marginHorizontal: 20, marginTop: 20, backgroundColor: palette.paper, borderRadius: 24, padding: 26, alignItems: "center", gap: 9, borderWidth: 1, borderColor: palette.line },
  emptyIcon: { width: 58, height: 58, borderRadius: 22, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyDetail: { color: palette.slate, fontSize: 13, lineHeight: 19, textAlign: "center" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 15, backgroundColor: palette.cream },
  loadingMark: { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: palette.forest },
  loadingText: { color: palette.slate, fontSize: 14, fontWeight: "700" },
  toast: { position: "absolute", bottom: 92, left: 18, right: 18, minHeight: 52, borderRadius: 17, paddingHorizontal: 14, backgroundColor: palette.ink, flexDirection: "row", gap: 9, alignItems: "center", zIndex: 50, elevation: 8 },
  toastText: { flex: 1, color: palette.paper, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  sectionHeading: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
});
