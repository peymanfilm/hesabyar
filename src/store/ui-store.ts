/**
 * وضعیت موقت رابط — فقط برای تم، واحد پولی و حالت‌های گذرا.
 * دادهٔ مالی هرگز در Zustand نگه‌داری نمی‌شود (منبع حقیقت: SQLite).
 */
import { create } from "zustand";
import { palette } from "@/theme";

export type ThemeColors = { [K in keyof typeof palette.light]: string };
export type ThemeMode = "system" | "light" | "dark";
export type DisplayUnit = "toman" | "rial";

interface UiState {
  themeMode: ThemeMode;
  unit: DisplayUnit;
  reduceMotion: boolean;
  setThemeMode: (m: ThemeMode) => void;
  setUnit: (u: DisplayUnit) => void;
  setReduceMotion: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themeMode: "system",
  unit: "toman",
  reduceMotion: false,
  setThemeMode: (themeMode) => set({ themeMode }),
  setUnit: (unit) => set({ unit }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
}));

export function resolveTheme(mode: ThemeMode, systemIsDark: boolean): ThemeColors {
  const isDark = mode === "system" ? systemIsDark : mode === "dark";
  return isDark ? palette.dark : palette.light;
}

export function isDarkMode(mode: ThemeMode, systemIsDark: boolean): boolean {
  return mode === "system" ? systemIsDark : mode === "dark";
}
