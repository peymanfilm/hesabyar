#!/usr/bin/env node
/**
 * ارتقای نسخهٔ اپ: به‌روزرسانی app.json و ساخت tag.
 * versionCode عددی و افزایشی (هرگز برای نسخهٔ جدید استفادهٔ مجدد نمی‌شود).
 * استفاده: node scripts/bump-version.mjs 1.0.1
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("استفاده: node scripts/bump-version.mjs X.Y.Z");
  process.exit(1);
}

const appJsonPath = new URL("../app.json", import.meta.url).pathname;
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

const prevVersion = appJson.expo.version;
const prevCode = Number(appJson.expo.android.versionCode ?? 1);

// versionCode جدید باید از قبلی بزرگ‌تر باشد؛ از تاریخ UTC مشتق می‌شود
const now = new Date();
const candidate = now.getUTCFullYear() * 100000 + (now.getUTCMonth() + 1) * 3000 + now.getUTCDate() * 100;
const versionCode = Math.max(candidate, prevCode + 1);

appJson.expo.version = version;
appJson.expo.android.versionCode = versionCode;
if (appJson.expo.ios) appJson.expo.ios.buildNumber = String(versionCode);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

console.log(`version: ${prevVersion} → ${version}`);
console.log(`versionCode: ${prevCode} → ${versionCode}`);
console.log("");
console.log("گام‌های بعدی:");
console.log("  git commit -am 'bump version " + version + "'");
console.log("  git tag v" + version);
console.log("  git push origin main v" + version + "  # release workflow با tag اجرا می‌شود");
