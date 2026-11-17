/**
 * ثبت جدید — پنل انتخاب: وام، طلب، بدهی، پرداخت، دریافت، شخص
 */
import React from "react";
import { useRouter } from "expo-router";
import { Landmark, TrendingDown, TrendingUp, UserPlus, BanknoteArrowDown, BanknoteArrowUp } from "lucide-react-native";
import { Screen, ListRow } from "@/components";
import { useTheme } from "@/hooks/useTheme";

export default function QuickScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const go = (path: string, params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : "";
    router.replace(`${path}${q}` as never);
  };

  return (
    <Screen title="ثبت جدید" subtitle="چه چیزی می‌خواهید ثبت کنید؟" scroll>
      <ListRow
        title="طلب از کسی"
        sub="کسی به من بدهکار است — دریافت‌های بعدی مانده را کم می‌کند"
        right={<TrendingUp size={20} color={colors.primary} />}
        onPress={() => go("/accounts/new", { kind: "receivable" })}
      />
      <ListRow
        title="بدهی من"
        sub="من به کسی بدهکارم — پرداخت‌های بعدی مانده را کم می‌کند"
        right={<TrendingDown size={20} color={colors.danger} />}
        onPress={() => go("/accounts/new", { kind: "debt" })}
      />
      <ListRow
        title="وام و اقساط بانکی"
        sub="جدول اقساط شمسی، پرداخت جزئی و پیشرفت تسویه"
        right={<Landmark size={20} color={colors.textSecondary} />}
        onPress={() => go("/loans/new")}
      />
      <ListRow
        title="دریافت"
        sub="ثبت دریافت از یک حساب طلب یا تسویهٔ قسط"
        right={<BanknoteArrowUp size={20} color={colors.primary} />}
        onPress={() => go("/transactions/new", { kind: "receive" })}
      />
      <ListRow
        title="پرداخت"
        sub="ثبت پرداخت به یک بدهی یا پرداخت قسط وام"
        right={<BanknoteArrowDown size={20} color={colors.danger} />}
        onPress={() => go("/transactions/new", { kind: "pay" })}
      />
      <ListRow
        title="شخص جدید"
        sub="افزودن شخص برای سازمان‌دهی حساب‌ها"
        right={<UserPlus size={20} color={colors.textSecondary} />}
        onPress={() => go("/persons/new")}
      />
    </Screen>
  );
}
