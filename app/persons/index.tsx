/**
 * اشخاص — فهرست با مجموع طلب/بدهی و خالص حساب.
 */
import React, { useCallback, useState } from "react";
import { useRouter , useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { Screen, AppText, ListRow, EmptyState, } from "@/components";
import { getAppDb } from "@/db/client";
import { persons, accounts } from "@/db/schema";
import { getAccountState } from "@/lib/repo";
import { todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useUiStore } from "@/store/ui-store";
import { useTheme } from "@/hooks/useTheme";

export default function PersonsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const [rows, setRows] = useState<{ id: number; name: string; phone: string | null; receivable: number; debt: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      const db = getAppDb().db;
      const today = todayISO();
      const people = db.select().from(persons).all();
      const accs = db.select().from(accounts).all();
      setRows(
        people.map((p) => {
          let receivable = 0;
          let debt = 0;
          for (const a of accs.filter((x) => x.personId === p.id)) {
            const st = getAccountState(db, a.id, today);
            if (a.kind === "receivable") receivable += st.balance;
            else debt += st.balance;
          }
          return { id: p.id, name: p.name, phone: p.phone, receivable, debt };
        })
      );
    }, [])
  );

  const netSentence = (receivable: number, debt: number): string => {
    const net = receivable - debt;
    if (receivable === 0 && debt === 0) return "حساب بازی ندارد";
    if (debt === 0) return `${formatMoney(receivable, unit)} طلب`;
    if (receivable === 0) return `${formatMoney(debt, unit)} بدهی`;
    return net >= 0 ? `${formatMoney(net, unit)} خالص طلب` : `${formatMoney(-net, unit)} خالص بدهی`;
  };

  const avatarLetter = (name: string) => name.trim().charAt(0);

  return (
    <Screen title="اشخاص" onBack={() => router.back()} scroll>
      <ListRow
        title="شخص جدید"
        onPress={() => router.push("/persons/new")}
        right={<Plus size={20} color={colors.primary} />}
        badge={null}
      />
      {rows.length === 0 ? (
        <EmptyState title="شخصی ثبت نشده" description="اشخاص را برای سازمان‌دهی طلب‌ها و بدهی‌ها اضافه کنید." />
      ) : (
        rows.map((p) => (
          <ListRow
            key={p.id}
            title={p.name}
            sub={netSentence(p.receivable, p.debt)}
            right={
              <AppText size="sm" weight="bold" color={p.receivable - p.debt >= 0 ? colors.primaryDark : colors.danger}>
                {avatarLetter(p.name)}
              </AppText>
            }
            onPress={() => router.push(`/persons/${p.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
