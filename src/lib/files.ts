/**
 * مدیریت رسیدها در فضای پایدار (documentDirectory/receipts)
 * و ساخت HTML رسید/PDF فارسی RTL برای expo-print.
 */
import * as FileSystem from "expo-file-system/legacy";
import { formatJalali, nowISODateTime } from "./dates";
import { digitsToPersian } from "./persian";
import { formatMoney } from "./format";
import type { DisplayUnit } from "./money";

export const RECEIPTS_DIR = `${FileSystem.documentDirectory ?? ""}receipts/`;

export async function ensureReceiptsDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  return RECEIPTS_DIR;
}

/** کپی رسید انتخاب‌شده به فضای پایدار و برگرداندن مسیر جدید */
export async function persistReceipt(sourceUri: string, txnId: number): Promise<{ uri: string; fileName: string }> {
  await ensureReceiptsDir();
  const ext = sourceUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `txn-${txnId}-${Date.now()}.${["jpg", "jpeg", "png", "pdf"].includes(ext) ? ext : "jpg"}`;
  const dest = `${RECEIPTS_DIR}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return { uri: dest, fileName };
}

export async function deleteReceiptFile(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function readReceiptBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function writeReceiptFile(destUri: string, base64: string): Promise<void> {
  await ensureReceiptsDir();
  await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
}

// ---------- HTML رسید و گزارش (RTL فارسی) ----------

function fontCss(): string {
  return `
    @font-face { font-family: Vazirmatn; src: local('Vazirmatn'), local('Tahoma'); }
    body { font-family: Vazirmatn, Tahoma, sans-serif; direction: rtl; text-align: right; }
  `;
}

export interface ReceiptHtmlInput {
  txnId: number;
  kind: "pay" | "receive";
  amount: number;
  date: string;
  recordedAt: string;
  method: string;
  targetTitle: string;
  note?: string | null;
  unit: DisplayUnit;
}

const METHOD_FA: Record<string, string> = {
  cash: "نقدی",
  card: "کارت‌به‌کارت",
  transfer: "انتقال بانکی",
  other: "سایر",
};

/** HTML رسید — محتوای فارسی RTL؛ چاپ با expo-print روی دستگاه انجام می‌شود */
export function receiptHtml(input: ReceiptHtmlInput, generatedAt = nowISODateTime()): string {
  const isReceive = input.kind === "receive";
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8" /><style>
  ${fontCss()}
  body { margin: 0; padding: 32px; background: #F6F8FA; color: #142223; }
  .card { background: #fff; border-radius: 16px; padding: 24px; max-width: 520px; margin: 0 auto; }
  .head { text-align: center; border-bottom: 1px solid #E7ECEB; padding-bottom: 16px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 700; color: #087F6D; }
  .kind { margin-top: 6px; font-size: 14px; color: ${isReceive ? "#087F6D" : "#D45B65"}; font-weight: 600; }
  .amount { text-align: center; font-size: 30px; font-weight: 800; margin: 12px 0 4px; }
  .unit { text-align: center; color: #718080; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 4px; font-size: 13px; border-bottom: 1px solid #F0F3F2; }
  td.k { color: #718080; width: 40%; }
  td.v { font-weight: 600; }
  .foot { margin-top: 18px; text-align: center; color: #718080; font-size: 11px; }
</style></head>
<body><div class="card">
  <div class="head"><div class="brand">حساب‌یار</div><div class="kind">رسید ${isReceive ? "دریافت" : "پرداخت"}</div></div>
  <div class="amount">${digitsToPersian(formatMoney(input.amount, input.unit))}</div>
  <div class="unit">${input.unit === "toman" ? "تومان" : "ریال"}</div>
  <table>
    <tr><td class="k">شرح</td><td class="v">${escapeHtml(input.targetTitle)}</td></tr>
    <tr><td class="k">تاریخ عملیات</td><td class="v">${formatJalali(input.date)}</td></tr>
    <tr><td class="k">روش</td><td class="v">${METHOD_FA[input.method] ?? escapeHtml(input.method)}</td></tr>
    <tr><td class="k">زمان ثبت</td><td class="v">${digitsToPersian(input.recordedAt.replace("T", " "))}</td></tr>
    <tr><td class="k">شماره تراکنش</td><td class="v">${digitsToPersian(String(input.txnId))}</td></tr>
    ${input.note ? `<tr><td class="k">توضیح</td><td class="v">${escapeHtml(input.note)}</td></tr>` : ""}
  </table>
  <div class="foot">ساخته‌شده در حساب‌یار • ${digitsToPersian(generatedAt.replace("T", " "))}</div>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
