export type CsvValue = string | number | boolean | null | undefined;

export function encodeCsv(headers: CsvValue[], rows: CsvValue[][]): string {
  const escape = (value: CsvValue) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, headers: CsvValue[], rows: CsvValue[][]): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const csv = "\uFEFF" + encodeCsv(headers, rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
