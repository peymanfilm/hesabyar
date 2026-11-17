// ESLint با تنظیمات Expo (SDK 58) — قواعد strict برای TS
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "node_modules/*",
      "android/*",
      "ios/*",
      ".expo/*",
      // اسکریپت‌های CLI مخزن (node scripts) — console بخشی از عملکرد آن‌هاست
      "scripts/**/*.mjs",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);
