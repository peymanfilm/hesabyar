/**
 * یادآوری‌ها — تنظیم سررسیدها، همگام‌سازی اعلان‌ها، تعویق و لغو پس از تسویه.
 */
import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { RefreshCcw } from "lucide-react-native";
import { Screen, AppText, ListRow, MoneyText } from "@/components";
import { getAppDb } from "@/db/client";
import { loans, installments as installmentsTable, accounts as accountsTable } from "@/db/schema";
import { loanInstallmentsWithState, getAccountState , setSetting, getSetting } from "@/lib/repo";
import { todayISO, formatJalali, daysBetween, } from "@/lib/dates";
import { buildReminderPlans, overdueReminderPlan, type ReminderSource } from "@/lib/notifications";
import { requestNotificationPermission, ensureNotificationChannel, syncScheduledNotifications } from "@/lib/notifications-app";
import { useTheme } from "@/hooks/useTheme";

export default function RemindersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const info = useMemo(() => {
    const db = getAppDb().db;
    const today = todayISO();
    const sources: ReminderSource[] = [];
    const upcoming: { title: string; due: string; balance: number }[] = [];

    for (const l of db.select().from(loans).all()) {
      if (!l.reminderEnabled) continue;
      const st = loanInstallmentsWithState(db, l.id, today);
      for (const r of st.rows) {
        if (r.balance <= 0) continue; // لغو پس از تسویه
        const days = daysBetween(today, r.dueDate);
        if (days > 60) continue;
        for (const d of [0, 1, 3, 7]) {
          sources.push({
            targetType: "loan_installment",
            targetId: r.id,
            dueDate: r.dueDate,
            daysBefore: d,
            time: getSetting(db, "reminderTime") ?? "09:00",
            enabled: true,
            title: `${l.title} — قسط ${r.seq}`,
            amountText: `${r.balance} ریال`,
          });
        }
        if (days >= 0 && days <= 30) upcoming.push({ title: `${l.title} — قسط ${r.seq}`, due: r.dueDate, balance: r.balance });
      }
    }
    for (const a of db.select().from(accountsTable).all()) {
      if (!a.reminderEnabled || !a.dueDate) continue;
      const st = getAccountState(db, a.id, today);
      if (st.balance <= 0) continue;
      const days = daysBetween(today, a.dueDate);
      if (days > 60) continue;
      for (const d of [0, 1, 3, 7]) {
        sources.push({
          targetType: "account",
          targetId: a.id,
          dueDate: a.dueDate,
          daysBefore: d,
          time: getSetting(db, "reminderTime") ?? "09:00",
          enabled: true,
          title: a.title,
          amountText: `${st.balance} ریال`,
        });
      }
      if (days >= 0 && days <= 30) upcoming.push({ title: a.title, due: a.dueDate, balance: st.balance });
    }

    return { enabled: (getSetting(db, "remindersEnabled") ?? "1") === "1", count: sources.length, upcoming };
  }, []);

  const sync = useCallback(async () => {
    const db = getAppDb().db;
    const ok = await requestNotificationPermission();
    if (!ok) {
      Alert.alert("مجوز اعلان", "برای یادآوری‌ها، مجوز اعلان در تنظیمات گوشی لازم است. محدودیت آلارم دقیق و بهینه‌ساز باتری نیز ممکن است زمان‌بندی را جابه‌جا کند.");
      return;
    }
    await ensureNotificationChannel();
    const today = todayISO();
    const now = Date.now();
    // بازسازی پلن از دیتابیس جاری
    const sources: ReminderSource[] = [];
    for (const l of db.select().from(loans).all()) {
      if (!l.reminderEnabled) continue;
      for (const r of db.select().from(installmentsTable).all().filter((i) => i.loanId === l.id)) {
        const st = loanInstallmentsWithState(db, l.id, today);
        const row = st.rows.find((x) => x.id === r.id);
        if (!row || row.balance <= 0) continue;
        for (const d of [0, 1, 3, 7]) {
          sources.push({
            targetType: "loan_installment",
            targetId: r.id,
            dueDate: r.dueDate,
            daysBefore: d,
            time: getSetting(db, "reminderTime") ?? "09:00",
            enabled: true,
            title: `${l.title} — قسط ${r.seq}`,
            amountText: `${row.balance} ریال`,
          });
        }
      }
    }
    for (const a of db.select().from(accountsTable).all()) {
      if (!a.reminderEnabled || !a.dueDate) continue;
      const st = getAccountState(db, a.id, today);
      if (st.balance <= 0) continue;
      for (const d of [0, 1, 3, 7]) {
        sources.push({ targetType: "account", targetId: a.id, dueDate: a.dueDate, daysBefore: d, time: getSetting(db, "reminderTime") ?? "09:00", enabled: true, title: a.title, amountText: `${st.balance} ریال` });
      }
    }
    const plans = buildReminderPlans(sources, now, today);
    // یادآوری عقب‌افتادگی روزانه
    const overdueTitles: string[] = [];
    for (const l of db.select().from(loans).all()) {
      const st = loanInstallmentsWithState(db, l.id, today);
      st.rows.forEach((r) => {
        if (r.overdue) overdueTitles.push(`${l.title} — قسط ${r.seq}`);
      });
    }
    const od = overdueReminderPlan(overdueTitles, today);
    const all = od ? [...plans, od] : plans;
    const count = await syncScheduledNotifications(all);
    setSetting(db, "remindersEnabled", "1");
    setSetting(db, "lastReminderSync", String(now));
    setSyncCount(count);
    Alert.alert("یادآوری‌ها", `${count} یادآوری زمان‌بندی شد. سقف سیستم‌عامل رعایت و موارد تسویه‌شده لغو شدند.`);
  }, []);

  return (
    <Screen title="یادآوری‌ها" subtitle="سررسید روز خود، ۱، ۳ و ۷ روز قبل" onBack={() => router.back()} scroll>
      <ListRow
        title="همگام‌سازی اعلان‌ها"
        sub="زمان‌بندی از دیتابیس بازسازی و تکراری‌ها لغو می‌شود"
        right={<RefreshCcw size={18} color={colors.primary} />}
        onPress={() => void sync()}
        badge={null}
      />
      {info ? (
        <AppText size="xs" color={colors.textSecondary}>
          {`${info.count} یادآوری بالقوه${syncCount != null ? ` • آخرین همگام‌سازی: ${syncCount} اعلان` : ""} • اعلان‌ها با شناسهٔ قطعی و بدون تکرار زمان‌بندی می‌شوند`}
        </AppText>
      ) : null}
      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        سررسیدهای ۳۰ روز آینده
      </AppText>
      {info && info.upcoming.length > 0
        ? info.upcoming.map((u, i) => (
            <ListRow key={i} title={u.title} sub={`سررسید ${formatJalali(u.due)}`} right={<MoneyText rial={u.balance} size="md" />} />
          ))
        : (
          <AppText size="sm" color={colors.textSecondary}>
            سررسیدی در ۳۰ روز آینده نیست
          </AppText>
        )}
      <AppText size="xs" color={colors.textSecondary} style={{ lineHeight: 18 }}>
        محدودیت‌ها: اگر اپ force-stop شود یا بهینه‌ساز باتری یادآوری‌ها را محدود کند، اعلان دقیق ممکن است با تأخیر نمایش داده شود. زمان‌بندی با اعلان واقعی سیستم انجام می‌شود، نه تایمر درون اپ.
      </AppText>
    </Screen>
  );
}

