/**
 * پرونده شخص — مجموع طلب/بدهی، خالص با جملهٔ واضح، حساب‌ها و تراکنش‌ها.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams , useFocusEffect } from "expo-router";
import { Screen, AppText, FinancialCard, ListRow, MoneyText, EmptyState, ConfirmDialog, PrimaryButton } from "@/components";
import { getAppDb } from "@/db/client";
import { persons, accounts, } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAccountState, transactionsOfAccount, deletePerson } from "@/lib/repo";
import { todayISO, formatJalali } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const personId = Number(id);
  const [, setTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = React.useMemo(() => {
    const db = getAppDb().db;
    const person = db.select().from(persons).where(eq(persons.id, personId)).get();
    if (!person) return null;
    const accs = db.select().from(accounts).all().filter((a) => a.personId === personId);
    const today = todayISO();
    let receivable = 0;
    let debt = 0;
    const accRows = accs.map((a) => {
      const st = getAccountState(db, a.id, today);
      if (a.kind === "receivable") receivable += st.balance;
      else debt += st.balance;
      return { acc: a, balance: st.balance, overdue: st.overdue };
    });
    const txns = accs.flatMap((a) => transactionsOfAccount(db, a.id)).sort((x, y) => (x.txn.date < y.txn.date ? 1 : -1));
    return { person, accRows, receivable, debt, txns };
     
  }, [personId]);

  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  if (!data) {
    return (
      <Screen title="شخص" onBack={() => router.back()}>
        <AppText color={colors.danger}>شخص یافت نشد</AppText>
      </Screen>
    );
  }

  const net = data.receivable - data.debt;
  const netSentence =
    data.receivable === 0 && data.debt === 0
      ? "حساب بازی ندارد"
      : data.debt === 0
        ? `${formatMoney(data.receivable, unit)} ${unit === "toman" ? "تومان" : "ریال"} طلب دارید`
        : data.receivable === 0
          ? `${formatMoney(data.debt, unit)} ${unit === "toman" ? "تومان" : "ریال"} بدهکارید`
          : net >= 0
            ? `در کل ${formatMoney(net, unit)} ${unit === "toman" ? "تومان" : "ریال"} طلب دارید`
            : `در کل ${formatMoney(-net, unit)} ${unit === "toman" ? "تومان" : "ریال"} بدهکارید`;

  return (
    <Screen title={data.person.name} subtitle={data.person.phone ?? "پرونده شخص"} onBack={() => router.back()} scroll>
      <FinancialCard title="خالص حساب" amount={Math.abs(net)} tone={net > 0 ? "positive" : net < 0 ? "negative" : "neutral"} sub={netSentence} />
      <FinancialCard title="مجموع طلب" amount={data.receivable} tone="positive" />
      <FinancialCard title="مجموع بدهی" amount={data.debt} tone="negative" />

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        حساب‌های این شخص
      </AppText>
      {data.accRows.length === 0 ? (
        <AppText size="sm" color={colors.textSecondary}>
          حسابی ثبت نشده است
        </AppText>
      ) : (
        data.accRows.map((r) => (
          <ListRow
            key={r.acc.id}
            title={r.acc.title}
            sub={`${r.acc.kind === "receivable" ? "طلب من" : "بدهی من"}`}
            right={<MoneyText rial={r.balance} size="md" tone={r.acc.kind === "receivable" ? "positive" : "negative"} />}
            onPress={() => router.push(`/accounts/${r.acc.id}`)}
          />
        ))
      )}

      <AppText size="sm" weight="medium" color={colors.textSecondary}>
        تراکنش‌ها
      </AppText>
      {data.txns.length === 0 ? (
        <EmptyState title="تراکنشی نیست" description="تراکنش‌های همهٔ حساب‌های این شخص اینجا دیده می‌شود." />
      ) : (
        data.txns.slice(0, 20).map((t) => (
          <ListRow key={t.txn.id} title={`${t.txn.kind === "receive" ? "دریافت" : "پرداخت"} ${t.txn.amount}`} sub={formatJalali(t.txn.date)} onPress={() => router.push(`/transactions/${t.txn.id}/receipt` as never)} />
        ))
      )}

      <PrimaryButton label="حذف شخص" variant="ghost" onPress={() => setConfirmDelete(true)} />
      <ConfirmDialog
        visible={confirmDelete}
        title="حذف شخص"
        message="شخص بدون سوابق مالی حذف می‌شود؛ اگر حساب تراکنش‌دار داشته باشد، ابتدا باید تعیین تکلیف شود."
        danger
        onConfirm={() => {
          try {
            deletePerson(getAppDb().db, personId);
            router.back();
          } catch {
            setConfirmDelete(false);
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}


