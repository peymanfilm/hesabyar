/**
 * بازیابی تنظیمات ذخیره‌شده در دیتابیس به store رابط.
 * در سطح ماژول اجرا می‌شود (بدون setState درون effect) تا از رندر آبشاری جلوگیری شود.
 */
import { getAppDb } from "@/db/client";
import { getSetting } from "@/lib/repo";
import { useUiStore } from "@/store/ui-store";

export function hydrateUiSettings(): void {
  try {
    const db = getAppDb().db;
    const theme = getSetting(db, "themeMode");
    if (theme === "light" || theme === "dark" || theme === "system") {
      useUiStore.setState({ themeMode: theme });
    }
    const unit = getSetting(db, "unit");
    if (unit === "toman" || unit === "rial") {
      useUiStore.setState({ unit });
    }
    useUiStore.setState({
      reduceMotion: getSetting(db, "reduceMotion") === "1",
    });
  } catch {
    // دیتابیس هنوز آماده نیست — مقادیر پیش‌فرض می‌مانند
  }
}
