/**
 * تب اقساط — فهرست وام‌ها با مانده و وضعیت عقب‌افتادگی + دکمهٔ وام جدید.
 */
import React, { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Screen, ListRow, EmptyState, MoneyText, StatusBadge } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { getAppDb } from "@/db/client";
import { loans, } from "@/db/schema";
import { loanInstallmentsWithState } from "@/lib/repo";
import { todayISO, formatJalali } from "@/lib/dates";
import { } from "react-native";

export default function InstallmentsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [items, setItems] = useState<{ id: number; title: string; bank: string | null; balance: number; progress: number; overdue: number; next: string | null }[]>([]);

  const load = useCallback(() => {
    const db = getAppDb().db;
    const today = todayISO();
    const rows = db.select().from(loans).all();
    setItems(
      rows.map((l) => {
        const st = loanInstallmentsWithState(db, l.id, today);
        const next = st.rows.find((r) => r.balance > 0 && r.dueDate >= today);
        return {
          id: l.id,
          title: l.title,
          bank: l.bank,
          balance: st.balance,
          progress: st.progress,
          overdue: st.rows.filter((r) => r.overdue).length,
          next: next?.dueDate ?? null,
        };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen title="اقساط و وام‌ها" subtitle="مانده اقساط و وضعیت تسویه">
      <ListRow
        title="ثبت وام جدید"
        sub="با تولید خودکار جدول اقساط ماهانه شمسی"
        onPress={() => router.push("/loans/new")}
        right={<Plus size={20} color={colors.primary} />}
        badge={null}
      />
      {items.length === 0 ? (
        <EmptyState title="هنوز وامی ثبت نشده" description="وام یا قسط‌بندی بانکی خود را ثبت کنید تا سررسیدها و مانده‌ها اینجا نمایش داده شود." />
      ) : (
        items.map((l) => (
          <ListRow
            key={l.id}
            title={l.title}
            sub={`${l.bank ? l.bank + " • " : ""}${l.next ? `سررسید بعدی ${formatJalali(l.next)}` : "تسویه کامل"}`}
            right={<MoneyText rial={l.balance} size="md" tone={l.overdue > 0 ? "negative" : "neutral"} />}
            onPress={() => router.push(`/loans/${l.id}`)}
            badge={l.overdue > 0 ? <StatusBadge status="overdue" /> : <StatusBadge status={l.progress === 100 ? "settled" : l.progress > 0 ? "partial" : "unpaid"} />}
          />
        ))
      )}
    </Screen>
  );
}
