/**
 * کامپوننت‌های مشترک حساب‌یار — یکدستی ظاهر و لمس.
 */
import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AlertTriangle, CheckCircle2, ChevronLeft, X } from "lucide-react-native";
import { radius, spacing, typography, touchTarget } from "@/theme";
import { useTheme } from "@/hooks/useTheme";
import { formatMoney, unitLabel } from "@/lib/format";
import { digitsToPersian } from "@/lib/persian";
import { useUiStore } from "@/store/ui-store";

// ---------- Screen ----------
export function Screen({
  children,
  title,
  subtitle,
  onBack,
  scroll = true,
  style,
}: {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }, style]} edges={["top", "left", "right"]}>
      {(title || onBack) && (
        <View style={styles.header}>
          {onBack ? (
            <Pressable
              accessibilityLabel="بازگشت"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <ChevronLeft size={24} color={colors.text} style={styles.backIconRtl} />
            </Pressable>
          ) : null}
          <View style={styles.headerTexts}>
            {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

// ---------- AppText ----------
export function AppText({
  children,
  size = "md",
  weight = "regular",
  color,
  align,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "display";
  weight?: "regular" | "medium" | "semiBold" | "bold";
  color?: string;
  align?: "center" | "right" | "left";
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  const sizeMap: Record<string, number> = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 30,
  };
  const weightMap: Record<string, TextStyle["fontWeight"]> = {
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
  };
  const fontMap: Record<string, string> = {
    regular: typography.fontRegular,
    medium: typography.fontMedium,
    semiBold: typography.fontSemiBold,
    bold: typography.fontBold,
  };
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: sizeMap[size],
          fontWeight: weightMap[weight],
          fontFamily: fontMap[weight],
          color: color ?? colors.text,
          textAlign: align ?? "right",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------- PrimaryButton ----------
export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "soft" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "soft"
          ? colors.primarySoft
          : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? colors.onPrimary
      : variant === "soft"
        ? colors.primaryDark
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        if (!reduceMotion) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonLabel, { color: fg, fontFamily: typography.fontSemiBold }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- IconButton ----------
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  variant = "ghost",
  danger,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: "ghost" | "soft";
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        variant === "soft" && { backgroundColor: colors.primarySoft },
        danger && { backgroundColor: colors.dangerSoft },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ---------- FinancialCard ----------
export function FinancialCard({
  title,
  amount,
  currency = true,
  tone = "neutral",
  sub,
  right,
  onPress,
  style,
}: {
  title: string;
  amount?: number | null;
  currency?: boolean;
  tone?: "neutral" | "positive" | "negative" | "warning";
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const toneColor =
    tone === "positive"
      ? colors.primary
      : tone === "negative"
        ? colors.danger
        : tone === "warning"
          ? colors.warning
          : colors.text;
  const Body = (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      <View style={styles.cardHead}>
        <AppText size="sm" weight="medium" color={colors.textSecondary}>
          {title}
        </AppText>
        {right}
      </View>
      {amount != null ? (
        <View style={styles.cardAmountRow}>
          <AppText size="display" weight="bold" color={toneColor} numberOfLines={1} style={styles.amountBig}>
            {formatMoney(amount, unit)}
          </AppText>
          {currency ? (
            <AppText size="sm" color={colors.textSecondary} style={styles.unit}>
              {unitLabel(unit)}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {sub ? (
        <AppText size="xs" color={colors.textSecondary} style={styles.cardSub}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
  if (!onPress) return Body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      {Body}
    </Pressable>
  );
}

// ---------- MoneyText ----------
export function MoneyText({ rial, tone, size = "lg", weight = "bold" }: { rial: number; tone?: "positive" | "negative" | "neutral"; size?: "md" | "lg" | "xl"; size2?: never; weight?: "medium" | "bold" | "semiBold" }) {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const color = tone === "positive" ? colors.primary : tone === "negative" ? colors.danger : colors.text;
  return (
    <View style={styles.moneyRow}>
      <AppText size={size === "md" ? "lg" : size === "lg" ? "xl" : "xxl"} weight={weight === "bold" ? "bold" : weight === "semiBold" ? "semiBold" : "medium"} color={color} numberOfLines={1}>
        {formatMoney(rial, unit)}
      </AppText>
      <AppText size="xs" color={colors.textSecondary}>
        {unitLabel(unit)}
      </AppText>
    </View>
  );
}

// ---------- AmountInput ----------
export function AmountInput({
  value,
  onChangeText,
  error,
  placeholder = "مثلاً ۱,۵۰۰,۰۰۰",
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  return (
    <View>
      <View style={[styles.amountInput, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.divider }]}>
        <TextInput
          accessibilityLabel="مبلغ"
          style={[styles.amountInputText, { color: colors.text, fontFamily: typography.fontBold }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          textAlign="right"
        />
        <AppText size="sm" weight="medium" color={colors.textSecondary}>
          {unitLabel(unit)}
        </AppText>
      </View>
      {error ? (
        <AppText size="xs" color={colors.danger} style={styles.fieldError}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ---------- StatusBadge ----------
export function StatusBadge({ status }: { status: "unpaid" | "partial" | "settled" | "overdue" }) {
  const { colors } = useTheme();
  const map = {
    unpaid: { label: "پرداخت‌نشده", bg: colors.skeleton, fg: colors.textSecondary, icon: "○" },
    partial: { label: "پرداخت جزئی", bg: colors.warningSoft, fg: colors.warning, icon: "◐" },
    settled: { label: "تسویه‌شده", bg: colors.successSoft, fg: colors.primaryDark, icon: "●" },
    overdue: { label: "عقب‌افتاده", bg: colors.dangerSoft, fg: colors.danger, icon: "▲" },
  } as const;
  const s = map[status];
  // رنگ تنها روش تشخیص نیست: آیکون متنی و برچسب همراه است
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <AppText size="xs" weight="medium" color={s.fg}>
        {`${s.icon} ${s.label}`}
      </AppText>
    </View>
  );
}

// ---------- FormField ----------
export function FormField({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.formField}>
      <AppText size="sm" weight="medium">
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </AppText>
      {children}
      {hint && !error ? (
        <AppText size="xs" color={colors.textSecondary}>
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <AppText size="xs" color={colors.danger} style={styles.fieldError}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  error,
  keyboardType,
  accessibilityLabel,
  autoFocus,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  accessibilityLabel?: string;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={[
          styles.textField,
          multiline && styles.textFieldMultiline,
          { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.divider, color: colors.text, fontFamily: typography.fontRegular },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error ? (
        <AppText size="xs" color={colors.danger} style={styles.fieldError}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ---------- EmptyState ----------
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <AppText size="xxl" weight="bold" color={colors.primaryDark}>
          ح
        </AppText>
      </View>
      <AppText size="lg" weight="semiBold" align="center">
        {title}
      </AppText>
      <AppText size="sm" color={colors.textSecondary} align="center" style={styles.emptyDesc}>
        {description}
      </AppText>
      {action}
    </View>
  );
}

// ---------- ErrorState ----------
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <AlertTriangle size={26} color={colors.danger} />
      </View>
      <AppText size="md" weight="semiBold" align="center" color={colors.danger}>
        {message}
      </AppText>
      {onRetry ? (
        <PrimaryButton label="تلاش دوباره" variant="soft" onPress={onRetry} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

// ---------- SuccessBanner ----------
export function SuccessBanner({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
      <CheckCircle2 size={18} color={colors.primaryDark} />
      <AppText size="sm" weight="medium" color={colors.primaryDark} style={styles.bannerText}>
        {message}
      </AppText>
    </View>
  );
}

// ---------- ConfirmDialog ----------
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "تأیید",
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={[styles.dialog, { backgroundColor: colors.card }]}>
        <View style={styles.dialogHead}>
          <AppText size="lg" weight="semiBold">
            {title}
          </AppText>
          <IconButton accessibilityLabel="بستن" onPress={onCancel}>
            <X size={20} color={colors.textSecondary} />
          </IconButton>
        </View>
        <AppText size="sm" color={colors.textSecondary} style={styles.dialogMsg}>
          {message}
        </AppText>
        <View style={styles.dialogActions}>
          <PrimaryButton label="انصراف" variant="ghost" onPress={onCancel} style={styles.dialogBtn} />
          <PrimaryButton
            label={confirmLabel}
            variant={danger ? "danger" : "primary"}
            onPress={onConfirm}
            style={styles.dialogBtn}
          />
        </View>
      </View>
    </View>
  );
}

// ---------- TransactionItem ----------
export function TransactionItem({
  kind,
  amount,
  dateJalali,
  method,
  note,
  onPress,
}: {
  kind: "pay" | "receive";
  amount: number;
  dateJalali: string;
  method: string;
  note?: string | null;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const unit = useUiStore((s) => s.unit);
  const isReceive = kind === "receive";
  const methodMap: Record<string, string> = {
    cash: "نقدی",
    card: "کارت‌به‌کارت",
    transfer: "انتقال بانکی",
    other: "سایر",
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`تراکنش ${isReceive ? "دریافت" : "پرداخت"} ${formatMoney(amount, unit)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.txnItem,
        { backgroundColor: colors.card },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.txnDot, { backgroundColor: isReceive ? colors.primarySoft : colors.dangerSoft }]}>
        <AppText size="sm" weight="bold" color={isReceive ? colors.primaryDark : colors.danger}>
          {isReceive ? "↓" : "↑"}
        </AppText>
      </View>
      <View style={styles.txnTexts}>
        <AppText size="md" weight="semiBold">
          {isReceive ? "دریافت" : "پرداخت"}
        </AppText>
        <AppText size="xs" color={colors.textSecondary} numberOfLines={1}>
          {`${methodMap[method] ?? method} • ${dateJalali}${note ? ` • ${note}` : ""}`}
        </AppText>
      </View>
      <View style={styles.txnAmount}>
        <AppText size="md" weight="bold" color={isReceive ? colors.primaryDark : colors.danger} numberOfLines={1}>
          {`${isReceive ? "+" : "−"} ${formatMoney(amount, unit)}`}
        </AppText>
      </View>
    </Pressable>
  );
}

// ---------- ListRow ----------
export function ListRow({
  title,
  sub,
  right,
  onPress,
  badge,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  badge?: ReactNode;
}) {
  const { colors } = useTheme();
  const Row = (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      <View style={styles.rowTexts}>
        <View style={styles.rowTitleLine}>
          <AppText size="md" weight="semiBold" numberOfLines={1}>
            {title}
          </AppText>
          {badge}
        </View>
        {sub ? (
          <AppText size="xs" color={colors.textSecondary} numberOfLines={2}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <ChevronLeft size={18} color={colors.textSecondary} style={styles.backIconRtl} /> : null}
    </View>
  );
  if (!onPress) return Row;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      {Row}
    </Pressable>
  );
}

// ---------- PersianDigits helper for counters ----------
export function PersianNumber(n: number | string): string {
  return digitsToPersian(String(n));
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTexts: { flex: 1, alignItems: "flex-start" },
  title: { fontSize: 20, fontWeight: "700", fontFamily: typography.fontBold },
  subtitle: { fontSize: 12, fontFamily: typography.fontRegular, marginTop: 2 },
  backBtn: { ...touchTarget, justifyContent: "center", alignItems: "center" },
  backIconRtl: { transform: [{ scaleX: -1 }] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.md },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: 15 },
  iconButton: {
    ...touchTarget,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  cardAmountRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: spacing.xs, flexWrap: "wrap" },
  amountBig: { flexShrink: 1 },
  unit: { paddingBottom: 6 },
  cardSub: { marginTop: 2 },
  moneyRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: spacing.xs },
  amountInput: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  amountInputText: { flex: 1, fontSize: 22, paddingVertical: spacing.md, textAlign: "right" },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, alignSelf: "flex-start" },
  formField: { gap: spacing.xs },
  fieldError: { marginTop: 2 },
  textField: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    fontSize: 15,
    textAlign: "right",
  },
  textFieldMultiline: { minHeight: 96, paddingTop: spacing.md },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  emptyDesc: { paddingHorizontal: spacing.xl },
  emptyAction: { minWidth: 160, marginTop: spacing.sm },
  banner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: { flex: 1 },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(20,34,35,0.45)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  dialogHead: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  dialogMsg: { lineHeight: 22 },
  dialogActions: { flexDirection: "row-reverse", gap: spacing.sm },
  dialogBtn: { flex: 1 },
  txnItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  txnDot: { width: 40, height: 40, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  txnTexts: { flex: 1, gap: 2 },
  txnAmount: { alignItems: "flex-start" },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowTexts: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
});
