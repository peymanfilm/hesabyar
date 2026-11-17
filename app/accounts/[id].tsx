/**
 * جزئیات حساب طلب/بدهی — مانده، تراکنش‌ها، ثبت دریافت/پرداخت، تسویه کامل، رسید و ویرایش.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Plus, } from "lucide-react-native";
import { Screen, AppText, FinancialCard, AmountInput, PrimaryButton, ConfirmDialog, TransactionItem, FormField, TextField } from "@/components";
import { getAppDb } from "@/db/client";
import { accounts as accountsTable, persons as personsTable } from "@/db/schema";
import { getAccountState, addTransaction, transactionsOfAccount, deleteAccount, deleteTransaction } from "@/lib/repo";
import { parseAmountToRial, } from "@/lib/money";
import { todayISO, formatJalali } from "@/lib/dates";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function AccountDetailScreen() {
  const routeParams = useLocalSearchParams<{ id: string; kind?: string }>();
  const { id } = routeParams;
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const accId = Number(id);
  const [reloadKey, setReloadKey] = useState(0);
  const [addVisible, setAddVisible] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ txnId: number } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [saving, setSaving] = useState(false);

  const kindParam: "pay" | "receive" = routeParams.kind === "pay" ? "pay" : "receive";

  const load = useCallback(() => {
    const db = getAppDb().db;
    try {
      const acc = db.select().from(accountsTable).all().find((a) => a.id === accId);
      if (!acc) return null;
      const person = acc.personId != null ? db.select().from(personsTable).all().find((p) => p.id === acc.personId) : null;
      const st = getAccountState(db, accId, todayISO());
      const txns = transactionsOfAccount(db, accId).sort((a, b) => (a.txn.date < b.txn.date ? 1 : -1));
      return { acc, personName: person?.name ?? null, st, txns };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accId, reloadKey]);

  const submitTxn = useCallback(
    (fullSettle?: number, accKind?: "receivable" | "debt") => {
      setSaving(true);
      try {
        const amount = fullSettle ?? parseAmountToRial(amountText, unit);
        const kind = accKind === "debt" ? "pay" : accKind === "receivable" ? "receive" : kindParam;
        const txnId = addTransaction(
          getAppDb().db,
          { kind, amount, date: todayISO(), method, note: note.trim() || null },
          [{ targetType: "account", targetId: accId, amount }],
          { date: todayISO() }
        );
        setAddVisible(false);
        setAmountText("");
        setNote("");
        setError(null);
        setReloadKey((k) => k + 1);
        router.push(`/transactions/${txnId}/receipt` as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ثبت ناموفق بود");
      } finally {
        setSaving(false);
      }
    },
    [amountText, method, note, unit, accId, kindParam, router]
  );

  const data = load();

  if (!data) {
    return (
      <Screen title="حساب" onBack={() => router.back()}>
        <AppText color={colors.danger}>حساب یافت نشد</AppText>
      </Screen>
    );
  }

  const isReceivable = data.acc.kind === "receivable";

  return (
    <Screen title={data.acc.title} subtitle={`${data.personName ?? ""} • ${isReceivable ? "طلب من" : "بدهی من"}`} onBack={() => router.back()} scroll>
      <FinancialCard
        title="مانده"
        amount={data.st.balance}
        tone={data.st.balance === 0 ? "positive" : isReceivable ? "positive" : "negative"}
        sub={`تسویه‌شده: ${data.st.paid} ریال از ${data.acc.initialAmount} ریال${data.acc.dueDate ? ` • سررسید ${formatJalali(data.acc.dueDate)}` : ""}`}
      />

      <View style={s.actions}>
        <PrimaryButton
          label={isReceivable ? "ثبت دریافت" : "ثبت پرداخت"}
          icon={<Plus size={18} color={colors.onPrimary} />}
          onPress={() => {
            setAddVisible(true);
            setError(null);
          }}
          style={{ flex: 2 }}
        />
        <PrimaryButton
          label="تسویه کامل"
          variant="soft"
          onPress={() => {
            if (data.st.balance > 0) submitTxn(data.st.balance);
          }}
          disabled={data.st.balance === 0}
          style={{ flex: 1 }}
        />
      </View>

      {addVisible ? (
        <View style={[s.addCard, { backgroundColor: colors.card }]}>
          <AppText size="md" weight="semiBold">
            {isReceivable ? "دریافت جدید" : "پرداخت جدید"}
          </AppText>
          <FormField label="مبلغ" error={error ?? undefined}>
            <AmountInput value={amountText} onChangeText={setAmountText} autoFocus />
          </FormField>
          <FormField label="روش">
            <View style={s.methodRow}>
              {(["cash", "card", "transfer", "other"] as const).map((m) => (
                <PrimaryButton
                  key={m}
                  label={m === "cash" ? "نقدی" : m === "card" ? "کارت‌به‌کارت" : m === "transfer" ? "انتقال بانکی" : "سایر"}
                  variant={method === m ? "primary" : "soft"}
                  onPress={() => setMethod(m)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </FormField>
          <FormField label="توضیحات">
            <TextField value={note} onChangeText={setNote} placeholder="اختیاری" multiline />
          </FormField>
          <AppText size="xs" color={colors.textSecondary}>
            {`پس از ثبت، مانده: ${data.st.balance} ریال منهای مبلغ جدید`}
          </AppText>
          <View style={s.methodRow}>
            <PrimaryButton label="ثبت و نمایش رسید" onPress={() => submitTxn()} loading={saving} style={{ flex: 2 }} />
            <PrimaryButton label="انصراف" variant="ghost" onPress={() => setAddVisible(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        تاریخچه تراکنش‌ها
      </AppText>
      {data.txns.length === 0 ? (
        <AppText size="sm" color={colors.textSecondary}>
          هنوز تراکنشی ثبت نشده است
        </AppText>
      ) : (
        data.txns.map((t) => (
          <TransactionItem
            key={t.txn.id}
            kind={t.txn.kind as "pay" | "receive"}
            amount={t.txn.amount}
            dateJalali={formatJalali(t.txn.date)}
            method={t.txn.method}
            note={t.txn.note}
            onPress={() => router.push(`/transactions/${t.txn.id}/receipt` as never)}
          />
        ))
      )}

      <View style={s.dangerZone}>
        <PrimaryButton
          label="حذف حساب"
          variant="ghost"
          onPress={() => setConfirmWipe(true)}
          style={{ flex: 1 }}
        />
      </View>

      <ConfirmDialog
        visible={!!confirmDelete}
        title="حذف تراکنش"
        message="مانده حساب با حذف این تراکنش به‌روز می‌شود. ادامه؟"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteTransaction(getAppDb().db, confirmDelete.txnId);
          setConfirmDelete(null);
          setReloadKey((k) => k + 1);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        visible={confirmWipe}
        title="حذف حساب"
        message="حساب بدون تراکنش حذف می‌شود؛ حساب دارای تراکنش ابتدا باید تراکنش‌هایش تعیین تکلیف شود."
        confirmLabel="حذف"
        danger
        onConfirm={() => {
          try {
            deleteAccount(getAppDb().db, accId);
            router.back();
          } catch (e) {
            setConfirmWipe(false);
            setError(e instanceof Error ? e.message : "حذف ناموفق بود");
          }
        }}
        onCancel={() => setConfirmWipe(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: "row-reverse", gap: 8 },
  addCard: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "#087F6D33" },
  methodRow: { flexDirection: "row-reverse", gap: 6 },
  dangerZone: { marginTop: 16, alignItems: "center" },
});
