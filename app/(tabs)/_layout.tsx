import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { palette } from "@/components/krua-ui";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: palette.forest,
        tabBarInactiveTintColor: "#81918B",
        tabBarStyle: { height: 60 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: palette.paper, borderTopColor: palette.line, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "วันนี้", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="recipes" options={{ title: "สูตร", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "book" : "book-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="plan" options={{ title: "แผน", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="shopping" options={{ title: "ซื้อของ", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "cart" : "cart-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="settings" options={{ title: "ตั้งค่า", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "options" : "options-outline"} color={color} size={22} /> }} />
    </Tabs>
  );
}
