/**
 * پشتیبان‌گیری و بازیابی — فایل JSON نسخه‌بندی‌شده شامل داده و رسیدها.
 * اعتبارسنجی کامل پیش از جایگزینی + پشتیبان احتیاطی؛ فایل خراب داده را تخریب نمی‌کند.
 */
import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { DownloadCloud, UploadCloud, ShieldAlert } from "lucide-react-native";
import { Screen, AppText, PrimaryButton, SuccessBanner } from "@/components";
import { getAppDb } from "@/db/client";
import { buildBackup, validateBackup, restoreBackup, type BackupPayload } from "@/lib/backup";
import { attachments } from "@/db/schema";
import { readReceiptBase64, writeReceiptFile, RECEIPTS_DIR } from "@/lib/files";
import { nowISODateTime } from "@/lib/dates";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/theme";

export default function BackupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportBackup = useCallback(async () => {
    setBusy(true);
    try {
      const db = getAppDb().db;
      const receipts = db.select().from(attachments).all().map((a) => ({ id: a.id, uri: a.uri, fileName: a.fileName }));
      const encoded: { fileName: string; base64: string }[] = [];
      for (const r of receipts) {
        try {
          encoded.push({ fileName: r.fileName, base64: await readReceiptBase64(r.uri) });
        } catch {
          // رسید غایب در فایل نادیده گرفته می‌شود و در گزارش شمارش می‌آید
        }
      }
      const payload = buildBackup(db, encoded, nowISODateTime());
      const fileUri = `${FileSystem.cacheDirectory}hesabyar-backup-${payload.exportedAt.replace(/[:.]/g, "-")}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/json", dialogTitle: "پشتیبان حساب‌یار" });
      }
      setMessage(`پشتیبان ساخته شد: ${payload.counts.transactions ?? 0} تراکنش، ${payload.counts.loans ?? 0} وام، ${payload.counts.persons ?? 0} شخص، ${encoded.length} رسید`);
    } finally {
      setBusy(false);
    }
  }, []);

  const importBackup = useCallback(async () => {
    setBusy(true);
    try {
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (pick.canceled || pick.assets.length === 0) return;
      const file = pick.assets[0]!;
      const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });

      // ۱) اعتبارسنجی کامل پیش از هر تغییری
      let payload: BackupPayload;
      try {
        payload = validateBackup(raw);
      } catch (e) {
        Alert.alert("فایل نامعتبر", e instanceof Error ? e.message : "فایل پشتیبان قابل پذیرش نیست. دادهٔ موجود دست‌نخورده ماند.");
        return;
      }

      // ۲) پشتیبان احتیاطی از وضعیت فعلی
      const db = getAppDb().db;
      const safety = buildBackup(db, [], nowISODateTime());
      const safetyUri = `${FileSystem.cacheDirectory}hesabyar-safety-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(safetyUri, JSON.stringify(safety), { encoding: FileSystem.EncodingType.UTF8 });

      // ۳) بازیابی اتمیک + بازگرداندن رسیدها
      const result = restoreBackup(db, payload);
      let receiptsRestored = 0;
      for (const r of payload.receipts) {
        try {
          await writeReceiptFile(`${RECEIPTS_DIR}${r.fileName}`, r.base64);
          receiptsRestored += 1;
        } catch {
          // ادامه؛ رسیدها جدایی از دادهٔ مالی هستند
        }
      }
      // ۴) بازسازی اعلان‌ها در بازشدن بعدی اپ (listeners) — پیام راهنما
      setMessage(
        `بازیابی شد: ${result.counts.transactions ?? 0} تراکنش، ${result.counts.loans ?? 0} وام، ${result.counts.persons ?? 0} شخص، ${receiptsRestored} رسید. پشتیبان احتیاطی از دادهٔ قبلی ذخیره شد. اعلان‌ها با باز شدن دوبارهٔ اپ بازسازی می‌شوند.`
      );
      Alert.alert("بازیابی کامل شد", "برای بازسازی یادآوری‌ها، اپ را یک بار ببندید و باز کنید.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Screen title="پشتیبان‌گیری و بازیابی" subtitle="فایل JSON نسخه‌بندی‌شده" onBack={() => router.back()} scroll>
      <View style={[s.note, { backgroundColor: colors.warningSoft }]}>
        <ShieldAlert size={18} color={colors.warning} />
        <AppText size="xs" color={colors.warning} style={{ flex: 1, lineHeight: 18 }}>
          فایل پشتیبان حساب‌یار رمزگذاری نمی‌شود؛ آن را در جای امن نگه دارید. بازیابی دادهٔ فعلی را جایگزین می‌کند اما پیش از آن پشتیبان احتیاطی ساخته می‌شود و فایل خراب هرگز دادهٔ موجود را تخریب نمی‌کند.
        </AppText>
      </View>
      <PrimaryButton label="ساخت و اشتراک‌گذاری پشتیبان" icon={<DownloadCloud size={18} color={colors.onPrimary} />} onPress={() => void exportBackup()} loading={busy} />
      <PrimaryButton label="بازیابی از فایل" variant="soft" icon={<UploadCloud size={18} color={colors.primaryDark} />} onPress={() => void importBackup()} loading={busy} />
      {message ? <SuccessBanner message={message} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  note: { flexDirection: "row-reverse", gap: spacing.sm, borderRadius: 12, padding: 12, alignItems: "flex-start" },
});
