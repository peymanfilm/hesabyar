/**
 * تب گزارش‌ها — ماهانه/سالانه شمسی، پرداخت/دریافت، تفکیک و خروجی CSV.
 */
import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { FileDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Screen, AppText, FinancialCard, ListRow, PrimaryButton, EmptyState } from "@/components";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "@/hooks/useTheme";
import { getAppDb } from "@/db/client";
import { monthlyReport } from "@/lib/repo";
import { buildCsv } from "@/lib/csv";
import {
  todayISO,
  gregorianToJalali,
  startOfJalaliMonth,
  endOfJalaliMonth,
  nextJalaliMonth,
  prevJalaliMonth,
  jalaliToISO,
  jalaliMonthLength,
  JALALI_MONTHS,
} from "@/lib/dates";
import { digitsToPersian, } from "@/lib/persian";
import { formatMoney } from "@/lib/format";
import { useUiStore } from "@/store/ui-store";
import { spacing, } from "@/theme";

export default function ReportsTab() {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const today = todayISO();
  const initial = gregorianToJalali(today);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const summary = useMemo(() => {
    const db = getAppDb().db;
    const from = mode === "month" ? startOfJalaliMonth(jy, jm) : jalaliYearStart(jy);
    const to = mode === "month" ? endOfJalaliMonth(jy, jm) : jalaliYearEnd(jy);
    return monthlyReport(db, from, to);
  }, [jy, jm, mode]);

  const byPerson = useMemo(() => {
    if (!summary) return [];
    const map = new Map<string, { receive: number; pay: number }>();
    for (const r of summary.rows) {
      const key = r.personName ?? r.bank ?? "سایر";
      const cur = map.get(key) ?? { receive: 0, pay: 0 };
      if (r.kind === "receive") cur.receive += r.amount;
      else cur.pay += r.amount;
      map.set(key, cur);
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v }));
  }, [summary]);

  const exportCsv = useCallback(async () => {
    if (!summary) return;
    const csv = buildCsv(
      [
        { header: "شرح", value: (r) => String(r.name) },
        { header: "دریافت (ریال)", value: (r) => String(r.receive) },
        { header: "پرداخت (ریال)", value: (r) => String(r.pay) },
      ],
      byPerson.map((p) => ({ name: p.name, receive: p.receive, pay: p.pay }))
    );
    const fileUri = `${FileSystem.cacheDirectory}hesabyar-report-${jy}-${jm}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "گزارش حساب‌یار (CSV)" });
  }, [summary, byPerson, jy, jm]);

  const periodLabel = mode === "month" ? `${JALALI_MONTHS[jm - 1]} ${digitsToPersian(String(jy))}` : `سال ${digitsToPersian(String(jy))}`;

  const nav = (dir: 1 | -1) => {
    if (mode === "month") {
      const n = dir === 1 ? nextJalaliMonth(jy, jm) : prevJalaliMonth(jy, jm);
      setJy(n.jy);
      setJm(n.jm);
    } else {
      setJy(Math.max(1300, jy + dir));
    }
  };

  return (
    <Screen title="گزارش‌ها" subtitle={periodLabel} scroll>
      <View style={s.modeRow}>
        <PrimaryButton label="ماهانه" variant={mode === "month" ? "primary" : "soft"} onPress={() => setMode("month")} style={{ flex: 1 }} />
        <PrimaryButton label="سالانه" variant={mode === "year" ? "primary" : "soft"} onPress={() => setMode("year")} style={{ flex: 1 }} />
      </View>
      <View style={s.navRow}>
        <ListRow
          title={periodLabel}
          onPress={() => nav(-1)}
          right={null}
          badge={null}
        />
      </View>
      <View style={s.navRow2}>
        <PrimaryButton label="دوره قبل" variant="soft" icon={<ChevronRight size={16} color={colors.primaryDark} />} onPress={() => nav(-1)} style={{ flex: 1 }} />
        <PrimaryButton label="دوره بعد" variant="soft" icon={<ChevronLeft size={16} color={colors.primaryDark} />} onPress={() => nav(1)} style={{ flex: 1 }} />
      </View>

      {summary ? (
        <>
          <FinancialCard title="جمع دریافت" amount={summary.receive} tone="positive" />
          <FinancialCard title="جمع پرداخت" amount={summary.pay} tone="negative" />
          <FinancialCard
            title="خالص"
            amount={summary.receive - summary.pay}
            tone={summary.receive - summary.pay >= 0 ? "positive" : "negative"}
          />
          {byPerson.length === 0 ? (
            <EmptyState title="تراکنشی در این دوره نیست" description="دورهٔ دیگری را انتخاب کنید یا تراکنش ثبت کنید." />
          ) : (
            <>
              <AppText size="sm" weight="medium" color={colors.textSecondary}>
                تفکیک به شخص و بانک
              </AppText>
              {byPerson.map((p) => (
                <ListRow
                  key={p.name}
                  title={p.name}
                  sub={`${p.receive > 0 ? `دریافت ${formatMoney(p.receive, unit)} • ` : ""}${p.pay > 0 ? `پرداخت ${formatMoney(p.pay, unit)}` : ""}`}
                  right={<AppText size="sm" weight="bold" color={p.receive - p.pay >= 0 ? colors.primaryDark : colors.danger}>{formatMoney(p.receive - p.pay, unit)}</AppText>}
                />
              ))}
              <PrimaryButton label="خروجی CSV (سازگار با Excel)" icon={<FileDown size={18} color={colors.onPrimary} />} onPress={() => void exportCsv()} />
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function jalaliYearStart(jy: number): string {
  // ۱ فروردین سال
  return jalaliToISO(jy, 1, 1);
}
function jalaliYearEnd(jy: number): string {
  const len = jalaliMonthLength(jy, 12);
  return jalaliToISO(jy, 12, len);
}

const s = StyleSheet.create({
  modeRow: { flexDirection: "row-reverse", gap: spacing.sm },
  navRow: { display: "none" },
  navRow2: { flexDirection: "row-reverse", gap: spacing.sm },
});
