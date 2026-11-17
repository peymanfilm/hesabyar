/**
 * اعتبارسنجی ورودی‌ها با Zod — اسکیماهای مشترک فرم‌ها و فایل پشتیبان.
 */
import { z } from "zod";
import { MAX_RIAL } from "./money";
import { isISODate } from "./dates";

export const titleSchema = z
  .string()
  .trim()
  .min(1, "عنوان الزامی است")
  .max(120, "عنوان بیش از حد طولانی است");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "نام الزامی است")
  .max(80, "نام بیش از حد طولانی است");

export const optionalText = z
  .string()
  .trim()
  .max(500, "متن بیش از حد طولانی است")
  .nullish()
  .transform((v) => (v === "" || v == null ? undefined : v));

export const isoDateSchema = z
  .string()
  .refine((v) => isISODate(v), "تاریخ نامعتبر است");

export const optionalIsoDate = isoDateSchema.nullable().optional();

export const rialInt = z
  .number()
  .int("مبلغ باید عدد صحیح ریال باشد")
  .gt(0, "مبلغ باید بزرگ‌تر از صفر باشد")
  .lte(MAX_RIAL, "مبلغ خارج از محدودهٔ مجاز است");

export const personFormSchema = z.object({
  name: nameSchema,
  phone: z
    .string()
    .trim()
    .max(20, "شماره تماس نامعتبر است")
    .regex(/^[0-9+]*$/, "شماره تماس فقط شامل رقم است")
    .optional()
    .or(z.literal("")),
  note: optionalText,
});

export const accountFormSchema = z.object({
  title: titleSchema,
  kind: z.enum(["receivable", "debt"]),
  personId: z.number().int().positive().nullable(),
  initialAmount: rialInt,
  createdDate: isoDateSchema,
  dueDate: optionalIsoDate,
  settleMode: z.enum(["lump", "installment", "irregular"]),
  note: optionalText,
});

export const loanFormSchema = z
  .object({
    title: titleSchema,
    bank: optionalText,
    principal: rialInt,
    totalRepay: rialInt.nullable().optional(),
    installmentCount: z.number().int().gt(0, "تعداد اقساط باید بزرگ‌تر از صفر باشد").lte(360, "حداکثر ۳۶۰ قسط"),
    installmentAmount: rialInt,
    firstDueDate: isoDateSchema,
    scheduleMode: z.enum(["monthly", "manual"]),
    contractNo: optionalText,
    note: optionalText,
  })
  .refine(
    (v) =>
      v.totalRepay == null ||
      v.totalRepay >= v.installmentAmount * v.installmentCount,
    { message: "کل بازپرداخت نباید کمتر از جمع اقساط باشد", path: ["totalRepay"] }
  );

export const transactionFormSchema = z.object({
  kind: z.enum(["pay", "receive"]),
  amount: rialInt,
  date: isoDateSchema,
  method: z.enum(["cash", "card", "transfer", "other"]),
  note: optionalText,
});

export const reminderSchema = z.object({
  daysBefore: z.number().int().min(0).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "ساعت نامعتبر است"),
  enabled: z.boolean(),
});

export type PersonForm = z.input<typeof personFormSchema>;
export type AccountForm = z.input<typeof accountFormSchema>;
export type LoanForm = z.input<typeof loanFormSchema>;
export type TransactionForm = z.input<typeof transactionFormSchema>;

/** تبدیل خطاهای zod به دیکشنری پیام فارسی برای نمایش در فرم */
export function zodMessages(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
