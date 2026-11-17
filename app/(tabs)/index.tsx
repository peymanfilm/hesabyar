/**
 * خانه — داشبورد واقعی از دیتابیس: تعهدات ماه، مانده‌ها، پرداخت/دریافت ماه،
 * نزدیک‌ترین سررسیدها، عقب‌افتاده‌ها، نمودار ساده و ثبت سریع.
 */
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View , } from "react-native";
import { Plus, } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, AppText, FinancialCard, EmptyState, ListRow, StatusBadge, MoneyText, PrimaryButton } from "@/components";
import { spacing, radius, } from "@/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUiStore } from "@/store/ui-store";
import { getAppDb } from "@/db/client";
import { loanInstallmentsWithState, monthlyReport, getAccountState } from "@/lib/repo";
import { todayISO, startOfJalaliMonth, endOfJalaliMonth, formatJalali, gregorianToJalali, daysBetween } from "@/lib/dates";
import { loans as loansTable, accounts as accountsTable } from "@/db/schema";
import { formatMoney } from "@/lib/format";

export default function HomeScreen() {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const [data, setData] = useState<{
    today: string;
    loans: { id: number; title: string; balance: number; progress: number; nextDue: string | null; overdueCount: number }[];
    myDebt: number;
    myCredit: number;
    monthReceive: number;
    monthPay: number;
    upcoming: { title: string; due: string; balance: number; type: "loan" | "account" | "account_installment"; id: number }[];
    overdue: { title: string; due: string; balance: number }[];
  } | null>(null);

  const load = useCallback(() => {
    const db = getAppDb().db;
    const today = todayISO();
    const { jy, jm } = gregorianToJalali(today);
    const from = startOfJalaliMonth(jy, jm);
    const to = endOfJalaliMonth(jy, jm);

    // وام‌ها
    const loans = db.select().from(loansTable).all();
    const loanSummaries = loans.map((l) => {
      const st = loanInstallmentsWithState(db, l.id, today);
      const next = st.rows.find((r) => r.balance > 0 && r.dueDate >= today);
      return {
        id: l.id,
        title: l.title,
        balance: st.balance,
        progress: st.progress,
        nextDue: next?.dueDate ?? null,
        overdueCount: st.rows.filter((r) => r.overdue).length,
      };
    });

    // حساب‌های طلب/بدهی
    const accounts = db.select().from(accountsTable).all();
    let myDebt = 0;
    let myCredit = 0;
    const upcoming: { title: string; due: string; balance: number; type: "loan" | "account" | "account_installment"; id: number }[] = [];
    const overdue: { title: string; due: string; balance: number }[] = [];
    for (const acc of accounts) {
      const st = getAccountState(db, acc.id, today);
      if (acc.kind === "debt") myDebt += st.balance;
      else myCredit += st.balance;
      if (st.balance > 0 && acc.dueDate) {
        const item = { title: acc.title, due: acc.dueDate, balance: st.balance, type: "account" as const, id: acc.id };
        if (daysBetween(today, acc.dueDate) >= 0 && daysBetween(today, acc.dueDate) <= 30) upcoming.push(item);
        if (st.overdue) overdue.push({ title: acc.title, due: acc.dueDate, balance: st.balance });
      }
    }
    for (const l of loanSummaries) {
      const st = loanInstallmentsWithState(db, l.id, today);
      for (const r of st.rows) {
        if (r.balance > 0 && r.dueDate >= today && daysBetween(today, r.dueDate) <= 30)
          upcoming.push({ title: `${l.title} — قسط`, due: r.dueDate, balance: r.balance, type: "loan", id: r.id });
        if (r.overdue) overdue.push({ title: `${l.title} — قسط ${r.seq}`, due: r.dueDate, balance: r.balance });
      }
    }
    upcoming.sort((a, b) => (a.due < b.due ? -1 : 1));

    // پرداخت/دریافت ماه جاری (هر تراکنش یک بار)
    const rep = monthlyReport(db, from, to);

    setData({
      today,
      loans: loanSummaries,
      myDebt,
      myCredit,
      monthReceive: rep.receive,
      monthPay: rep.pay,
      upcoming: upcoming.slice(0, 5),
      overdue,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const monthFa = useMemo(() => {
    if (!data) return "";
    const { jy, jm } = gregorianToJalali(data.today);
    const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    return `${MONTHS[jm - 1]} ${jy}`;
  }, [data]);



  if (!data) return <Screen title="حساب‌یار" />;

  const monthNet = data.monthReceive - data.monthPay;
  const chartMax = Math.max(data.monthReceive, data.monthPay, 1);

  return (
    <Screen
      title="حساب‌یار"
      subtitle={`${formatJalali(data.today)} • ${monthFa}`}
      scroll
      style={{ paddingBottom: 0 }}
      // اعلان‌ها
       
    >
      <View style={s.heroWrap}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={[0, 0]} end={[1, 1]} style={s.hero}>
          <AppText size="sm" color={colors.onPrimary} style={{ opacity: 0.9 }}>
            ماندهٔ کل اقساط وام‌ها
          </AppText>
          <AppText size="display" weight="bold" color={colors.onPrimary}>
            {formatMoney(
              data.loans.reduce((a, l) => a + l.balance, 0),
              unit
            )}
            {" "}
            <AppText size="sm" color={colors.onPrimary} style={{ opacity: 0.8 }}>
              {unit === "toman" ? "تومان" : "ریال"}
            </AppText>
          </AppText>
          <View style={s.heroRow}>
            <View style={s.heroChip}>
              <AppText size="xs" color={colors.onPrimary} style={{ opacity: 0.9 }}>
                بدهی من
              </AppText>
              <AppText size="md" weight="bold" color={colors.onPrimary}>
                {formatMoney(data.myDebt, unit)}
              </AppText>
            </View>
            <View style={s.heroChip}>
              <AppText size="xs" color={colors.onPrimary} style={{ opacity: 0.9 }}>
                طلب من
              </AppText>
              <AppText size="md" weight="bold" color={colors.onPrimary}>
                {formatMoney(data.myCredit, unit)}
              </AppText>
            </View>
          </View>
        </LinearGradient>
      </View>

      <PrimaryButton label="ثبت جدید" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => router.push("/quick")} />

      <FinancialCard title={`دریافت ${monthFa}`} amount={data.monthReceive} tone="positive" />
      <FinancialCard title={`پرداخت ${monthFa}`} amount={data.monthPay} tone="negative" />

      {/* نمودار سادهٔ ستونی پرداخت/دریافت ماه */}
      <View style={[s.chartCard, { backgroundColor: colors.card }]}>
        <AppText size="sm" weight="medium" color={colors.textSecondary}>
          نمودار ماه
        </AppText>
        <View style={s.chartBars}>
          <View style={s.barGroup}>
            <View style={[s.bar, { height: Math.max(8, (data.monthReceive / chartMax) * 90), backgroundColor: colors.primary }]} />
            <AppText size="xs" color={colors.textSecondary}>
              دریافت
            </AppText>
          </View>
          <View style={s.barGroup}>
            <View style={[s.bar, { height: Math.max(8, (data.monthPay / chartMax) * 90), backgroundColor: colors.danger }]} />
            <AppText size="xs" color={colors.textSecondary}>
              پرداخت
            </AppText>
          </View>
        </View>
        <AppText size="xs" color={colors.textSecondary} align="center">
          {`خالص ماه: ${formatMoney(monthNet, unit)} ${unit === "toman" ? "تومان" : "ریال"}`}
        </AppText>
      </View>

      {/* عقب‌افتاده‌ها */}
      {data.overdue.length > 0 ? (
        <View style={[s.sectionCard, { backgroundColor: colors.card }]}>
          <AppText size="md" weight="semiBold" color={colors.danger}>
            عقب‌افتاده‌ها ({data.overdue.length})
          </AppText>
          {data.overdue.slice(0, 4).map((o, i) => (
            <ListRow key={i} title={o.title} sub={`سررسید ${formatJalali(o.due)}`} right={<MoneyText rial={o.balance} tone="negative" size="md" />} />
          ))}
        </View>
      ) : null}

      {/* نزدیک‌ترین سررسیدها */}
      <View style={[s.sectionCard, { backgroundColor: colors.card }]}>
        <AppText size="md" weight="semiBold">
          نزدیک‌ترین سررسیدها
        </AppText>
        {data.upcoming.length === 0 ? (
          <AppText size="sm" color={colors.textSecondary}>
            سررسیدی در ۳۰ روز آینده نیست
          </AppText>
        ) : (
          data.upcoming.map((u, i) => (
            <ListRow
              key={i}
              title={u.title}
              sub={`سررسید ${formatJalali(u.due)}`}
              right={<MoneyText rial={u.balance} size="md" />}
            />
          ))
        )}
      </View>

      {/* وام‌ها */}
      {data.loans.map((l) => (
        <View key={l.id} style={[s.loanCard, { backgroundColor: colors.card }]}>
          <View style={s.loanHead}>
            <AppText size="md" weight="semiBold" style={{ flex: 1 }}>
              {l.title}
            </AppText>
            {l.overdueCount > 0 ? <StatusBadge status="overdue" /> : null}
          </View>
          <MoneyText rial={l.balance} size="md" />
          <View style={[s.progressBg, { backgroundColor: colors.skeleton }]}>
            <View style={[s.progressFg, { backgroundColor: colors.primary, width: `${l.progress}%` }]} />
          </View>
          <AppText size="xs" color={colors.textSecondary}>
            {`${l.progress}% تسویه شده${l.nextDue ? ` • سررسید بعدی ${formatJalali(l.nextDue)}` : ""}`}
          </AppText>
        </View>
      ))}

      {data.loans.length === 0 && data.myCredit === 0 && data.myDebt === 0 ? (
        <EmptyState
          title="خوش آمدید"
          description="برای شروع، از «ثبت جدید» یک طلب، بدهی یا وام اضافه کنید. همهٔ اطلاعات فقط روی همین گوشی ذخیره می‌شود."
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  heroWrap: { borderRadius: radius.xl, overflow: "hidden" },
  hero: { padding: spacing.lg, borderRadius: radius.xl, gap: spacing.xs },
  heroRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.sm },
  heroChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  chartCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  chartBars: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "center", gap: spacing.xxl, height: 110 },
  barGroup: { alignItems: "center", gap: spacing.xs },
  bar: { width: 56, borderRadius: radius.sm },
  sectionCard: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  loanCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  loanHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  progressBg: { height: 6, borderRadius: radius.full, overflow: "hidden" },
  progressFg: { height: 6, borderRadius: radius.full },
});
