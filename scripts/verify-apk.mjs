#!/usr/bin/env node
/**
 * بررسی محلی APK: وجود، اندازه، checksum — همان بررسی‌های workflow.
 * استفاده: node scripts/verify-apk.mjs path/to/app-release.apk
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const apk = process.argv[2];
if (!apk || !fs.existsSync(apk)) {
  console.error("استفاده: node scripts/verify-apk.mjs <path/to/app-release.apk>");
  process.exit(1);
}

const stat = fs.statSync(apk);
if (stat.size < 1_000_000) {
  console.error(`APK بسیار کوچک است (${stat.size} bytes) — احتمالاً خراب است`);
  process.exit(1);
}

const sha256 = crypto.createHash("sha256").update(fs.readFileSync(apk)).digest("hex");
console.log(`APK: ${apk}`);
console.log(`Size: ${stat.size} bytes`);
console.log(`SHA-256: ${sha256}`);

// بررسی امضا اگر apksigner در PATH باشد
try {
  const out = execSync(`apksigner verify --verbose "${apk}" 2>&1 || true`, { encoding: "utf8" });
  if (out.includes("Verified")) {
    console.log("امضا: تأیید شد");
    console.log(out.split("\n").slice(0, 10).join("\n"));
  } else {
    console.log("امضا: apksigner تأیید نکرد — خروجی:");
    console.log(out);
  }
} catch {
  console.log("(apksigner در PATH نیست — امضا در CI بررسی می‌شود)");
}
