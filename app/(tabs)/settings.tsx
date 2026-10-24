import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Notifications from "expo-notifications";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { AppScreen, Chip, ErrorRecovery, IconButton, LoadingState, OfflineBanner, palette, PrimaryButton, SectionHeading } from "@/components/krua-ui";
import { parseBackupJson } from "@/lib/krua-backup";
import { useKrua } from "@/lib/krua-store";

const GITHUB_REPOSITORY_URL = "https://github.com/watchiravitdon-lgtm/kruaprom-recipes";

export default function SettingsScreen() {
  const { isHydrating, notificationsEnabled, notificationTime, notificationPermission, unitSystem, offlineMode, setOfflineMode, setNotifications, setNotificationTime, setUnitSystem, restartOnboarding, resetData, simulateSaveError, saveError, retrySave, lastSavedAt, exportData, importData } = useKrua();
  const [notificationIssue, setNotificationIssue] = useState<string | null>(null);
  const [backupIssue, setBackupIssue] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  if (isHydrating) return <LoadingState />;

  const scheduleReminder = async (time: string) => {
    const [hourText, minuteText] = time.split(":");
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("meal-reminders", { name: "เตือนจากครัวพร้อม", importance: Notifications.AndroidImportance.DEFAULT });
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "ครัวพร้อม", body: "ดูแผนมื้อถัดไปและเช็กรายการซื้อของกันเถอะ", sound: true },
      trigger: { hour: Number(hourText), minute: Number(minuteText), repeats: true } as never,
    });
  };

  const changeNotifications = async (enabled: boolean) => {
    setNotificationIssue(null);
    if (!enabled) {
      if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifications(false);
      return;
    }
    if (Platform.OS === "web") {
      setNotifications(false, "unsupported");
      setNotificationIssue("Web Preview ยังไม่รองรับการตั้งเตือนแบบ native เปิดแอปใน Expo Go เพื่อใช้งานการแจ้งเตือนจริง");
      return;
    }
    try {
      const existing = await Notifications.getPermissionsAsync();
      const result = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
      if (result.status !== "granted") {
        setNotifications(false, "denied");
        setNotificationIssue("ยังไม่ได้รับสิทธิ์แจ้งเตือน คุณเปิดได้ภายหลังจากการตั้งค่าอุปกรณ์");
        return;
      }
      await scheduleReminder(notificationTime);
      setNotifications(true, "granted");
    } catch {
      setNotifications(false, "denied");
      setNotificationIssue("ตั้งการแจ้งเตือนไม่สำเร็จ ลองใหม่ หรือตรวจการอนุญาตของอุปกรณ์");
    }
  };

  const changeTime = async (time: string) => {
    setNotificationTime(time);
    if (!notificationsEnabled || notificationPermission !== "granted" || Platform.OS === "web") return;
    try {
      await scheduleReminder(time);
    } catch {
      setNotificationIssue("เปลี่ยนเวลาแจ้งเตือนไม่สำเร็จ ลองเปิดการแจ้งเตือนใหม่อีกครั้ง");
    }
  };

  const finishImport = async (raw: string) => {
    const imported = parseBackupJson(raw);
    if (Platform.OS === "web") {
      if (!window.confirm("นำเข้าข้อมูลนี้จะแทนที่สูตร แผน และรายการซื้อของที่อยู่ในเครื่อง ต้องการดำเนินการต่อหรือไม่?")) return;
      await importData(imported);
      return;
    }
    Alert.alert("แทนที่ข้อมูลในเครื่อง?", "สูตร แผน และรายการซื้อของปัจจุบันจะถูกแทนที่ด้วยข้อมูลในไฟล์สำรอง", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "นำเข้าและแทนที่", style: "destructive", onPress: () => { void importData(imported); } },
    ]);
  };

  const exportBackup = async () => {
    setBackupBusy(true);
    setBackupIssue(null);
    try {
      const json = exportData();
      const filename = `kruaprom-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, filename);
        file.create({ overwrite: true });
        file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "สำรองข้อมูลครัวพร้อม" });
      }
    } catch {
      setBackupIssue("ส่งออกข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async () => {
    setBackupBusy(true);
    setBackupIssue(null);
    try {
      if (Platform.OS === "web") {
        const raw = await new Promise<string>((resolve, reject) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.onchange = () => {
            const selected = input.files?.[0];
            if (!selected) { resolve(""); return; }
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("file read failed"));
            reader.readAsText(selected);
          };
          input.oncancel = () => resolve("");
          input.click();
        });
        if (raw) await finishImport(raw);
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      await finishImport(await new File(result.assets[0].uri).text());
    } catch (error) {
      setBackupIssue(error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ ลองตรวจว่าเป็นไฟล์ JSON ของครัวพร้อม");
    } finally {
      setBackupBusy(false);
    }
  };

  const openGitHubRepository = async () => {
    if (Platform.OS === "web") {
      const opened = window.open(GITHUB_REPOSITORY_URL, "_blank", "noopener,noreferrer");
      if (!opened) await Linking.openURL(GITHUB_REPOSITORY_URL);
      return;
    }
    await Linking.openURL(GITHUB_REPOSITORY_URL);
  };

  return (
    <AppScreen>
      <View style={styles.header}><View><Text style={styles.kicker}>ปรับให้เหมาะกับคุณ</Text><Text style={styles.title}>การตั้งค่า</Text></View><IconButton icon="help-circle-outline" label="เริ่มคำแนะนำการใช้งานอีกครั้ง" onPress={restartOnboarding} soft /></View>
      {offlineMode ? <OfflineBanner onReconnect={() => setOfflineMode(false)} /> : null}
      {saveError ? <ErrorRecovery message={saveError} onRetry={() => void retrySave()} /> : null}
      {notificationIssue ? <ErrorRecovery message={notificationIssue} onRetry={() => void changeNotifications(true)} /> : null}
      {backupIssue ? <ErrorRecovery message={backupIssue} onRetry={() => setBackupIssue(null)} /> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SectionHeading title="การแจ้งเตือน" />
        <View style={styles.card}>
          <View style={styles.row}><View style={styles.rowIcon}><Ionicons name="notifications-outline" size={20} color={palette.forest} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>เตือนแผนและรายการซื้อของ</Text><Text style={styles.rowDetail}>{notificationsEnabled ? `ทุกวัน ${notificationTime} น.` : notificationPermission === "denied" ? "สิทธิ์ถูกปฏิเสธ" : notificationPermission === "unsupported" ? "ต้องเปิดจาก Expo Go" : "ปิดอยู่"}</Text></View><Switch value={notificationsEnabled} onValueChange={(value) => void changeNotifications(value)} trackColor={{ false: "#D8E2DC", true: "#9CD5BA" }} thumbColor={notificationsEnabled ? palette.forest : "#F7FBF8"} accessibilityLabel="เปิดหรือปิดการแจ้งเตือน" /></View>
          <View style={styles.divider} /><Text style={styles.smallLabel}>เวลาเตือนที่ต้องการ</Text><View style={styles.chips}>{["07:30", "17:30", "19:00"].map((time) => <Chip key={time} label={`${time} น.`} active={notificationTime === time} onPress={() => void changeTime(time)} />)}</View>
          {notificationPermission === "denied" ? <TouchableOpacity style={styles.openSettings} onPress={() => void Linking.openSettings()} accessibilityRole="button" accessibilityLabel="เปิดการตั้งค่าอุปกรณ์เพื่ออนุญาตการแจ้งเตือน"><Ionicons name="settings-outline" size={17} color={palette.forest} /><Text style={styles.openSettingsText}>เปิดการตั้งค่าอุปกรณ์</Text></TouchableOpacity> : null}
        </View>

        <SectionHeading title="ประสบการณ์การใช้" />
        <View style={styles.card}>
          <View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: palette.peach }]}><Ionicons name="scale-outline" size={20} color={palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>หน่วยวัดหลัก</Text><Text style={styles.rowDetail}>เลือกรูปแบบปริมาณที่อ่านคุ้นเคย</Text></View></View><View style={styles.chips}>{(["เมตริก", "ถ้วย/ช้อน"] as const).map((unit) => <Chip key={unit} label={unit} active={unitSystem === unit} onPress={() => setUnitSystem(unit)} />)}</View>
          <View style={styles.accessRow}><Ionicons name="accessibility-outline" size={20} color={palette.jade} /><Text style={styles.accessText}>ทุกปุ่มมีชื่อสำหรับตัวอ่านหน้าจอ และออกแบบพื้นที่แตะอย่างน้อย 44 pt</Text></View>
        </View>

        <SectionHeading title="ข้อมูลและการเชื่อมต่อ" />
        <View style={styles.card}>
          <View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: palette.mint }]}><Ionicons name="cloud-offline-outline" size={20} color={palette.forest} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>โหมดออฟไลน์</Text><Text style={styles.rowDetail}>{offlineMode ? "ใช้ข้อมูลที่เก็บในเครื่องอยู่" : "แสดงโหมดทำงานด้วยข้อมูลในเครื่อง"}</Text></View><Switch value={offlineMode} onValueChange={setOfflineMode} trackColor={{ false: "#D8E2DC", true: "#E2BD6E" }} thumbColor={offlineMode ? palette.mango : "#F7FBF8"} accessibilityLabel="เปิดหรือปิดโหมดออฟไลน์" /></View>
          <View style={styles.divider} /><View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: palette.soft }]}><Ionicons name="phone-portrait-outline" size={20} color={palette.forest} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>จัดเก็บในอุปกรณ์</Text><Text style={styles.rowDetail}>บันทึกล่าสุด {new Date(lastSavedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</Text></View></View>
          <View style={styles.backupBox}><View style={styles.row}><View style={[styles.rowIcon, { backgroundColor: palette.peach }]}><Ionicons name="download-outline" size={20} color={palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>สำรองข้อมูลสูตร</Text><Text style={styles.rowDetail}>ส่งออกหรือนำเข้าข้อมูลสูตร แผน และรายการซื้อของเป็นไฟล์ JSON</Text></View></View><View style={styles.backupActions}><PrimaryButton label={backupBusy ? "กำลังทำงาน..." : "ส่งออก JSON"} icon="download-outline" onPress={() => void exportBackup()} disabled={backupBusy} compact /><PrimaryButton label="นำเข้า JSON" icon="cloud-upload-outline" tone="outline" onPress={() => void importBackup()} disabled={backupBusy} compact /></View></View>
          <TouchableOpacity style={styles.restart} onPress={restartOnboarding} accessibilityRole="button"><Ionicons name="play-circle-outline" size={20} color={palette.forest} /><Text style={styles.restartText}>เริ่มคำแนะนำการใช้งานอีกครั้ง</Text></TouchableOpacity>
          <TouchableOpacity style={styles.errorDemo} onPress={simulateSaveError} accessibilityRole="button"><Ionicons name="bug-outline" size={20} color={palette.slate} /><Text style={styles.errorDemoText}>ดูตัวอย่างการกู้คืนข้อผิดพลาด</Text></TouchableOpacity>
          <TouchableOpacity style={styles.reset} onPress={() => setResetOpen(true)} accessibilityRole="button"><Ionicons name="refresh-outline" size={20} color={palette.danger} /><Text style={styles.resetText}>กู้คืนข้อมูลตัวอย่าง</Text></TouchableOpacity>
        </View>
        <SectionHeading title="เกี่ยวกับครัวพร้อม" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.githubLink} onPress={() => void openGitHubRepository()} accessibilityRole="link" accessibilityLabel="ดูซอร์สโค้ดบน GitHub" accessibilityHint="เปิด Repository ในแท็บใหม่">
            <View style={styles.githubIcon}><Ionicons name="logo-github" size={22} color={palette.paper} /></View>
            <View style={{ flex: 1 }}><Text style={styles.githubTitle}>ดูซอร์สโค้ดบน GitHub</Text><Text style={styles.githubDetail}>เปิด Repository ของครัวพร้อมในแท็บใหม่</Text></View>
            <Ionicons name="open-outline" size={18} color={palette.forest} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal transparent visible={resetOpen} animationType="fade" onRequestClose={() => setResetOpen(false)}><View style={styles.modalShade}><View style={styles.modal}><View style={styles.modalIcon}><Ionicons name="refresh" size={20} color={palette.forest} /></View><Text style={styles.modalTitle}>กู้คืนข้อมูลตัวอย่าง?</Text><Text style={styles.modalText}>สูตร แผน และรายการปัจจุบันในเครื่องจะถูกแทนที่ คุณจะเริ่มสำรวจแอปได้ใหม่ทันที</Text><View style={styles.modalActions}><PrimaryButton label="ยกเลิก" tone="outline" onPress={() => setResetOpen(false)} /><PrimaryButton label="กู้คืน" onPress={() => { resetData(); setResetOpen(false); }} /></View></View></View></Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 11, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, kicker: { color: palette.jade, fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, title: { color: palette.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 1 }, content: { paddingBottom: 28 },
  card: { marginHorizontal: 20, marginBottom: 5, padding: 15, backgroundColor: palette.paper, borderRadius: 21, borderWidth: 1, borderColor: palette.line }, row: { flexDirection: "row", alignItems: "center", gap: 11 }, rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center" }, rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "800" }, rowDetail: { color: palette.slate, fontSize: 11, lineHeight: 16, marginTop: 3 }, divider: { height: 1, backgroundColor: palette.line, marginVertical: 14 }, smallLabel: { color: palette.slate, fontSize: 11, fontWeight: "800", marginBottom: 9 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, openSettings: { marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: "row", gap: 7, alignItems: "center" }, openSettingsText: { color: palette.forest, fontSize: 13, fontWeight: "800" }, accessRow: { marginTop: 14, padding: 10, borderRadius: 14, backgroundColor: palette.soft, flexDirection: "row", gap: 8, alignItems: "flex-start" }, accessText: { flex: 1, color: palette.slate, fontSize: 11, lineHeight: 16 }, backupBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.line }, backupActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, restart: { paddingTop: 15, flexDirection: "row", alignItems: "center", gap: 8 }, restartText: { color: palette.forest, fontSize: 13, fontWeight: "800" }, errorDemo: { paddingTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }, errorDemoText: { color: palette.slate, fontSize: 13, fontWeight: "700" }, reset: { paddingTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }, resetText: { color: palette.danger, fontSize: 13, fontWeight: "800" }, githubLink: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 }, githubIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" }, githubTitle: { color: palette.ink, fontSize: 14, fontWeight: "800" }, githubDetail: { color: palette.slate, fontSize: 11, lineHeight: 16, marginTop: 3 },
  modalShade: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(14,45,37,0.48)" }, modal: { borderRadius: 26, backgroundColor: palette.cream, padding: 23, alignItems: "center" }, modalIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center", marginBottom: 13 }, modalTitle: { color: palette.ink, fontSize: 20, fontWeight: "900" }, modalText: { color: palette.slate, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 }, modalActions: { width: "100%", flexDirection: "row", gap: 8, marginTop: 19 },
});
