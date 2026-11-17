/**
 * CSV فارسی سازگار با Excel — با BOM UTF-8 تحویل می‌شود (پسوند .csv، نه xlsx).
 */

export interface CsvColumn {
  header: string;
  value: (row: Record<string, unknown>) => string;
}

function escapeCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function buildCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(",")).join("\r\n");
  return "\uFEFF" + (body ? `${header}\r\n${body}` : header);
}
