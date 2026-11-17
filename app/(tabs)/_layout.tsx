/**
 * ناوبری پایین — راست به چپ: خانه | اقساط | حساب‌ها | گزارش‌ها | تنظیمات
 */
import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { Home, CalendarDays, Wallet, BarChart3, Settings } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useUiStore } from "@/store/ui-store";
import { getAppDb } from "@/db/client";
import { setSetting } from "@/lib/repo";

export default function TabsLayout() {
  const { colors } = useTheme();
  const themeMode = useUiStore((s) => s.themeMode);
  const unit = useUiStore((s) => s.unit);

  // ماندگاری انتخاب تم/واحد
  useEffect(() => {
    const db = getAppDb();
    setSetting(db.db, "themeMode", themeMode);
    setSetting(db.db, "unit", unit);
  }, [themeMode, unit]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarPosition: "bottom",
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.divider },
        tabBarLabelStyle: { fontFamily: "Vazirmatn-Medium", fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "خانه", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="installments"
        options={{ title: "اقساط", tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: "حساب‌ها", tabBarIcon: ({ color }) => <Wallet size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: "گزارش‌ها", tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "تنظیمات", tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }}
      />
    </Tabs>
  );
}
