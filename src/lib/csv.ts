// CSV that Excel opens correctly: a byte order mark so accents survive,
// CRLF line ends, every field quoted when it needs to be.

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // A leading = + - or @ makes a spreadsheet run the cell as a formula.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const BOM = String.fromCharCode(0xfeff);

export function toCsv(headers: string[], rows: unknown[][]) {
  return BOM + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
