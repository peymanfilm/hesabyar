/**
 * لایهٔ ریشهٔ اپ — فونت وزیرمتن، RTL، دیتابیس، BottomSheet، اعلان و قفل اختیاری.
 */
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter, } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import { LockKeyhole } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { getAppDb } from "@/db/client";
import { AppText , PrimaryButton } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { getSetting } from "@/lib/repo";
import { hydrateUiSettings } from "@/store/hydrate";
import { ensureNotificationChannel } from "@/lib/notifications-app";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function BiometricGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const db = getAppDb();
      const v = getSetting(db.db, "biometricEnabled");
      setEnabled(v === "1");
    })().catch(() => setEnabled(false));
  }, []);

  const tryUnlock = useCallback(async () => {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) {
      setLocked(false);
      return;
    }
    const ok = await LocalAuthentication.authenticateAsync({
      promptMessage: "ورود به حساب‌یار",
      cancelLabel: "انصراف",
    });
    if (ok.success) setLocked(false);
    else setAuthFailed(true);
  }, []);

  useEffect(() => {
    if (enabled && locked) {
      const t = setTimeout(() => void tryUnlock(), 50);
      return () => clearTimeout(t);
    }
    if (!enabled && locked) {
      const t = setTimeout(() => setLocked(false), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [enabled, locked, tryUnlock]);

  if (!enabled || !locked) return children;

  return (
    <View style={gateStyles.wrap}>
      <View style={gateStyles.card}>
        <LockKeyhole size={40} color="#087F6D" />
        <AppText size="lg" weight="semiBold" align="center">
          حساب‌یار قفل است
        </AppText>
        <AppText size="sm" color="#718080" align="center">
          برای ورود، احراز هویت بیومتریک را انجام دهید
        </AppText>
        {authFailed ? (
          <AppText size="xs" color="#D45B65" align="center">
            احراز هویت ناموفق بود
          </AppText>
        ) : null}
        <PrimaryButton label="باز کردن قفل" onPress={() => void tryUnlock()} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "Vazirmatn-Regular": require("@assets/fonts/Vazirmatn-Regular.ttf"),
    "Vazirmatn-Medium": require("@assets/fonts/Vazirmatn-Medium.ttf"),
    "Vazirmatn-SemiBold": require("@assets/fonts/Vazirmatn-SemiBold.ttf"),
    "Vazirmatn-Bold": require("@assets/fonts/Vazirmatn-Bold.ttf"),
  });

  useEffect(() => {
    // دیتابیس + migration در اولین اجرا؛ بازیابی تنظیمات از دیتابیس
    getAppDb();
    hydrateUiSettings();
    void ensureNotificationChannel();
    const t = setTimeout(() => void SplashScreen.hideAsync().catch(() => undefined), 0);
    return () => clearTimeout(t);
  }, []);

  // لمس اعلان → باز شدن صفحهٔ مرتبط
  useEffect(() => {
    const sub = NotificationsAddListener((url: string) => {
      if (typeof url === "string" && url.startsWith("/")) {
        router.push(url as never);
      }
    });
    return sub;
  }, [router]);

  const { colors, isDark } = useTheme();
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <BiometricGate>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: "default",
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="quick" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="loans/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="accounts/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="transactions/new" options={{ presentation: "modal" }} />
            </Stack>
          </BiometricGate>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** ثبت گوش‌دهندهٔ deep-link اعلان (expo-notifications response) */
function NotificationsAddListener(cb: (url: string) => void): () => void {
  const handler = (resp: { actionIdentifier: string; notification?: { request?: { content?: { data?: { url?: string } } } } }) => {
    if (resp.actionIdentifier === "dismiss-action") return;
    const data = resp.notification?.request?.content?.data ?? {};
    if (data.url) cb(data.url);
  };
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const gateStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#F6F8FA", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
});
