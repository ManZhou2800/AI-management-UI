import { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarCheck, Download, Flame, Search, UserPlus, Trophy, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cloud } from "./cloud";
import { fmtDate, useTable, type Row } from "./data";
import { Empty, PageHeader, StatusTag } from "./ui";
import { LEAD_LEVELS, LEAD_STATUSES, LEAD_TAGS, LeadDrawer, daysLater, phoneKey } from "./LeadsView";
import { ExportDialog, exportSheets } from "./exporter";
import { TodoList, type Todo } from "./TodosView";

type Lead = Row<"leads">;
type Quick = "全部" | "逾期" | "今日" | "待分配" | "高意向" | "已报名";
const cardCls = "rounded-3xl border border-white/80 bg-card shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]";
const pill = "h-10 rounded-full border border-input bg-card px-4 text-sm";

function daysSince(value?: string) {
  if (!value) return null;
  return Math.floor((+new Date(daysLater(0)) - +new Date(String(value).slice(0, 10))) / 864e5);
}

export function WorkbenchView({ focusId, author, todos, onGo }: { focusId?: string | undefined; author: string; todos: Todo[]; onGo: (view: string, id: string) => void }) {
  const { data: leads = [] } = useTable("leads");
  const qc = useQueryClient();
  const today = daysLater(0);
  const [quick, setQuick] = useState<Quick>("全部");
  const [status, setStatus] = useState("全部");
  const [level, setLevel] = useState("全部");
  const [owner, setOwner] = useState("全部");
  const [tag, setTag] = useState("全部");
  const [q, setQ] = useState("");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [advisor, setAdvisor] = useState("");
  const [busy, setBusy] = useState(false);
  const [askExport, setAskExport] = useState(false);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  useEffect(() => { if (focusId) setOpenId(focusId); }, [focusId]);

  const visible = useMemo(() => leads.filter((l) => !l.mergedInto), [leads]);
  const active = (l: Lead) => l.status !== "无效" && l.status !== "已报名";
  const isOverdue = (l: Lead) => active(l) && l.next_follow_at && String(l.next_follow_at).slice(0, 10) < today;
  const isToday = (l: Lead) => active(l) && String(l.next_follow_at || "").slice(0, 10) === today;
  const quickTest: Record<Quick, (l: Lead) => boolean> = {
    全部: () => true,
    逾期: (l) => Boolean(isOverdue(l)),
    今日: isToday,
    待分配: (l) => !l.owner && l.status !== "无效",
    高意向: (l) => (l.level || "C") === "A" && active(l),
    已报名: (l) => l.status === "已报名",
  };
  const owners = useMemo(() => [...new Set(visible.map((l) => l.owner).filter(Boolean))] as string[], [visible]);
  const allTags = useMemo(() => [...new Set([...LEAD_TAGS, ...visible.flatMap((l) => l.tags || [])])], [visible]);
  const duplicatePhones = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach((l) => { const k = phoneKey(l.phone); if (k) counts.set(k, (counts.get(k) || 0) + 1); });
    return new Set([...counts].filter(([, c]) => c > 1).map(([k]) => k));
  }, [visible]);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return visible.filter((l) => {
      if (!quickTest[quick](l)) return false;
      if (status !== "全部" && l.status !== status) return false;
      if (level !== "全部" && (l.level || "C") !== level) return false;
      if (owner === "未分配" && l.owner) return false;
      if (owner !== "全部" && owner !== "未分配" && l.owner !== owner) return false;
      if (tag !== "全部" && !(l.tags || []).includes(tag)) return false;
      if (duplicatesOnly && !duplicatePhones.has(phoneKey(l.phone))) return false;
      if (kw && !`${l.name}${l.phone}${l.project}${l.country}`.toLowerCase().includes(kw)) return false;
      return true;
    }).sort((a, b) => {
      // Overdue first, then today's, then by next follow date, then newest.
      const rank = (l: Lead) => (isOverdue(l) ? 0 : isToday(l) ? 1 : l.status === "新线索" ? 2 : active(l) ? 3 : 4);
      return rank(a) - rank(b) || String(a.next_follow_at || "9").localeCompare(String(b.next_follow_at || "9")) || String(b.created_at).localeCompare(String(a.created_at));
    });
  }, [visible, quick, status, level, owner, tag, q, duplicatesOnly, duplicatePhones]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (k: Quick) => visible.filter(quickTest[k]).length;
  const kpis: { k: Quick; label: string; note: string; icon: typeof Flame; tone: string }[] = [
    { k: "逾期", label: "逾期未跟进", note: "超过约定日期", icon: AlarmClock, tone: "bg-destructive/10 text-destructive" },
    { k: "今日", label: "今日待跟进", note: "今天要联系", icon: CalendarCheck, tone: "bg-warning-soft text-warning" },
    { k: "待分配", label: "待分配顾问", note: "还没有负责人", icon: UserPlus, tone: "bg-info-soft text-info" },
    { k: "高意向", label: "A 级高意向", note: "重点跟进", icon: Flame, tone: "bg-secondary text-primary" },
    { k: "已报名", label: "已报名", note: `转化率 ${visible.length ? Math.round((count("已报名") / visible.length) * 100) : 0}%`, icon: Trophy, tone: "bg-positive-soft text-positive" },
  ];
  const funnel = LEAD_STATUSES.map((s) => ({ s, n: visible.filter((l) => l.status === s).length }));
  const load = owners.map((o) => ({ o, n: visible.filter((l) => l.owner === o && active(l)).length, late: visible.filter((l) => l.owner === o && isOverdue(l)).length })).sort((a, b) => b.n - a.n);
  const otherTodos = todos.filter((t) => t.view !== "工作台");
  const open = visible.find((l) => l.id === openId) ?? null;
  const toggle = (id: string) => setPicked((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  const allPicked = rows.length > 0 && rows.every((r) => picked.includes(r.id));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); await qc.invalidateQueries({ queryKey: ["cloud-bundle"] }); setPicked([]); toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); } finally { setBusy(false); }
  };
  const assign = () => {
    const name = advisor.trim();
    if (!name) return void toast.error("先选择或填写顾问");
    if (!picked.length) return void toast.error("先勾选要分配的客户");
    void run(() => cloud("adminAssignLeads", { ids: picked, owner: name, author }), `已分配 ${picked.length} 位客户给 ${name}`);
  };
  const merge = () => {
    const chosen = visible.filter((l) => picked.includes(l.id));
    const keys = new Set(chosen.map((l) => phoneKey(l.phone)).filter(Boolean));
    if (chosen.length < 2 || keys.size !== 1) return void toast.error("请勾选同一个手机号的多条记录");
    const [keep, ...drop] = [...chosen].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    void run(() => cloud("adminMergeLeads", { keepId: keep.id, dropIds: drop.map((l) => l.id), author }), `已合并到 ${keep.name}`).then(() => setOpenId(keep.id));
  };
  const resetFilters = () => { setQuick("全部"); setStatus("全部"); setLevel("全部"); setOwner("全部"); setTag("全部"); setQ(""); setDuplicatesOnly(false); };

  return (
    <div className="space-y-5">
      <PageHeader
        title="工作台"
        desc="客服在这里追踪、标记每一位潜在客户：逾期和今天要联系的排在最前，点开客户即可记录沟通、打标签、约下次跟进。"
        action={<Button variant="outline" onClick={() => setAskExport(true)} disabled={!rows.length}><Download className="size-4" />导出当前筛选</Button>}
      />

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ k, label, note, icon: Icon, tone }) => (
          <button key={k} type="button" onClick={() => setQuick(quick === k ? "全部" : k)} className={cn(cardCls, "p-4 text-left transition hover:-translate-y-0.5", quick === k && "ring-2 ring-primary")}>
            <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={cn("grid size-9 place-items-center rounded-2xl", tone)}><Icon className="size-4" /></span></div>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{count(k)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className={cn(cardCls, "flex flex-wrap items-center gap-2 p-3")}>
            {funnel.map(({ s, n }, i) => (
              <button key={s} type="button" onClick={() => setStatus(status === s ? "全部" : s)} className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
                {s}<span className="rounded-full bg-card/70 px-2 text-xs text-primary">{n}</span>{i < funnel.length - 2 && <span className="sr-only">→</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="搜索客户" value={q} onChange={(e) => setQ(e.target.value)} placeholder="姓名 / 电话 / 项目" className={cn(pill, "w-52 pl-9")} /></label>
            <select aria-label="按等级筛选" value={level} onChange={(e) => setLevel(e.target.value)} className={pill}><option value="全部">全部等级</option>{LEAD_LEVELS.map((v) => <option key={v} value={v}>{v} 级</option>)}</select>
            <select aria-label="按顾问筛选" value={owner} onChange={(e) => setOwner(e.target.value)} className={pill}><option value="全部">全部顾问</option><option>未分配</option>{owners.map((v) => <option key={v}>{v}</option>)}</select>
            <select aria-label="按标签筛选" value={tag} onChange={(e) => setTag(e.target.value)} className={pill}><option value="全部">全部标签</option>{allTags.map((v) => <option key={v}>{v}</option>)}</select>
            <button type="button" onClick={() => setDuplicatesOnly((on) => !on)} className={cn("h-10 rounded-full px-4 text-sm font-semibold", duplicatesOnly ? "bg-primary text-primary-foreground" : "bg-card text-primary")}>重复手机号 {duplicatePhones.size ? `(${duplicatePhones.size})` : ""}</button>
            <button type="button" onClick={resetFilters} className="h-10 px-2 text-sm text-muted-foreground hover:text-primary">清空筛选</button>
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm">
              <span className="font-semibold text-primary">已选 {picked.length} 位</span>
              <input list="advisor-list" aria-label="分配给顾问" value={advisor} onChange={(e) => setAdvisor(e.target.value)} placeholder="选择或输入顾问" className="h-9 w-40 rounded-full border border-input bg-card px-4 text-sm" />
              <datalist id="advisor-list">{owners.map((o) => <option key={o} value={o} />)}</datalist>
              <Button size="sm" onClick={assign} disabled={busy}>分配</Button>
              <Button size="sm" variant="outline" onClick={merge} disabled={busy || picked.length < 2}>合并重复</Button>
              <button type="button" onClick={() => setPicked([])} className="ml-auto text-xs text-muted-foreground">取消选择</button>
            </div>
          )}

          {rows.length === 0 ? <Empty>没有符合条件的客户</Empty> : (
            <div className={cn(cardCls, "overflow-x-auto")}>
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground"><tr>
                  <th className="px-4 py-3"><input aria-label="全选" type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : rows.map((r) => r.id))} /></th>
                  {["客户", "电话", "意向", "顾问", "等级", "状态", "下次跟进", "上次联系", "进度", ""].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map((l) => {
                    const late = isOverdue(l); const due = isToday(l); const since = daysSince(l.last_contact_at);
                    return (
                      <tr key={l.id} onClick={() => setOpenId(l.id)} className={cn("cursor-pointer whitespace-nowrap border-t border-border hover:bg-accent/50", l.id === openId && "bg-accent", late && "bg-destructive/5")}>
                        <td className="px-4 py-3"><input aria-label={`选择${l.name}`} type="checkbox" checked={picked.includes(l.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(l.id)} /></td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{l.name}{l.status === "新线索" && <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">NEW</span>}</p>
                          {(l.tags || []).length > 0 && <p className="mt-1 flex flex-wrap gap-1">{(l.tags as string[]).slice(0, 3).map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-primary">#{t}</span>)}</p>}
                        </td>
                        <td className="px-4 py-3">{l.phone}{duplicatePhones.has(phoneKey(l.phone)) && <span className="ml-1 text-xs text-warning">· 重复</span>}</td>
                        <td className="px-4 py-3">{[l.country, l.project].filter(Boolean).join(" · ") || "—"}<p className="text-xs text-muted-foreground">{l.source}</p></td>
                        <td className="px-4 py-3">{l.owner || <span className="text-muted-foreground">未分配</span>}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{l.level || "C"}</td>
                        <td className="px-4 py-3"><StatusTag s={l.status} /></td>
                        <td className={cn("whitespace-nowrap px-4 py-3", late ? "font-semibold text-destructive" : due ? "font-semibold text-warning" : "text-muted-foreground")}>{l.next_follow_at ? `${fmtDate(l.next_follow_at, false)}${late ? " 逾期" : due ? " 今天" : ""}` : "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{since === null ? "未联系" : since === 0 ? "今天" : `${since} 天前`}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{[["预约", l.booked], ["到访", l.visited], ["报名", l.enrolled], ["缴费", l.paid]].filter(([, on]) => on).map(([n]) => n).join(" / ") || "—"}</td>
                        <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpenId(l.id); }}><MessageSquarePlus className="size-4" />跟进</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className={cn(cardCls, "p-5")}>
            <h3 className="font-display text-base font-bold text-primary">顾问负荷</h3>
            <p className="mt-1 text-xs text-muted-foreground">跟进中的客户数 · 红色为逾期</p>
            <ul className="mt-4 space-y-3">
              {load.length === 0 && <li className="text-sm text-muted-foreground">还没有分配顾问</li>}
              {load.map(({ o, n, late }) => (
                <li key={o}><button type="button" onClick={() => setOwner(owner === o ? "全部" : o)} className="w-full text-left">
                  <div className="flex justify-between text-sm"><span className="font-semibold">{o}</span><span className="text-muted-foreground">{n}{late > 0 && <b className="ml-2 text-destructive">逾期 {late}</b>}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (n / Math.max(...load.map((x) => x.n), 1)) * 100)}%` }} /></div>
                </button></li>
              ))}
            </ul>
          </div>
          <div className={cn(cardCls, "overflow-hidden")}>
            <div className="px-5 pt-5"><h3 className="font-display text-base font-bold text-primary">其他待办</h3><p className="mt-1 text-xs text-muted-foreground">预约、活动、广告提醒</p></div>
            <TodoList todos={otherTodos} onGo={onGo} limit={6} />
          </div>
        </aside>
      </div>

      {askExport && <ExportDialog title={`导出当前筛选的 ${rows.length} 位客户`} onClose={() => setAskExport(false)} onExport={(f) => exportSheets([{ name: "客户跟进", rows: [["提交时间", "姓名", "电话", "标签", "学历", "预算", "意向国家", "意向项目", "来源", "顾问", "等级", "状态", "最近联系", "下次跟进", "预约", "到访", "报名", "缴费"], ...rows.map((r) => [fmtDate(r.created_at), r.name, r.phone, (r.tags || []).join("/"), r.education, r.budget, r.country, r.project, r.source, r.owner, r.level, r.status, r.last_contact_at, r.next_follow_at, Boolean(r.booked), Boolean(r.visited), Boolean(r.enrolled), Boolean(r.paid)])] }], `客户跟进_${today}`, f, "客户跟进")} />}
      {open && <LeadDrawer lead={open} author={author} onClose={() => setOpenId(null)} />}
    </div>
  );
}
