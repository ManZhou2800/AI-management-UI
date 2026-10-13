import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Cell = string | number | boolean | null | undefined;
export type Sheet = { name: string; rows: Cell[][] };
export type ExportFormat = "xlsx" | "csv" | "pdf" | "json";
export const FORMATS: { v: ExportFormat; label: string; hint: string }[] = [
  { v: "xlsx", label: "Excel", hint: ".xlsx，多个工作表" },
  { v: "csv", label: "CSV", hint: "通用表格，可用 WPS / Excel 打开" },
  { v: "pdf", label: "PDF", hint: "打开打印窗口，选择「另存为 PDF」" },
  { v: "json", label: "JSON", hint: "给技术同事做数据对接" },
];

export const nowStamp = () => {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
const str = (c: Cell) => (c === true ? "是" : c === false ? "否" : c == null ? "" : String(c));
const esc = (s: string) => s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]!);

export async function exportSheets(sheets: Sheet[], base: string, format: ExportFormat, title = base) {
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => {
      const ws = XLSX.utils.aoa_to_sheet(s.rows.map((r) => r.map((c) => (typeof c === "number" ? c : str(c)))));
      ws["!cols"] = (s.rows[0] || []).map((_, i) => ({ wch: Math.min(40, Math.max(8, ...s.rows.map((r) => str(r[i]).length * 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${base}.xlsx`);
  }
  if (format === "csv") {
    const text = sheets.map((s) => [[`【${s.name}】`], ...s.rows].map((r) => r.map((c) => `"${str(c).replace(/"/g, '""')}"`).join(",")).join("\n")).join("\n\n");
    return download(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
  }
  if (format === "json") {
    const data = Object.fromEntries(sheets.map((s) => {
      const [head = [], ...body] = s.rows;
      return [s.name, body.map((r) => Object.fromEntries(head.map((h, i) => [str(h) || `列${i + 1}`, r[i] ?? ""])))];
    }));
    return download(new Blob([JSON.stringify({ title, exported_at: nowStamp(), ...data }, null, 2)], { type: "application/json" }), `${base}.json`);
  }
  // PDF: print-ready page (keeps Chinese text perfectly); user picks "另存为 PDF".
  const w = window.open("", "_blank");
  if (!w) throw new Error("浏览器拦截了弹窗，请允许后重试");
  const tables = sheets.map((s) => {
    const [head = [], ...body] = s.rows;
    return `<h2>${esc(s.name)}</h2><table><thead><tr>${head.map((h) => `<th>${esc(str(h))}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(str(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(base)}</title><style>
    @page{size:A4;margin:12mm}body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#1b2a4a;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    h1{font-size:18px;margin:0}p.m{color:#667;margin:4px 0 14px}h2{font-size:13px;margin:18px 0 6px;color:#163a78}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9dde6;padding:4px 6px;text-align:left}th{background:#eef1f7}tr{break-inside:avoid}
  </style></head><body><h1>${esc(title)}</h1><p class="m">导出时间：${nowStamp()} · 安徽财经大学海外教育</p>${tables}<script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
  w.document.close();
}

/** Shared dialog: optional date range + format choice. */
export function ExportDialog({ title, onClose, onExport, range, children }: {
  title: string; onClose: () => void;
  onExport: (format: ExportFormat, start: string, end: string) => void | Promise<void>;
  range?: { start: string; end: string }; children?: ReactNode;
}) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [start, setStart] = useState(range?.start || "");
  const [end, setEnd] = useState(range?.end || "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4">
      <form onSubmit={async (e) => { e.preventDefault(); if (range && (!start || !end || start > end)) return; setBusy(true); try { await onExport(format, start, end); onClose(); } finally { setBusy(false); } }} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6 shadow-xl">
        <p className="font-display text-lg font-bold text-primary">{title}</p>
        {range && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-primary">开始<input type="date" required value={start} max={end} onChange={(e) => setStart(e.target.value)} className="mt-2 h-10 w-full rounded-full border border-input px-3 text-sm" /></label>
            <label className="block text-sm font-semibold text-primary">结束<input type="date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="mt-2 h-10 w-full rounded-full border border-input px-3 text-sm" /></label>
          </div>
        )}
        {children}
        <div>
          <p className="text-sm font-semibold text-primary">导出格式</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button key={f.v} type="button" onClick={() => setFormat(f.v)} className={`rounded-2xl border p-3 text-left ${format === f.v ? "border-primary bg-secondary ring-2 ring-primary/30" : "border-border"}`}>
                <p className="text-sm font-bold text-primary">{f.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{f.hint}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>取消</Button><Button type="submit" disabled={busy}>{busy ? "导出中…" : "导出"}</Button></div>
      </form>
    </div>
  );
}
