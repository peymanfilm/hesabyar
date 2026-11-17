/**
 * پل دستگاه اعلان‌ها — فقط این فایل expo-notifications را لمس می‌کند.
 * پلن‌ها از lib/notifications.ts (خالص و تست‌شده) می‌آیند؛
 * تایمر JavaScript استفاده نمی‌شود؛ زمان‌بندی توسط OS انجام می‌شود.
 */
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import { capPlans, type ReminderPlan } from "./notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "یادآوری سررسیدها",
    importance: AndroidImportance.HIGH,
    lightColor: "#087F6D",
    vibrationPattern: [0, 220, 120, 220],
  });
  await Notifications.setNotificationChannelAsync("overdue", {
    name: "عقب‌افتادگی‌ها",
    importance: AndroidImportance.HIGH,
    lightColor: "#D45B65",
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** زمان‌بندی همگام: همهٔ اعلان‌های قبلی لغو و پلن جدید درج می‌شود (بدون تکرار) */
export async function syncScheduledNotifications(plans: ReminderPlan[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const capped = capPlans(plans);
  let scheduled = 0;
  for (const p of capped) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: p.title,
        body: p.body,
        sound: "default",
        data: { url: p.url, notifId: p.notifId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: p.fireAtEpoch,
        channelId: p.notifId.startsWith("overdue") ? "overdue" : "reminders",
      } as Notifications.DateTriggerInput,
      identifier: p.notifId,
    });
    scheduled += 1;
  }
  return scheduled;
}

export async function scheduleOne(plan: ReminderPlan): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body,
      sound: "default",
      data: { url: plan.url, notifId: plan.notifId, snoozed: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.fireAtEpoch,
      channelId: "reminders",
    } as Notifications.DateTriggerInput,
    identifier: plan.notifId,
  });
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
