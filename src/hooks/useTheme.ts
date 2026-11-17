/**
 * hook تم — پالت فعال بر اساس حالت سیستم و انتخاب کاربر.
 * Reduce Motion از useReducedMotion در صفحه‌های انیمیشن‌دار خوانده می‌شود.
 */
import { useColorScheme } from "react-native";
import { resolveTheme, useUiStore } from "@/store/ui-store";
import type { ThemeColors } from "@/theme";

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme();
  const mode = useUiStore((s) => s.themeMode);
  const isDark = mode === "system" ? scheme === "dark" : mode === "dark";
  return { colors: resolveTheme(mode, scheme === "dark"), isDark };
}
