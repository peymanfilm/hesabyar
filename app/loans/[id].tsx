/**
 * جزئیات وام — جدول اقساط با وضعیت و پرداخت جزئی/کامل.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet, } from "react-native";
import { Screen, AppText, MoneyText, StatusBadge, AmountInput, PrimaryButton, ConfirmDialog, FinancialCard, } from "@/components";
import { getAppDb } from "@/db/client";
import { loanInstallmentsWithState, addTransaction } from "@/lib/repo";
import { parseAmountToRial, MoneyError, remaining } from "@/lib/money";
import { todayISO, formatJalali } from "@/lib/dates";
import { digitsToEnglish } from "@/lib/persian";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const loanId = Number(id);
  const [reloadKey, setReloadKey] = useState(0);
  const [payTarget, setPayTarget] = useState<{ instId: number; remaining: number; title: string } | null>(null);
  const [amountText, setAmountText] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [saving, setSaving] = useState(false);

  const data = React.useMemo(() => {
    try {
      return loanInstallmentsWithState(getAppDb().db, loanId, todayISO());
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId, reloadKey]);

  const openPay = (instId: number, rem: number, seq: number) => {
    setPayTarget({ instId, remaining: rem, title: `پرداخت قسط ${seq}` });
    setAmountText("");
    setPayError(null);
    setConfirmPay(false);
  };

  const doPay = useCallback(() => {
    if (!payTarget) return;
    setSaving(true);
    try {
      const amount = parseAmountToRial(digitsToEnglish(amountText), unit);
      addTransaction(
        getAppDb().db,
        { kind: "pay", amount, date: todayISO(), method: "cash" },
        [{ targetType: "loan_installment", targetId: payTarget.instId, amount }],
        { date: todayISO() }
      );
      setPayTarget(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setPayError(e instanceof MoneyError || e instanceof Error ? e.message : "پرداخت ناموفق بود");
    } finally {
      setSaving(false);
    }
  }, [payTarget, amountText, unit]);

  const settleFull = useCallback((instId: number, rem: number) => {
    addTransaction(
      getAppDb().db,
      { kind: "pay", amount: rem, date: todayISO(), method: "cash", note: "تسویه کامل قسط" },
      [{ targetType: "loan_installment", targetId: instId, amount: rem }],
      { date: todayISO() }
    );
    setReloadKey((k) => k + 1);
  }, []);

  if (!data) {
    return (
      <Screen title="وام" onBack={() => router.back()}>
        <AppText color={colors.danger}>وام یافت نشد</AppText>
      </Screen>
    );
  }

  return (
    <Screen title={data.loan.title} subtitle={data.loan.bank ?? "وام"} onBack={() => router.back()} scroll>
      <FinancialCard title="ماندهٔ وام" amount={data.balance} />
      <FinancialCard
        title="پیشرفت تسویه"
        amount={null}
        sub={`${data.progress}% از کل ${data.rows.length} قسط پرداخت شده`}
        right={<AppText size="xl" weight="bold" color={colors.primaryDark}>{`${data.progress}%`}</AppText>}
      />

      {data.rows.map((r) => (
        <View key={r.id} style={[s.instCard, { backgroundColor: colors.card }]}>
          <View style={s.instHead}>
            <AppText size="md" weight="semiBold">
              {`قسط ${r.seq}`}
            </AppText>
            <StatusBadge status={r.overdue ? "overdue" : (r.status as "unpaid" | "partial" | "settled")} />
            <AppText size="xs" color={colors.textSecondary} style={{ flex: 1, textAlign: "left" }}>
              {formatJalali(r.dueDate)}
            </AppText>
          </View>
          <MoneyText rial={r.amount} size="md" />
          <AppText size="xs" color={colors.textSecondary}>
            {`پرداخت‌شده: ${r.allocated} ریال • مانده: ${r.balance} ریال`}
          </AppText>
          {r.balance > 0 ? (
            <View style={s.instActions}>
              <PrimaryButton label="پرداخت جزئی" variant="soft" onPress={() => openPay(r.id, r.balance, r.seq)} style={{ flex: 1 }} />
              <PrimaryButton label="تسویه کامل" variant="primary" onPress={() => settleFull(r.id, r.balance)} style={{ flex: 1 }} />
            </View>
          ) : null}
        </View>
      ))}

      <ConfirmDialog
        visible={!!payTarget && confirmPay}
        title={payTarget?.title ?? ""}
        message={`مبلغ واردشده از ماندهٔ قسط (${payTarget?.remaining ?? 0} ریال) بیشتر نباشد. ثبت؟`}
        onConfirm={doPay}
        onCancel={() => {
          setConfirmPay(false);
          setPayTarget(null);
        }}
      />

      {payTarget ? (
        <View style={[s.payCard, { backgroundColor: colors.card }]}>
          <AppText size="md" weight="semiBold">
            {payTarget.title}
          </AppText>
          <AppText size="xs" color={colors.textSecondary}>
            {`مانده: ${digitsToEnglish(String(payTarget.remaining))} ریال`}
          </AppText>
          <AmountInput
            value={amountText}
            onChangeText={(t) => {
              setAmountText(t);
              setPayError(null);
            }}
            error={payError ?? undefined}
            autoFocus
          />
          {payError ? null : (
            <AppText size="xs" color={colors.textSecondary}>
              چند پرداخت برای یک قسط مجاز است؛ پرداخت بیش از مانده رد می‌شود.
            </AppText>
          )}
          <View style={s.payActions}>
            <PrimaryButton
              label="بررسی و ثبت"
              onPress={() => {
                try {
                  const amount = parseAmountToRial(digitsToEnglish(amountText), unit);
                  remaining(payTarget.remaining, payTarget.remaining); // sanity
                  if (amount > payTarget.remaining) {
                    setPayError("مبلغ از ماندهٔ قسط بیشتر است");
                    return;
                  }
                  setPayError(null);
                  setConfirmPay(true);
                } catch (e) {
                  setPayError(e instanceof Error ? e.message : "مبلغ نامعتبر است");
                }
              }}
              loading={saving}
              style={{ flex: 2 }}
            />
            <PrimaryButton label="انصراف" variant="ghost" onPress={() => setPayTarget(null)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  instCard: { borderRadius: 16, padding: 16, gap: 6 },
  instHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  instActions: { flexDirection: "row-reverse", gap: 8, marginTop: 4 },
  payCard: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "#087F6D33" },
  payActions: { flexDirection: "row-reverse", gap: 8 },
});
