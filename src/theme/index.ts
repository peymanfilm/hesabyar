/**
 * سیستم طراحی حساب‌یار — پالت روشن و تاریک مستقل.
 * فاصله‌گذاری مبتنی بر ۴ و ۸؛ رنگ تنها روش تشخیص وضعیت نیست (آیکون/متن همراه است).
 */
export const palette = {
  light: {
    background: "#F6F8FA",
    card: "#FFFFFF",
    text: "#142223",
    textSecondary: "#718080",
    primary: "#087F6D",
    primaryDark: "#07594E",
    primarySoft: "#E8F5F0",
    onPrimary: "#FFFFFF",
    warning: "#D59B32",
    warningSoft: "#FBF1DF",
    danger: "#D45B65",
    dangerSoft: "#FBE9EA",
    divider: "#E7ECEB",
    success: "#087F6D",
    successSoft: "#E8F5F0",
    skeleton: "#E7ECEB",
    tabBar: "#FFFFFF",
  },
  dark: {
    background: "#0F1415",
    card: "#1A2123",
    text: "#E9EFEE",
    textSecondary: "#8FA3A0",
    primary: "#2FA892",
    primaryDark: "#1F7A68",
    primarySoft: "#12332D",
    onPrimary: "#062A24",
    warning: "#E0A94C",
    warningSoft: "#3A2E14",
    danger: "#E0737C",
    dangerSoft: "#3A2224",
    divider: "#24302F",
    success: "#2FA892",
    successSoft: "#12332D",
    skeleton: "#24302F",
    tabBar: "#141B1C",
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  fontRegular: "Vazirmatn-Regular",
  fontMedium: "Vazirmatn-Medium",
  fontSemiBold: "Vazirmatn-SemiBold",
  fontBold: "Vazirmatn-Bold",
} as const;

export const elevation = {
  card: {
    shadowColor: "#142223",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: "#07594E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const touchTarget = { minWidth: 44, minHeight: 44 } as const;
