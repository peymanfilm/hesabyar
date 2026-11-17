/**
 * تب حساب‌ها — فهرست اشخاص و طلب/بدهی با ماندهٔ خودکار؛ تهاتر انجام نمی‌شود.
 */
import React, { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Plus, Users } from "lucide-react-native";
import { Screen, AppText, ListRow, EmptyState, MoneyText, PrimaryButton } from "@/components";
import { getAppDb } from "@/db/client";
import { accounts, persons } from "@/db/schema";
import { getAccountState } from "@/lib/repo";
import { todayISO } from "@/lib/dates";
import { View, StyleSheet } from "react-native";
import { spacing, } from "@/theme";
import { useTheme } from "@/hooks/useTheme";

interface Row {
  id: number;
  kind: "receivable" | "debt";
  title: string;
  personName: string | null;
  balance: number;
  overdue: boolean;
  state: "unpaid" | "partial" | "settled";
}

export default function AccountsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [personCount, setPersonCount] = useState(0);

  const load = useCallback(() => {
    const db = getAppDb().db;
    const today = todayISO();
    const accs = db.select().from(accounts).all();
    const people = db.select().from(persons).all();
    const personById = new Map(people.map((p) => [p.id, p.name]));
    setPersonCount(people.length);
    setRows(
      accs.map((a) => {
        const st = getAccountState(db, a.id, today);
        return {
          id: a.id,
          kind: a.kind as "receivable" | "debt",
          title: a.title,
          personName: a.personId != null ? personById.get(a.personId) ?? null : null,
          balance: st.balance,
          overdue: st.overdue,
          state: st.state,
        };
      })
    );
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  return (
    <Screen
      title="حساب‌ها"
      subtitle={`${personCount} شخص • ${rows.length} حساب`}
    >
      <View style={s.actions}>
        <PrimaryButton label="طلب یا بدهی جدید" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => router.push("/accounts/new")} style={{ flex: 1 }} />
        <PrimaryButton label="اشخاص" variant="soft" icon={<Users size={18} color={colors.primaryDark} />} onPress={() => router.push("/persons")} style={{ flex: 1 }} />
      </View>
      {rows.length === 0 ? (
        <EmptyState title="حسابی ثبت نشده" description="طلب‌ها و بدهی‌های خود از اشخاص را ثبت کنید؛ مانده‌ها با هر دریافت و پرداخت به‌روز می‌شود." />
      ) : (
        rows.map((r) => (
          <ListRow
            key={r.id}
            title={r.title}
            sub={`${r.personName ? r.personName + " • " : ""}${r.kind === "receivable" ? "طلب من" : "بدهی من"}${r.overdue ? " • عقب‌افتاده" : ""}`}
            right={<MoneyText rial={r.balance} size="md" tone={r.kind === "receivable" ? "positive" : "negative"} />}
            onPress={() => router.push(`/accounts/${r.id}`)}
            badge={r.overdue ? <StatusBadge status="overdue" /> : <StatusBadge status={r.state} />}
          />
        ))
      )}
    </Screen>
  );
}

const StatusBadge = (p: { status: string }) => {
  const { colors } = useTheme();
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    unpaid: { label: "پرداخت‌نشده", bg: colors.skeleton, fg: colors.textSecondary },
    partial: { label: "پرداخت جزئی", bg: colors.warningSoft, fg: colors.warning },
    settled: { label: "تسویه‌شده", bg: colors.successSoft, fg: colors.primaryDark },
    overdue: { label: "عقب‌افتاده", bg: colors.dangerSoft, fg: colors.danger },
  };
  const st = map[p.status] ?? map.unpaid!;
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <AppText size="xs" weight="medium" color={st.fg}>
        {st.label}
      </AppText>
    </View>
  );
};

const s = StyleSheet.create({
  actions: { flexDirection: "row-reverse", gap: spacing.sm },
  badge: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3 },
});
