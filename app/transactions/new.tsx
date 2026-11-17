/**
 * ثبت تراکنش — انتخاب حساب یا قسط، مبلغ، تاریخ، روش، نمایش مانده و رسید.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Screen, AppText, FormField, TextField, AmountInput, PrimaryButton, ListRow } from "@/components";
import { PersianDatePicker } from "@/components/PersianDatePicker";
import { getAppDb } from "@/db/client";
import { accounts, loans, installments, allocations as allocationsTable } from "@/db/schema";
import { getAccountState, addTransaction } from "@/lib/repo";
import { parseAmountToRial, MoneyError, remaining } from "@/lib/money";
import { todayISO, formatJalali } from "@/lib/dates";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

interface Target {
  type: "account" | "loan_installment";
  id: number;
  title: string;
  remaining: number;
  allowedKind: "pay" | "receive";
}

export default function TransactionNewScreen() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const db = getAppDb().db;

  const [kind, setKind] = useState<"pay" | "receive">(kindParam === "pay" ? "pay" : "receive");
  const [targets] = useState<Target[]>(() => {
    const today = todayISO();
    const list: Target[] = [];
    for (const a of db.select().from(accounts).all()) {
      const st = getAccountState(db, a.id, today);
      list.push({
        type: "account",
        id: a.id,
        title: `${a.title} (${a.kind === "receivable" ? "طلب" : "بدهی"} • مانده ${st.balance})`,
        remaining: st.balance,
        allowedKind: a.kind === "receivable" ? "receive" : "pay",
      });
    }
    for (const l of db.select().from(loans).all()) {
      for (const inst of db.select().from(installments).all().filter((i) => i.loanId === l.id)) {
        const allocs = db.select().from(allocationsTable).all().filter((al) => al.targetType === "loan_installment" && al.targetId === inst.id);
        const paid = allocs.reduce((s, al) => s + al.amount, 0);
        const rem = inst.amount - paid;
        if (rem > 0)
          list.push({ type: "loan_installment", id: inst.id, title: `${l.title} — قسط ${inst.seq} (${formatJalali(inst.dueDate)}) • مانده ${rem}`, remaining: rem, allowedKind: "pay" });
      }
    }
    return list;
  });
  const [target, setTarget] = useState<Target | null>(null);
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  const submit = useCallback(
    async (settleFull?: boolean) => {
      if (!target) return;
      setSaving(true);
      try {
        const amount = settleFull ? target.remaining : parseAmountToRial(amountText, unit);
        remaining(target.remaining, target.remaining);
        if (amount > target.remaining) throw new MoneyError("مبلغ از ماندهٔ هدف بیشتر است");
        const txnId = addTransaction(
          db,
          { kind: target.allowedKind, amount, date, method, note: note.trim() || null },
          [{ targetType: target.type, targetId: target.id, amount }],
          { date }
        );
        router.replace(`/transactions/${txnId}/receipt` as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ثبت ناموفق بود");
        setSaving(false);
      }
    },
    [target, amountText, unit, date, method, note, db, router]
  );

  const filteredTargets = targets.filter((t) => t.allowedKind === kind);

  return (
    <Screen title={kind === "receive" ? "ثبت دریافت" : "ثبت پرداخت"} onBack={() => router.back()} scroll>
      <View style={s.kindRow}>
        <PrimaryButton label="دریافت" variant={kind === "receive" ? "primary" : "soft"} onPress={() => { setKind("receive"); setTarget(null); }} style={{ flex: 1 }} />
        <PrimaryButton label="پرداخت" variant={kind === "pay" ? "danger" : "soft"} onPress={() => { setKind("pay"); setTarget(null); }} style={{ flex: 1 }} />
      </View>

      <FormField label={kind === "receive" ? "از کدام حساب؟" : "به کدام حساب یا قسط؟"} required error={error && !target ? error : undefined}>
        {filteredTargets.length === 0 ? (
          <AppText size="sm" color={colors.textSecondary}>
            هدفی برای این نوع تراکنش نیست. اول حساب یا وام بسازید.
          </AppText>
        ) : (
          filteredTargets.map((t) => (
            <ListRow
              key={`${t.type}-${t.id}`}
              title={t.title}
              onPress={() => {
                setTarget(t);
                setError(null);
              }}
              badge={target && target.id === t.id && target.type === t.type ? <View style={s.dot} /> : null}
            />
          ))
        )}
      </FormField>

      {target ? (
        <>
          <FormField label="مبلغ" required error={error ?? undefined}>
            <AmountInput value={amountText} onChangeText={setAmountText} />
          </FormField>
          <PrimaryButton label={`میان‌بر تسویه کامل (${target.remaining} ریال)`} variant="soft" onPress={() => void submit(true)} loading={saving} />
          <FormField label="تاریخ" required hint={formatJalali(date)}>
            <PersianDatePicker value={date} onChange={setDate} />
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
          <PrimaryButton
            label="ثبت و نمایش رسید"
            variant={kind === "receive" ? "primary" : "danger"}
            onPress={() => void submit(false)}
            loading={saving}
          />
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  kindRow: { flexDirection: "row-reverse", gap: 8 },
  methodRow: { flexDirection: "row-reverse", gap: 6, flexWrap: "wrap" },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#087F6D" },
});
