/**
 * ویرایش تراکنش — مبلغ با قواعد اعتبارسنجی (کمتر یا مساوی ماندهٔ قابل قبول).
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, AppText, FormField, AmountInput, PrimaryButton, MoneyText } from "@/components";
import { getAppDb } from "@/db/client";
import { transactions, allocations, } from "@/db/schema";
import { eq, } from "drizzle-orm";
import { updateTransactionAmount } from "@/lib/repo";
import { parseAmountToRial } from "@/lib/money";
import { formatJalali } from "@/lib/dates";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const txnId = Number(id);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const data = React.useMemo(() => {
    const db = getAppDb().db;
    const txn = db.select().from(transactions).where(eq(transactions.id, txnId)).get();
    const alloc = db.select().from(allocations).where(eq(allocations.transactionId, txnId)).get();
    return { txn, alloc };
  }, [txnId]);

  const save = useCallback(() => {
    setSaving(true);
    try {
      const amount = parseAmountToRial(text, unit);
      updateTransactionAmount(getAppDb().db, txnId, amount);
      router.replace(`/transactions/${txnId}/receipt` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ویرایش ناموفق بود");
      setSaving(false);
    }
  }, [text, unit, txnId, router]);

  if (!data.txn || !data.alloc || data.alloc.amount !== data.txn.amount) {
    return (
      <Screen title="ویرایش تراکنش" onBack={() => router.back()}>
        <AppText color={colors.danger}>ویرایش این تراکنش (تخصیص چندگانه) پشتیبانی نمی‌شود</AppText>
      </Screen>
    );
  }

  return (
    <Screen title="ویرایش تراکنش" subtitle={formatJalali(data.txn.date)} onBack={() => router.back()}>
      <AppText size="sm" color={colors.textSecondary}>
        مبلغ فعلی:
      </AppText>
      <MoneyText rial={data.txn.amount} size="md" />
      <FormField label="مبلغ جدید" required error={error ?? undefined}>
        <AmountInput value={text} onChangeText={setText} autoFocus />
      </FormField>
      <AppText size="xs" color={colors.textSecondary}>
        مبلغ جدید نمی‌تواند ماندهٔ هدف را منفی کند؛ در غیر این صورت خطا می‌گیرید.
      </AppText>
      <PrimaryButton label="ذخیره" onPress={save} loading={saving} />
    </Screen>
  );
}
