/**
 * ثبت و ویرایش وام — فرم کامل + پیش‌نمایش جدول اقساط قبل از ثبت.
 */
import React, { useCallback, useMemo, useState } from "react";
import { useRouter, } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Screen, AppText, FormField, TextField, AmountInput, PrimaryButton, ConfirmDialog, } from "@/components";
import { PersianDatePicker } from "@/components/PersianDatePicker";
import { getAppDb } from "@/db/client";
import { createLoan, type LoanInput } from "@/lib/repo";
import { generateMonthlySchedule, scheduleMismatch, sumSchedule, type ScheduleRow } from "@/lib/installments";
import { parseAmountToRial, MoneyError, MAX_RIAL } from "@/lib/money";
import { loanFormSchema } from "@/lib/validation";
import { todayISO, formatJalali, } from "@/lib/dates";
import { digitsToPersian, digitsToEnglish } from "@/lib/persian";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function LoanNewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const db = getAppDb().db;

  const [title, setTitle] = useState("");
  const [bank, setBank] = useState("");
  const [principalText, setPrincipalText] = useState("");
  const [totalRepayText, setTotalRepayText] = useState("");
  const [countText, setCountText] = useState("");
  const [installmentText, setInstallmentText] = useState("");
  const [firstDue, setFirstDue] = useState(todayISO());
  const [contractNo, setContractNo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ScheduleRow[] | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const mismatch = useMemo(() => {
    if (!preview) return null;
    const tr = totalRepayText.trim() ? parseAmountToRial(totalRepayText, unit) : null;
    return scheduleMismatch(tr, preview);
  }, [preview, totalRepayText, unit]);

  const buildPreview = useCallback(() => {
    const errs: Record<string, string> = {};
    try {
      const principal = parseAmountToRial(principalText, unit);
      if (principal > MAX_RIAL) errs.principal = "مبلغ خارج از محدودهٔ مجاز است";
      const count = Number(digitsToEnglish(countText));
      const inst = parseAmountToRial(installmentText, unit);
      const z = loanFormSchema.safeParse({
        title: title.trim() || "وام",
        bank: bank.trim(),
        principal,
        totalRepay: totalRepayText.trim() ? parseAmountToRial(totalRepayText, unit) : null,
        installmentCount: count,
        installmentAmount: inst,
        firstDueDate: firstDue,
        scheduleMode: "monthly",
        contractNo: contractNo.trim(),
        note: note.trim(),
      });
      if (!z.success) {
        setErrors({ principal: "مبلغ اصل وام نامعتبر است", ...errs });
        return;
      }
      if (!Number.isInteger(count) || count <= 0 || count > 360) {
        setErrors({ count: "تعداد اقساط بین ۱ تا ۳۶۰" });
        return;
      }
      setErrors({});
      setPreview(generateMonthlySchedule(firstDue, count, inst));
    } catch (e) {
      if (e instanceof MoneyError) {
        setErrors({
          ...(principalText && e.message.includes("اصل") ? { principal: e.message } : {}),
          installment: installmentText ? e.message : "مبلغ قسط نامعتبر است",
        });
      }
    }
  }, [title, bank, principalText, totalRepayText, countText, installmentText, firstDue, contractNo, note, unit]);

  const save = useCallback(() => {
    if (!preview) return;
    setSaving(true);
    try {
      const input: LoanInput = {
        title: title.trim(),
        bank: bank.trim() || null,
        principal: parseAmountToRial(principalText, unit),
        totalRepay: totalRepayText.trim() ? parseAmountToRial(totalRepayText, unit) : null,
        installmentCount: Number(digitsToEnglish(countText)),
        installmentAmount: parseAmountToRial(installmentText, unit),
        firstDueDate: firstDue,
        scheduleMode: "monthly",
        contractNo: contractNo.trim() || null,
        note: note.trim() || null,
      };
      const loanId = createLoan(db, input, preview);
      setConfirmSave(false);
      router.replace(`/loans/${loanId}` as never);
    } catch (e) {
      setErrors({ save: e instanceof Error ? e.message : "ثبت وام ناموفق بود" });
      setPreview(null);
    } finally {
      setSaving(false);
    }
  }, [preview, title, bank, principalText, totalRepayText, countText, installmentText, firstDue, contractNo, note, unit, db, router]);

  return (
    <Screen title="ثبت وام" subtitle="اطلاعات وام و جدول اقساط" onBack={() => router.back()}>
      <FormField label="عنوان وام" required error={errors.title}>
        <TextField value={title} onChangeText={setTitle} placeholder="مثلاً وام مسکن بانک ملی" accessibilityLabel="عنوان وام" />
      </FormField>
      <FormField label="نام بانک">
        <TextField value={bank} onChangeText={setBank} placeholder="مثلاً بانک ملی" />
      </FormField>
      <FormField label="اصل وام" required error={errors.principal}>
        <AmountInput value={principalText} onChangeText={setPrincipalText} />
      </FormField>
      <FormField label="کل بازپرداخت (اختیاری)" error={errors.totalRepay} hint="اگر پر کنید، جمع اقساط باید دقیقاً برابر آن باشد">
        <AmountInput value={totalRepayText} onChangeText={setTotalRepayText} placeholder="اختیاری" />
      </FormField>
      <FormField label="تعداد اقساط" required error={errors.count}>
        <TextField value={countText} onChangeText={setCountText} placeholder="مثلاً ۲۴" keyboardType="number-pad" />
      </FormField>
      <FormField label="مبلغ هر قسط" required error={errors.installment}>
        <AmountInput value={installmentText} onChangeText={setInstallmentText} />
      </FormField>
      <FormField label="اولین سررسید" required hint={formatJalali(firstDue)}>
        <PersianDatePicker value={firstDue} onChange={setFirstDue} />
      </FormField>
      <FormField label="شماره قرارداد (اختیاری)">
        <TextField value={contractNo} onChangeText={setContractNo} placeholder="اختیاری" />
      </FormField>
      <FormField label="توضیحات">
        <TextField value={note} onChangeText={setNote} placeholder="اختیاری" multiline />
      </FormField>
      {errors.save ? (
        <AppText size="sm" color={colors.danger}>
          {errors.save}
        </AppText>
      ) : null}
      <PrimaryButton label="پیش‌نمایش اقساط" variant="soft" onPress={buildPreview} />

      {preview ? (
        <View style={[s.preview, { backgroundColor: colors.card }]}>
          <View style={s.previewHead}>
            <AppText size="md" weight="semiBold">
              پیش‌نمایش {preview.length} قسط
            </AppText>
            <AppText size="sm" weight="bold" color={colors.primaryDark}>
              جمع: {digitsToPersian(String(sumSchedule(preview)))} ریال
            </AppText>
          </View>
          {mismatch != null && mismatch !== 0 ? (
            <AppText size="sm" color={colors.danger}>
              {`اختلاف با کل بازپرداخت: ${digitsToPersian(String(mismatch))} ریال — قبل از ثبت اصلاح کنید`}
            </AppText>
          ) : null}
          {preview.slice(0, 13).map((r) => (
            <View key={r.seq} style={s.previewRow}>
              <AppText size="sm" color={colors.textSecondary} style={s.previewSeq}>
                {digitsToPersian(String(r.seq))}
              </AppText>
              <AppText size="sm" style={{ flex: 1 }}>
                {formatJalali(r.dueDate)}
              </AppText>
              <AppText size="sm" weight="semiBold">
                {digitsToPersian(String(r.amount))}
              </AppText>
            </View>
          ))}
          {preview.length > 13 ? (
            <AppText size="xs" color={colors.textSecondary}>
              و {digitsToPersian(String(preview.length - 13))} قسط دیگر…
            </AppText>
          ) : null}
          <PrimaryButton label="ثبت وام" onPress={() => setConfirmSave(true)} loading={saving} />
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmSave}
        title="ثبت وام"
        message={`${preview?.length ?? 0} قسط تولید می‌شود و پس از ثبت قابل ویرایش مبلغ/تاریخ است. ادامه؟`}
        onConfirm={save}
        onCancel={() => setConfirmSave(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { borderRadius: 16, padding: 16, gap: 8 },
  previewHead: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  previewRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7ECEB" },
  previewSeq: { width: 28, textAlign: "center" },
});
