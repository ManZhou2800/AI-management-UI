import { useEffect, useMemo, useState } from "react";
import { BellOff, ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDate, useMutate, useSetting, useTable, type Row } from "./data";
import { Card, PageHeader, StatusTag } from "./ui";
import { ExportDialog, exportSheets } from "./exporter";
import { bookingSheet } from "./overviewExport";

const SLOTS = ["上午", "下午"];
const RANGES = ["今天", "明天", "一周内", "一个月内", "自定义"] as const;
type Range = (typeof RANGES)[number];
const dayStr = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return fmtDate(d.toISOString(), false); };
const WEEK = "日一二三四五六";

function spanOf(r: Range, cs: string, ce: string): [string, string] {
  if (r === "今天") return [dayStr(0), dayStr(0)];
  if (r === "明天") return [dayStr(1), dayStr(1)];
  if (r === "一周内") return [dayStr(0), dayStr(6)];
  if (r === "一个月内") return [dayStr(0), dayStr(29)];
  return [cs, ce];
}
function daysBetween(s: string, e: string) {
  const out: string[] = [];
  for (let t = +new Date(s); t <= +new Date(e) && out.length < 400; t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function BookingsView({ focusId }: { focusId?: string | undefined }) {
  const { data: bookings = [] } = useTable("bookings", "created_at", true);
  const { data: sys } = useSetting<{ slotCapacity?: number }>("system");
  const cap = sys?.slotCapacity ?? 100;
  const { save } = useMutate();
  const focused = bookings.find((b) => b.id === focusId);
  const [range, setRange] = useState<Range>("今天");
  const [cs, setCs] = useState(dayStr(0));
  const [ce, setCe] = useState(dayStr(6));
  const [showEmpty, setShowEmpty] = useState(false);
  const [askExport, setAskExport] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { if (focused) { setRange("自定义"); setCs(focused.visit_date); setCe(focused.visit_date); setOpenId(focused.id); } }, [focused]);

  const [start, end] = spanOf(range, cs, ce);
  const inSpan = useMemo(() => bookings.filter((b) => b.visit_date >= start && b.visit_date <= end), [bookings, start, end]);
  const single = start === end;
  const days = useMemo(() => daysBetween(start, end).filter((d) => single || showEmpty || inSpan.some((b) => b.visit_date === d)), [start, end, single, showEmpty, inSpan]);
  const valid = inSpan.filter((b) => b.status !== "已取消");
  const people = valid.reduce((n, b) => n + (Number(b.people) || 0), 0);

  const setStatus = async (id: string, status: string) => {
    try { await save("bookings", { status }, id); toast.success(`已${status === "已确认" ? "确认" : status === "已到访" ? "标记到访" : "取消"}`); } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="到校预约" desc={`按日期从近到远排列，每天分上午 / 下午。每个时段上限 ${cap} 人（可在系统设置修改）。`}
        action={<Button variant="outline" onClick={() => setAskExport(true)}><Download className="size-4" />导出</Button>} />
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRange(r)} className={cn("rounded-full border px-4 py-1.5 text-sm", r === range ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-secondary")}>{r}</button>
        ))}
        {range === "自定义" && (
          <>
            <input type="date" aria-label="开始日期" value={cs} max={ce} onChange={(e) => e.target.value && setCs(e.target.value)} className="h-10 rounded-full border border-input bg-card px-3 text-sm" />
            <span className="text-sm text-muted-foreground">至</span>
            <input type="date" aria-label="结束日期" value={ce} min={cs} onChange={(e) => e.target.value && setCe(e.target.value)} className="h-10 rounded-full border border-input bg-card px-3 text-sm" />
          </>
        )}
        {!single && <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />显示无预约的日期</label>}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>{start === end ? start : `${start} 至 ${end}`}</span>
        <span>预约 <b className="text-primary">{valid.length}</b> 组</span>
        <span>共 <b className="text-primary">{people}</b> 人次</span>
        <span>待确认 <b className="text-warning">{inSpan.filter((b) => b.status === "待确认").length}</b></span>
      </div>

      {days.length === 0 && <Card><p className="py-6 text-center text-sm text-muted-foreground">这段时间暂无预约</p></Card>}
      {days.map((d) => (
        <section key={d} className="space-y-3">
          {!single && <h3 className="font-display text-base font-bold text-primary">{d === dayStr(0) ? "今天" : d === dayStr(1) ? "明天" : d.slice(5)} <span className="text-sm font-normal text-muted-foreground">{d} · 星期{WEEK[new Date(d).getDay()]}</span></h3>}
          <div className="grid gap-4 xl:grid-cols-2">
            {SLOTS.map((slot) => <SlotCard key={slot} slot={slot} cap={cap} rows={inSpan.filter((b) => b.visit_date === d && b.slot === slot)} focusId={focusId} openId={openId} setOpenId={setOpenId} setStatus={setStatus} />)}
          </div>
        </section>
      ))}

      {askExport && <ExportDialog title="导出到校预约" range={{ start, end }} onClose={() => setAskExport(false)} onExport={(f, s, e) => {
        const rows = bookings.filter((b) => b.visit_date >= s && b.visit_date <= e);
        const ok = rows.filter((b) => b.status !== "已取消");
        const daily = daysBetween(s, e).map((d) => { const p = (slot: string) => ok.filter((b) => b.visit_date === d && b.slot === slot).reduce((n, b) => n + (Number(b.people) || 0), 0); return [d, `星期${WEEK[new Date(d).getDay()]}`, p("上午"), p("下午"), p("上午") + p("下午")]; });
        return exportSheets([
          { name: "按日汇总", rows: [["日期", "星期", "上午人数", "下午人数", "合计人数"], ...daily] },
          bookingSheet(rows),
        ], `到校预约_${s}_${e}`, f, `到校预约 ${s} 至 ${e}`);
      }} />}
    </div>
  );
}

function SlotCard({ slot, cap, rows, focusId, openId, setOpenId, setStatus }: { slot: string; cap: number; rows: Row[]; focusId?: string | undefined; openId: string | null; setOpenId: (id: string | null) => void; setStatus: (id: string, s: string) => void }) {
  const booked = rows.filter((b) => b.status !== "已取消").reduce((n, b) => n + (Number(b.people) || 0), 0);
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-5">
        <div className="rounded-md bg-secondary px-4 py-3 text-center"><p className="font-display text-xs font-bold text-primary">{slot}</p></div>
        <div><p className="text-xs text-muted-foreground">已约人数</p><p className="font-display text-2xl font-bold">{booked}</p></div>
        <div><p className="text-xs text-muted-foreground">剩余名额</p><p className={cn("font-display text-2xl font-bold", cap - booked <= 0 ? "text-destructive" : "text-positive")}>{Math.max(0, cap - booked)}</p></div>
        <div className="ml-auto h-2 w-28 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (booked / cap) * 100)}%` }} /></div>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">该时段暂无预约</p>}
        {rows.map((b) => {
          const open = openId === b.id;
          return (
            <div key={b.id} className={cn(b.id === focusId && "bg-accent/60")}>
              <button onClick={() => setOpenId(open ? null : b.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm">
                <span className="font-semibold">{b.name}</span><span className="text-muted-foreground">{b.people} 人</span>
                <span className="ml-auto"><StatusTag s={b.status} /></span><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-4 py-3 text-sm">
                  <span>手机号：<b>{b.phone}</b></span>
                  <span className="flex-1" />
                  {b.status === "待确认" && <Button size="sm" onClick={() => setStatus(b.id, "已确认")}>确认</Button>}
                  {b.status === "已确认" && <Button size="sm" onClick={() => setStatus(b.id, "已到访")}>标记到访</Button>}
                  {(b.status === "待确认" || b.status === "已确认") && <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "已取消")}>取消</Button>}
                  <Button size="sm" variant="ghost" disabled title="需要先开通微信订阅消息"><BellOff className="size-3.5" />提醒未开通</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
