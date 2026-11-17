/**
 * پیکربندی Expo — تنها منبع پیکربندی (app.json حذف شد تا تعارض اعتبارسنجی پیش نیاید).
 * نسخه از متغیر محیطی CI خوانده می‌شود و در حالت عادی به مقدار پیش‌فرض برمی‌گردد.
 * تنظیمات بومی کاملاً قابل بازتولید با `expo prebuild --clean` است.
 */
const APP_VERSION_FALLBACK = "1.0.0";

module.exports = {
  name: "حساب‌یار",
  slug: "hesabyar",
  scheme: "hesabyar",
  version: process.env.APP_VERSION ?? APP_VERSION_FALLBACK,
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  icon: "./assets/images/icon.png",
  backgroundColor: "#F6F8FA",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F6F8FA",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.peymanfilm.hesabyar",
    buildNumber: "1",
  },
  android: {
    package: "com.peymanfilm.hesabyar",
    versionCode:
      process.env.APP_VERSION_CODE != null && !Number.isNaN(Number(process.env.APP_VERSION_CODE))
        ? Number(process.env.APP_VERSION_CODE)
        : 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#087F6D",
    },
    softwareKeyboardLayoutMode: "resize",
    permissions: [
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.VIBRATE",
    ],
  },
  plugins: [
    ["expo-router", { root: "./app" }],
    "expo-font",
    [
      "expo-notifications",
      {
        color: "#087F6D",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F6F8FA",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
      },
    ],
    "expo-local-authentication",
    "expo-sqlite",
    "./plugins/with-signed-release.js",
  ],
  extra: {
    router: {},
    eas: { projectId: "" },
  },
};
