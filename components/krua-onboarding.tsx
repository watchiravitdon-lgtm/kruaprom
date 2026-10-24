import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { palette } from "@/components/krua-ui";
import { useKrua } from "@/lib/krua-store";

const steps = [
  { icon: "calendar-outline" as const, title: "วางแผนมื้อในไม่กี่แตะ", detail: "เลือกสูตรแล้วลงตารางรายสัปดาห์ได้ทันที" },
  { icon: "cart-outline" as const, title: "รวมของที่ต้องซื้อให้อัตโนมัติ", detail: "วัตถุดิบที่ซ้ำกันจะถูกรวมเป็นรายการเดียว" },
  { icon: "cloud-offline-outline" as const, title: "เก็บไว้ในเครื่อง พร้อมใช้แม้ออฟไลน์", detail: "รายการและความคืบหน้าของคุณจะอยู่กับคุณเสมอ" },
];

export function Onboarding() {
  const { hasOnboarded, isHydrating, finishOnboarding } = useKrua();

  return (
    <Modal visible={!isHydrating && !hasOnboarded} animationType="slide" presentationStyle="fullScreen" onRequestClose={finishOnboarding}>
      <View style={styles.page} accessibilityViewIsModal>
        <View style={styles.hero}>
          <View style={styles.sparkOne} />
          <View style={styles.sparkTwo} />
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={40} color={palette.paper} />
            <View style={styles.check}><Ionicons name="checkmark" size={12} color={palette.ink} /></View>
          </View>
          <Text style={styles.kicker}>ครัวพร้อม</Text>
          <Text style={styles.headline}>มื้อที่คิดไว้{`\n`}พร้อมเสมอ</Text>
          <Text style={styles.lead}>จัดสูตร วางแผน และซื้อของให้จบในที่เดียว</Text>
        </View>

        <View style={styles.sheet}>
          {steps.map((step) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepIcon}><Ionicons name={step.icon} size={20} color={palette.forest} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={finishOnboarding} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="เริ่มจัดครัวของฉัน" style={styles.startButton}>
            <Text style={styles.startText}>เริ่มจัดครัวของฉัน</Text>
            <Ionicons name="arrow-forward" size={19} color={palette.paper} />
          </TouchableOpacity>
          <Text style={styles.footnote}>คุณเลือกเปิดการแจ้งเตือนได้ภายหลังจากหน้าตั้งค่า</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.cream },
  hero: { minHeight: "43%", paddingTop: 78, paddingHorizontal: 29, backgroundColor: palette.forest, overflow: "hidden" },
  sparkOne: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "#2A9674", right: -55, top: -48 },
  sparkTwo: { position: "absolute", width: 118, height: 118, borderRadius: 59, backgroundColor: "#0F4B3A", left: -42, bottom: -28 },
  logoCircle: { width: 78, height: 78, borderRadius: 28, backgroundColor: palette.jade, justifyContent: "center", alignItems: "center", marginBottom: 18, borderWidth: 1, borderColor: "#65C7A4" },
  check: { position: "absolute", right: -5, bottom: -5, width: 24, height: 24, borderRadius: 12, backgroundColor: palette.mango, justifyContent: "center", alignItems: "center" },
  kicker: { color: "#BCE8D6", fontSize: 13, fontWeight: "800", letterSpacing: 1.2 },
  headline: { color: palette.paper, fontSize: 35, lineHeight: 41, letterSpacing: -1.1, fontWeight: "900", marginTop: 7 },
  lead: { color: "#D6F3E5", fontSize: 15, lineHeight: 22, marginTop: 10 },
  sheet: { flex: 1, marginTop: -22, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: palette.cream, paddingHorizontal: 22, paddingTop: 27, gap: 18 },
  step: { flexDirection: "row", gap: 14, alignItems: "center" },
  stepIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center" },
  stepTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  stepDetail: { color: palette.slate, fontSize: 12, lineHeight: 17 },
  startButton: { minHeight: 55, borderRadius: 18, backgroundColor: palette.forest, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, marginTop: 7 },
  startText: { color: palette.paper, fontSize: 16, fontWeight: "800" },
  footnote: { color: palette.slate, fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 16, marginTop: -7 },
});
