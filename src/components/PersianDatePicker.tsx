/**
 * انتخابگر تاریخ شمسی — تقویم ماهانه با ناوبری و کلمپ خودکار.
 * مقادیر به شکل ISO date-only برمی‌گردند؛ نمایش کاملاً شمسی است.
 */
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { AppText } from "./index";
import { JALALI_MONTHS ,
  gregorianToJalali,
  jalaliToISO,
  jalaliMonthLength,
  nextJalaliMonth,
  prevJalaliMonth,
} from "@/lib/dates";
import { digitsToPersian } from "@/lib/persian";
import { radius, spacing, touchTarget } from "@/theme";
import { useTheme } from "@/hooks/useTheme";

export function PersianDatePicker({
  value,
  onChange,
  minISO,
}: {
  value: string;
  onChange: (iso: string) => void;
  minISO?: string;
}) {
  const { colors } = useTheme();
  const initial = useMemo(() => gregorianToJalali(value), [value]);
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });
  const selected = useMemo(() => gregorianToJalali(value), [value]);

  const monthLen = jalaliMonthLength(view.jy, view.jm);
  // روز هفته اول ماه: تبدیل ۱ ماه به میلادی و dayOfWeek
  const firstG = jalaliToISO(view.jy, view.jm, 1);
  const [gy, gm, gd] = firstG.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0=Sunday
  // ستون‌ها شنبه‌محور: شنبه=0 … جمعه=6
  const offset = (dow + 1) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: monthLen }, (_, i) => i + 1),
  ];

  const pick = (day: number) => {
    const iso = jalaliToISO(view.jy, view.jm, day);
    if (minISO && iso < minISO) return;
    onChange(iso);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card }]}>
      <View style={styles.navRow}>
        <Pressable
          accessibilityLabel="ماه قبل"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setView(prevJalaliMonth(view.jy, view.jm))}
        >
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        <AppText size="md" weight="semiBold">
          {`${JALALI_MONTHS[view.jm - 1]} ${digitsToPersian(String(view.jy))}`}
        </AppText>
        <Pressable
          accessibilityLabel="ماه بعد"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setView(nextJalaliMonth(view.jy, view.jm))}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
          <View key={d} style={styles.weekCell}>
            <AppText size="xs" color={colors.textSecondary} align="center">
              {d}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => (
          <View key={i} style={styles.dayCell}>
            {day != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={jalaliToISO(view.jy, view.jm, day)}
                onPress={() => pick(day)}
                style={[
                  styles.day,
                  selected.jy === view.jy && selected.jm === view.jm && selected.jd === day && { backgroundColor: colors.primary },
                ]}
              >
                <AppText
                  size="sm"
                  weight={selected.jy === view.jy && selected.jm === view.jm && selected.jd === day ? "bold" : "regular"}
                  color={selected.jy === view.jy && selected.jm === view.jm && selected.jd === day ? colors.onPrimary : colors.text}
                  align="center"
                >
                  {digitsToPersian(String(day))}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  navRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  weekRow: { flexDirection: "row-reverse" },
  weekCell: { flex: 1, alignItems: "center" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 2 },
  day: {
    ...touchTarget,
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
