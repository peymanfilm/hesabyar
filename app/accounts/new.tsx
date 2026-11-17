/**
 * ثبت طلب یا بدهی — فرم کامل با شخص، سررسید اختیاری و شیوهٔ تسویه.
 */
import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Screen, FormField, TextField, AmountInput, PrimaryButton, } from "@/components";
import { PersianDatePicker } from "@/components/PersianDatePicker";
import { getAppDb } from "@/db/client";
import { persons as personsTable } from "@/db/schema";
import { createPerson, createAccount } from "@/lib/repo";
import { parseAmountToRial, MoneyError } from "@/lib/money";
import { accountFormSchema , zodMessages } from "@/lib/validation";
import { todayISO, formatJalali } from "@/lib/dates";
import { useUiStore } from "@/store/ui-store";

export default function AccountNewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const unit = useUiStore((s) => s.unit);
  const db = getAppDb().db;

  const initialKind = params.kind === "debt" ? "debt" : params.kind === "receivable" ? "receivable" : "receivable";
  const [kind, setKind] = useState<"receivable" | "debt">(initialKind);
  const [title, setTitle] = useState("");
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState("");
  const [createdDate, setCreatedDate] = useState(todayISO());
  const [hasDue, setHasDue] = useState(false);
  const [dueDate, setDueDate] = useState(todayISO());
  const [settleMode, setSettleMode] = useState<"lump" | "installment" | "irregular">("irregular");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const pickPerson = (name: string) => {
    // شخص موجود یا ساخت جدید
    const existing = db.select().from(personsTable).all().find((p) => p.name === name.trim());
    if (existing) setPersonId(existing.id);
    else setPersonId(null);
    setPersonName(name);
  };

  const save = useCallback(() => {
    setSaving(true);
    try {
      const amount = parseAmountToRial(amountText, unit);
      const person = personId ?? (personName.trim() ? createPerson(db, { name: personName.trim() }) : null);
      const form = {
        title: title.trim() || (kind === "receivable" ? `طلب ${personName.trim()}` : `بدهی به ${personName.trim()}`),
        kind,
        personId: person,
        initialAmount: amount,
        createdDate,
        dueDate: hasDue ? dueDate : null,
        settleMode,
        note: note.trim(),
      };
      const z = accountFormSchema.safeParse(form);
      if (!z.success) {
        setErrors(zodMessages(z.error));
        setSaving(false);
        return;
      }
      const accId = createAccount(db, z.data as never);
      setSaving(false);
      router.replace(`/accounts/${accId}` as never);
    } catch (e) {
      setErrors({ initialAmount: e instanceof MoneyError ? e.message : "ثبت ناموفق بود" });
      setSaving(false);
    }
  }, [title, personName, personId, amountText, createdDate, hasDue, dueDate, settleMode, note, kind, unit, db, router]);

  return (
    <Screen title={kind === "receivable" ? "ثبت طلب" : "ثبت بدهی"} subtitle="اطلاعات حساب مالی با شخص" onBack={() => router.back()}>
      <View style={s.kindRow}>
        <PrimaryButton label="طلب من" variant={kind === "receivable" ? "primary" : "soft"} onPress={() => setKind("receivable")} style={{ flex: 1 }} />
        <PrimaryButton label="بدهی من" variant={kind === "debt" ? "danger" : "soft"} onPress={() => setKind("debt")} style={{ flex: 1 }} />
      </View>

      <FormField label="عنوان" required error={errors.title}>
        <TextField value={title} onChangeText={setTitle} placeholder={kind === "receivable" ? "مثلاً قرض دوستانه" : "مثلاً قرض از همکار"} />
      </FormField>
      <FormField label="شخص" required error={errors.personId} hint={personName.trim() ? (personId ? "شخص موجود انتخاب شد" : "شخص جدید هنگام ثبت ساخته می‌شود") : "نام شخص را بنویسید"}>
        <TextField value={personName} onChangeText={pickPerson} placeholder="مثلاً علی محمدی" />
      </FormField>
      <FormField label={kind === "receivable" ? "مبلغ طلب" : "مبلغ بدهی"} required error={errors.initialAmount}>
        <AmountInput value={amountText} onChangeText={setAmountText} />
      </FormField>
      <FormField label="تاریخ ایجاد" required hint={formatJalali(createdDate)}>
        <PersianDatePicker value={createdDate} onChange={setCreatedDate} />
      </FormField>
      <FormField label="سررسید (اختیاری)" hint="حساب بدون سررسید هرگز عقب‌افتاده محسوب نمی‌شود">
        <View style={s.dueRow}>
          <PrimaryButton label={hasDue ? "بدون سررسید" : "تعیین سررسید"} variant="soft" onPress={() => setHasDue(!hasDue)} style={{ flex: 1 }} />
        </View>
        {hasDue ? <PersianDatePicker value={dueDate} onChange={setDueDate} minISO={createdDate} /> : null}
      </FormField>
      <FormField label="شیوهٔ تسویه">
        <View style={s.modeRow}>
          <PrimaryButton label="یک‌جا" variant={settleMode === "lump" ? "primary" : "soft"} onPress={() => setSettleMode("lump")} style={{ flex: 1 }} />
          <PrimaryButton label="قسطی" variant={settleMode === "installment" ? "primary" : "soft"} onPress={() => setSettleMode("installment")} style={{ flex: 1 }} />
          <PrimaryButton label="نامنظم" variant={settleMode === "irregular" ? "primary" : "soft"} onPress={() => setSettleMode("irregular")} style={{ flex: 1 }} />
        </View>
      </FormField>
      <FormField label="توضیحات">
        <TextField value={note} onChangeText={setNote} placeholder="اختیاری" multiline />
      </FormField>
      <PrimaryButton
        label={kind === "receivable" ? "ثبت طلب" : "ثبت بدهی"}
        variant={kind === "receivable" ? "primary" : "danger"}
        onPress={save}
        loading={saving}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  kindRow: { flexDirection: "row-reverse", gap: 8 },
  dueRow: { flexDirection: "row-reverse", gap: 8 },
  modeRow: { flexDirection: "row-reverse", gap: 6 },
});
