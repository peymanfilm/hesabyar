/**
 * پیکربندی Expo — نسخه از متغیر محیطی CI خوانده می‌شود و در حالت عادی به app.json برمی‌گردد.
 * تنظیمات بومی کاملاً قابل بازتولید با `expo prebuild --clean` است؛
 * هیچ تغییر دستی گم‌شونده در android تولیدشده وجود ندارد.
 */
const base = require("./app.json");

module.exports = {
  ...base.expo,
  version: process.env.APP_VERSION ?? base.expo.version,
  android: {
    ...base.expo.android,
    versionCode:
      process.env.APP_VERSION_CODE != null && !Number.isNaN(Number(process.env.APP_VERSION_CODE))
        ? Number(process.env.APP_VERSION_CODE)
        : base.expo.android.versionCode,
  },
  plugins: [
    [
      "expo-router",
      { root: "./app" },
    ],
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
};
