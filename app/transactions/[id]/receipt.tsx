/**
 * نمایش رسید تراکنش — خروجی PDF با expo-print و اشتراک‌گذاری با اقدام کاربر.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { FileText, Share2, Pencil } from "lucide-react-native";
import { Screen, AppText, MoneyText, PrimaryButton, ListRow, ConfirmDialog } from "@/components";
import { getAppDb } from "@/db/client";
import { transactions, allocations, accounts, installments, loans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { receiptHtml } from "@/lib/files";
import { formatJalali } from "@/lib/dates";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const txnId = Number(id);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = React.useMemo(() => {
    const db = getAppDb().db;
    const txn = db.select().from(transactions).where(eq(transactions.id, txnId)).get();
    if (!txn) return null;
    const alloc = db.select().from(allocations).where(eq(allocations.transactionId, txnId)).get();
    let targetTitle = "—";
    if (alloc) {
      if (alloc.targetType === "account") {
        const acc = db.select().from(accounts).where(eq(accounts.id, alloc.targetId)).get();
        targetTitle = acc?.title ?? "حساب";
      } else if (alloc.targetType === "loan_installment") {
        const inst = db.select().from(installments).where(eq(installments.id, alloc.targetId)).get();
        const loan = inst ? db.select().from(loans).where(eq(loans.id, inst.loanId)).get() : null;
        targetTitle = loan && inst ? `${loan.title} — قسط ${inst.seq}` : "قسط وام";
      }
    }
    return { txn, targetTitle };
  }, [txnId]);

  const makePdf = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    try {
      const html = receiptHtml({
        txnId,
        kind: data.txn.kind as "pay" | "receive",
        amount: data.txn.amount,
        date: data.txn.date,
        recordedAt: data.txn.recordedAt,
        method: data.txn.method,
        targetTitle: data.targetTitle,
        note: data.txn.note,
        unit,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "رسید حساب‌یار" });
      }
    } finally {
      setBusy(false);
    }
  }, [txnId, data, unit]);

  const shareCsv = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    try {
      const isReceive = data.txn.kind === "receive";
      const csv = `\uFEFFنوع,مبلغ (ریال),تاریخ,روش,هدف\n${isReceive ? "دریافت" : "پرداخت"},${data.txn.amount},${data.txn.date},${data.txn.method},${data.targetTitle}\n`;
      const uri = `${FileSystem.cacheDirectory}hesabyar-receipt-${txnId}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/csv" });
    } finally {
      setBusy(false);
    }
  }, [txnId, data]);

  if (!data) {
    return (
      <Screen title="رسید" onBack={() => router.back()}>
        <AppText color={colors.danger}>تراکنش یافت نشد</AppText>
      </Screen>
    );
  }

  const isReceive = data.txn.kind === "receive";

  return (
    <Screen title="رسید تراکنش" onBack={() => router.back()} scroll>
      <View style={[s.receipt, { backgroundColor: colors.card }]}>
        <AppText size="lg" weight="bold" color={isReceive ? colors.primaryDark : colors.danger}>
          {isReceive ? "دریافت" : "پرداخت"}
        </AppText>
        <MoneyText rial={data.txn.amount} size="xl" tone={isReceive ? "positive" : "negative"} />
        <View style={s.rows}>
          <ListRow title="شرح" sub={data.targetTitle} />
          <ListRow title="تاریخ عملیات" sub={formatJalali(data.txn.date)} />
          <ListRow title="زمان ثبت" sub={data.txn.recordedAt.replace("T", " ")} />
          <ListRow title="روش" sub={data.txn.method === "cash" ? "نقدی" : data.txn.method === "card" ? "کارت‌به‌کارت" : data.txn.method === "transfer" ? "انتقال بانکی" : "سایر"} />
          {data.txn.note ? <ListRow title="توضیح" sub={data.txn.note} /> : null}
        </View>
      </View>

      <PrimaryButton label="خروجی PDF" icon={<FileText size={18} color={colors.onPrimary} />} onPress={() => void makePdf()} loading={busy} />
      <PrimaryButton label="اشتراک‌گذاری" variant="soft" icon={<Share2 size={18} color={colors.primaryDark} />} onPress={() => void shareCsv()} loading={busy} />
      <PrimaryButton label="ویرایش مبلغ تراکنش" variant="soft" icon={<Pencil size={18} color={colors.primaryDark} />} onPress={() => router.push(`/transactions/${txnId}/edit` as never)} />
      <PrimaryButton label="حذف تراکنش" variant="ghost" onPress={() => setConfirmDelete(true)} />

      <ConfirmDialog
        visible={confirmDelete}
        title="حذف تراکنش"
        message="این تراکنش و تخصیص آن حذف می‌شود و ماندهٔ هدف به‌روز می‌شود. ادامه؟"
        danger
        onConfirm={() => {
          getAppDb().db.delete(transactions).where(eq(transactions.id, txnId)).run();
          router.back();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  receipt: { borderRadius: 20, padding: 20, gap: 8, alignItems: "center" },
  rows: { alignSelf: "stretch", gap: 2, marginTop: 8 },
});
