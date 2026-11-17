/**
 * تب تنظیمات — تم، واحد پولی، اعلان‌ها، قفل بیومتریک، پشتیبان‌گیری، حذف کامل.
 */
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Bell, DatabaseBackup, Fingerprint, Moon, Sun, MonitorSmartphone, Coins, Trash2 } from "lucide-react-native";
import { Screen, AppText, ListRow, ConfirmDialog } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { useUiStore, type ThemeMode, type DisplayUnit } from "@/store/ui-store";
import { getAppDb } from "@/db/client";
import { getSetting, setSetting } from "@/lib/repo";
import { radius } from "@/theme";

export default function SettingsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const unit = useUiStore((s) => s.unit);
  const setUnit = useUiStore((s) => s.setUnit);
  const [biometric, setBiometric] = useState<boolean>(getSetting(getAppDb().db, "biometricEnabled") === "1");
  const [wipeVisible, setWipeVisible] = useState(false);

  const saveTheme = (m: ThemeMode) => {
    setThemeMode(m);
    setSetting(getAppDb().db, "themeMode", m);
  };
  const saveUnit = (u: DisplayUnit) => {
    setUnit(u);
    setSetting(getAppDb().db, "unit", u);
    // تغییر واحد فقط نمایش را عوض می‌کند؛ مقادیر ریال ذخیره‌شده بدون تغییر می‌مانند
  };

  const toggleBiometric = useCallback(async () => {
    const db = getAppDb();
    if (biometric) {
      setBiometric(false);
      setSetting(db.db, "biometricEnabled", "0");
      return;
    }
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) {
      Alert.alert("قفل بیومتریک", "قفل بیومتریک روی این گوشی در دسترس یا فعال نیست. قفل فقط ورود اپ را کنترل می‌کند و رمزنگاری دیتابیس نیست.");
      return;
    }
    setBiometric(true);
    setSetting(db.db, "biometricEnabled", "1");
  }, [biometric]);

  const wipeAll = useCallback(() => {
    const { db, sqlite } = getAppDb();
    sqlite.execSync("BEGIN;");
    for (const table of ["allocations", "attachments", "reminders", "snoozed_reminders", "transactions", "installments", "account_installments", "loans", "accounts", "persons", "settings"]) {
      sqlite.execSync(`DELETE FROM ${table};`);
    }
    sqlite.execSync("COMMIT;");
    void db;
    setWipeVisible(false);
    Alert.alert("حذف کامل انجام شد", "تمام اطلاعات از این دستگاه پاک شد. اگر پشتیبان دارید، از صفحهٔ پشتیبان‌گیری بازیابی کنید.");
  }, []);

  return (
    <Screen title="تنظیمات" scroll>
      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        ظاهر
      </AppText>
      <View style={s.rowGroup}>
        <ListRow title="روشن" onPress={() => saveTheme("light")} right={<Sun size={18} color={themeMode === "light" ? colors.primary : colors.textSecondary} />} />
        <ListRow title="تاریک" onPress={() => saveTheme("dark")} right={<Moon size={18} color={themeMode === "dark" ? colors.primary : colors.textSecondary} />} />
        <ListRow title="هماهنگ با سیستم" onPress={() => saveTheme("system")} right={<MonitorSmartphone size={18} color={themeMode === "system" ? colors.primary : colors.textSecondary} />} />
      </View>

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        واحد نمایشی
      </AppText>
      <View style={s.rowGroup}>
        <ListRow title="تومان (پیش‌فرض)" sub="مبالغ ریالی غیربخش‌پذیر با یک رقم اعشار نمایش داده می‌شوند" onPress={() => saveUnit("toman")} right={<Coins size={18} color={unit === "toman" ? colors.primary : colors.textSecondary} />} />
        <ListRow title="ریال" onPress={() => saveUnit("rial")} right={<Coins size={18} color={unit === "rial" ? colors.primary : colors.textSecondary} />} />
      </View>

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        امنیت و یادآوری
      </AppText>
      <View style={s.rowGroup}>
        <ListRow
          title="یادآوری‌ها"
          sub="سررسیدها، روزهای قبل، تعویق و لغو پس از تسویه"
          right={<Bell size={18} color={colors.textSecondary} />}
          onPress={() => router.push("/reminders")}
        />
        <ListRow
          title="قفل بیومتریک"
          sub={biometric ? "فعال — فقط ورود اپ، نه رمزنگاری داده" : "غیرفعال"}
          right={<Fingerprint size={18} color={biometric ? colors.primary : colors.textSecondary} />}
          onPress={() => void toggleBiometric()}
        />
      </View>

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        داده‌ها
      </AppText>
      <View style={s.rowGroup}>
        <ListRow
          title="پشتیبان‌گیری و بازیابی"
          sub="فایل نسخه‌بندی‌شده شامل داده و رسیدها"
          right={<DatabaseBackup size={18} color={colors.textSecondary} />}
          onPress={() => router.push("/backup")}
        />
        <ListRow
          title="حذف کامل اطلاعات"
          sub="پاک‌سازی همهٔ داده‌ها از این دستگاه"
          right={<Trash2 size={18} color={colors.danger} />}
          onPress={() => setWipeVisible(true)}
        />
      </View>

      <AppText size="xs" color={colors.textSecondary} style={{ lineHeight: 18 }}>
        همهٔ اطلاعات فقط روی همین گوشی ذخیره می‌شود و به اینترنت وابسته نیست.
      </AppText>

      <ConfirmDialog
        visible={wipeVisible}
        title="حذف کامل اطلاعات"
        message="همهٔ اشخاص، وام‌ها، حساب‌ها، تراکنش‌ها و رسیدها برای همیشه پاک می‌شوند. قبل از ادامه، پشتیبان بگیرید. مطمئنید؟"
        confirmLabel="حذف کامل"
        danger
        onConfirm={wipeAll}
        onCancel={() => setWipeVisible(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  rowGroup: { borderRadius: radius.lg, overflow: "hidden", gap: 1 },
});
