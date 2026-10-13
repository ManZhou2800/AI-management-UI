import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, BookOpenText, CalendarDays, Download, Image, LayoutDashboard, ListTodo, LogOut, Menu,
  MessageSquareText, Pencil, Settings, ShieldCheck, TrendingUp, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cloud, readSession, writeSession, type AdminSession } from "@/components/admin/cloud";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { DurhamLogo, LoginView } from "@/components/admin/LoginView";
import { SchoolView } from "@/components/admin/SchoolView";
import { ProjectsView } from "@/components/admin/ProjectsView";
import { AdsView } from "@/components/admin/AdsView";
import { WorkbenchView } from "@/components/admin/WorkbenchView";
import { BookingsView } from "@/components/admin/BookingsView";
import { EventsView } from "@/components/admin/EventsView";
import { TodoList, useTodos, type Todo } from "@/components/admin/TodosView";
import { PermissionsView } from "@/components/admin/PermissionsView";
import { SettingsView } from "@/components/admin/SettingsView";
import { ExportDialog, exportSheets } from "@/components/admin/exporter";
import { buildOverviewSheets } from "@/components/admin/overviewExport";
import { confirmLeave, useTable } from "@/components/admin/data";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "招生管理后台｜安徽财经大学海外教育" },
      { name: "description", content: "管理首页、留学服务、启动广告、客户跟进与到校预约的招生后台。" },
      { property: "og:title", content: "招生管理后台｜安徽财经大学海外教育" },
      { property: "og:description", content: "对应需求文档的内容后台，数据写入腾讯云开发。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminApp,
});

const NAV = [
  { name: "数据总览", icon: LayoutDashboard },
  { name: "首页", icon: BookOpenText },
  { name: "服务", icon: MessageSquareText },
  { name: "启动广告", icon: Image },
  { name: "到校预约", icon: CalendarDays },
  { name: "活动管理", icon: Activity },
  { name: "工作台", icon: ListTodo },
  { name: "权限管理", icon: ShieldCheck, superOnly: true },
  { name: "系统设置", icon: Settings },
];

function AdminApp() {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);
  const qc = useQueryClient();
  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener("admin-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("admin-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, [qc]);

  return (
    <>
      <Toaster position="top-center" richColors />
      {session === undefined ? <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">加载中…</div>
        : session ? <Gate session={session} /> : <LoginView />}
    </>
  );
}

async function signOut(qc: ReturnType<typeof useQueryClient>, account: string) {
  try { await cloud("logoutAdmin", { account }); } catch { /* 本地会话仍要清掉 */ }
  await qc.cancelQueries();
  qc.clear();
  writeSession(null);
}

function Gate({ session }: { session: AdminSession }) {
  return <Shell userId={session.account} name={session.name} isSuper={(session.role || "super_admin") === "super_admin"} />;
}

function Shell({ userId, name, isSuper }: { userId: string; name: string; isSuper: boolean }) {
  const qc = useQueryClient();
  const [view, setView] = useState("数据总览");
  const [focus, setFocus] = useState<{ id?: string | undefined; n: number }>({ n: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const todos = useTodos();
  const { data: leads = [] } = useTable("leads");
  const { data: bookings = [] } = useTable("bookings", "created_at", true);
  const counts: Record<string, number> = {
    到校预约: bookings.filter((b) => b.status === "待确认").length,
    工作台: leads.filter((l) => !l.mergedInto && (l.status === "新线索" || (l.status === "跟进中" && l.next_follow_at && String(l.next_follow_at).slice(0, 10) <= new Date().toISOString().slice(0, 10)))).length,
  };
  const nav = NAV.filter((n) => !n.superOnly || isSuper);
  const go = (v: string, id?: string) => { if (!confirmLeave()) return; setView(v); setFocus((f) => ({ id, n: f.n + 1 })); setMobileOpen(false); window.scrollTo({ top: 0 }); };
  const k = `${view}-${focus.n}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen && <button aria-label="关闭导航遮罩" className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-5 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <DurhamLogo className="h-12 w-12" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold text-primary">安徽财经大学</p>
              <p className="text-[11px] text-muted-foreground">海外教育 · 管理端</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="关闭导航"><X className="size-4" /></Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
          <p className="px-3 pb-2 pt-2 text-[11px] font-semibold tracking-wide text-muted-foreground">招生运营</p>
          {nav.map((item) => {
            const Icon = item.icon; const active = view === item.name; const c = counts[item.name];
            return (
              <Button key={item.name} variant={active ? "default" : "ghost"} className={cn("h-11 w-full justify-start rounded-2xl", !active && "text-foreground")} onClick={() => go(item.name)}>
                <Icon className="size-4" /><span className="flex-1 text-left">{item.name}</span>
                {!!c && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>{c}</span>}
              </Button>
            );
          })}
        </nav>
        <p className="px-6 pb-5 text-[11px] text-muted-foreground">内容写入腾讯云开发，家长端无需重新发版</p>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-[4.25rem] items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button>
            <span className="lg:hidden"><DurhamLogo className="h-10 w-10" /></span>
            <div>
              <h1 className="font-display text-lg font-bold text-primary">{view}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">安徽财经大学海外教育 · 一站式招生管理</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">欢迎，<b className="text-primary">{name}</b></span>
            <Button variant="outline" size="sm" onClick={() => signOut(qc, userId)}><LogOut className="size-4" /><span className="hidden sm:inline">退出</span></Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 md:p-7" key={k}>
          {view === "数据总览" && <Dashboard name={name} todos={todos} onGo={go} />}
          {view === "首页" && <SchoolView />}
          {view === "服务" && <ProjectsView />}
          {view === "启动广告" && <AdsView focusId={focus.id} />}
          {view === "到校预约" && <BookingsView focusId={focus.id} />}
          {view === "活动管理" && <EventsView focusId={focus.id} />}
          {view === "工作台" && <WorkbenchView focusId={focus.id} author={name} todos={todos} onGo={go} />}
          {view === "权限管理" && isSuper && <PermissionsView currentId={userId} />}
          {view === "系统设置" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white/80 bg-card p-5 shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]"><div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-display text-base font-bold text-primary">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>{action}</div>{children}</div>;
}

function buildTrend(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  if (isNaN(+s) || isNaN(+e) || s > e) return [];
  const days = Math.round((+e - +s) / 864e5) + 1;
  const step = Math.max(1, Math.ceil(days / 31));
  const out: { day: string; views: number; leads: number }[] = [];
  for (let i = 0; i < days; i += step) {
    const d = new Date(+s + i * 864e5);
    const seed = d.getDate() * 37 + d.getMonth() * 11;
    const views = 300 + ((seed * 13) % 520);
    out.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, views, leads: Math.round(views * (0.07 + (seed % 5) / 100)) });
  }
  return out;
}
const isoDaysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  const p = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

const funnelData = [
  { name: "项目曝光", value: 12840, width: "100%" },
  { name: "详情浏览", value: 6420, width: "82%" },
  { name: "咨询点击", value: 1896, width: "62%" },
  { name: "提交线索", value: 428, width: "44%" },
  { name: "到校预约", value: 136, width: "28%" },
];

const projectData = [
  { name: "英国2+2", views: 1860, leads: 86, rate: "4.6%" },
  { name: "澳洲3+1", views: 1420, leads: 62, rate: "4.4%" },
  { name: "香港硕士", views: 1210, leads: 48, rate: "4.0%" },
  { name: "新加坡直博", views: 880, leads: 32, rate: "3.6%" },
];

const contentRows = [
  { title: "2027国际本科2+2项目", type: "国际本科", status: "已发布", date: "今天 10:24", views: "1,860" },
  { title: "校园环境与教学设施", type: "学校内容", status: "已发布", date: "昨天 16:40", views: "928" },
  { title: "英国名校硕士预科", type: "硕士项目", status: "草稿", date: "10月6日", views: "—" },
  { title: "2026秋季校园开放日", type: "活动", status: "已发布", date: "10月5日", views: "643" },
];

function Dashboard({ name, todos, onGo }: { name: string; todos: Todo[]; onGo: (view: string, id?: string) => void }) {
  const [dateRange, setDateRange] = useState("近7天");
  const [start, setStart] = useState(isoDaysAgo(6));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [askExport, setAskExport] = useState(false);
  const leads = useTable("leads").data || [];
  const bookings = useTable("bookings").data || [];
  const trendData = useMemo(() => buildTrend(start, end), [start, end]);
  const preset = (v: string) => {
    setDateRange(v);
    if (v === "自定义") return;
    const n = v === "近7天" ? 6 : v === "近30天" ? 29 : 0;
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const p = (value: number) => String(value).padStart(2, "0");
    setStart(v === "本季度" ? `${quarterStart.getFullYear()}-${p(quarterStart.getMonth() + 1)}-01` : isoDaysAgo(n));
    setEnd(isoDaysAgo(0));
  };
  const openExport = () => setAskExport(true);
  const stats = [
    { label: "小程序访问", value: "12,840", change: "+18.2%", note: "较上周期", icon: Activity, tone: "bg-secondary text-primary" },
    { label: "新增潜在客户", value: "428", change: "+12.6%", note: "待跟进 12 条", icon: Users, tone: "bg-info-soft text-info" },
    { label: "咨询点击", value: "1,896", change: "+8.4%", note: "转化率 14.8%", icon: MessageSquareText, tone: "bg-positive-soft text-positive" },
    { label: "到校预约", value: "136", change: "+21.3%", note: "今日 5 组", icon: CalendarDays, tone: "bg-warning-soft text-warning" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-muted-foreground">安徽财经大学海外教育</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-primary">你好，{name}</h2><p className="mt-1 text-sm text-muted-foreground">首页气泡、留学服务、启动广告、线索与预约都在这里维护。</p></div>
        <div className="flex gap-2">
          <select aria-label="数据周期" className="h-10 rounded-full border border-input bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring" value={dateRange} onChange={(e) => preset(e.target.value)}>
            <option>近7天</option><option>近30天</option><option>本季度</option><option>自定义</option>
          </select>
          {dateRange === "自定义" && (
            <>
              <input type="date" aria-label="自定义开始日期" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="h-10 rounded-full border border-input bg-card px-3 text-sm" />
              <input type="date" aria-label="自定义结束日期" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="h-10 rounded-full border border-input bg-card px-3 text-sm" />
            </>
          )}
          <Button variant="outline" onClick={openExport}><Download className="size-4" />导出</Button>
          <Button onClick={() => onGo("首页")}><Pencil className="size-4" />编辑首页</Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => { const Icon = stat.icon; return (
          <div key={stat.label} className="rounded-3xl border border-white/80 bg-card p-5 shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.4)]">
            <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{stat.label}</p><span className={cn("grid size-10 place-items-center rounded-2xl", stat.tone)}><Icon className="size-4" /></span></div>
            <p className="mt-4 font-display text-3xl font-bold text-primary">{stat.value}</p>
            <div className="mt-2 flex items-center gap-2 text-xs"><span className="flex items-center font-semibold text-positive"><TrendingUp className="mr-1 size-3" />{stat.change}</span><span className="text-muted-foreground">{stat.note}</span></div>
          </div>
        ); })}
      </section>
      {askExport && <ExportDialog title="导出数据总览" range={{ start, end }} onClose={() => setAskExport(false)} onExport={(f, s1, e1) => exportSheets(buildOverviewSheets(leads, bookings, s1, e1), `数据总览_${s1}_${e1}`, f, `数据总览 ${s1} 至 ${e1}`)} />}

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Panel title="访问与线索趋势" subtitle={`${start} 至 ${end}`} action={<div className="flex flex-wrap items-center justify-end gap-3 text-xs"><input type="date" aria-label="开始日期" value={start} max={end} onChange={(e) => { setStart(e.target.value); setDateRange("自定义"); }} className="h-8 rounded-md border border-input bg-background px-2"/><span className="text-muted-foreground">至</span><input type="date" aria-label="结束日期" value={end} min={start} onChange={(e) => { setEnd(e.target.value); setDateRange("自定义"); }} className="h-8 rounded-md border border-input bg-background px-2"/><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />访问量</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-positive" />线索</span></div>}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: -20, right: 8, top: 12 }}><defs><linearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/><Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", boxShadow: "0 8px 24px color-mix(in oklab, var(--foreground) 10%, transparent)" }}/><Area type="monotone" dataKey="views" stroke="var(--primary)" strokeWidth={2.5} fill="url(#primaryFill)"/><Area type="monotone" dataKey="leads" stroke="var(--positive)" strokeWidth={2} fillOpacity={0}/></AreaChart></ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="转化漏斗" subtitle="用户从看到项目到预约到校，每一步还剩多少人；百分比为进入下一步的比例" action={<span className="text-xs font-semibold text-positive">总转化 1.06%</span>}>
          <div className="space-y-3 pt-2">{funnelData.map((item, index) => <div key={item.name} className="flex items-center gap-3"><div className="w-16 text-xs text-muted-foreground">{item.name}</div><div className="flex-1"><div className="flex h-8 items-center justify-between rounded-sm bg-secondary px-3 text-xs font-semibold text-secondary-foreground" style={{ width: item.width }}><span>{item.value.toLocaleString()}</span>{index < funnelData.length - 1 && <span className="opacity-60">{Math.round((((funnelData[index + 1]?.value) ?? 0) / item.value) * 100)}%</span>}</div></div></div>)}</div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="热门项目表现" subtitle="按详情浏览量排序" action={<Button variant="ghost" size="sm">查看全部</Button>}>
          <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={projectData} margin={{ left: -26, top: 12 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}/><Tooltip cursor={{ fill: "var(--muted)" }}/><Bar dataKey="views" radius={[3,3,0,0]}>{projectData.map((_, i) => <Cell key={i} fill={i === 0 ? "var(--primary)" : "var(--chart-4)"}/>)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="pb-3 font-medium">项目</th><th className="pb-3 font-medium">浏览</th><th className="pb-3 font-medium">线索</th><th className="pb-3 font-medium">转化</th></tr></thead><tbody>{projectData.map((p) => <tr key={p.name} className="border-t border-border"><td className="py-3 font-semibold">{p.name}</td><td>{p.views}</td><td>{p.leads}</td><td className="font-semibold text-positive">{p.rate}</td></tr>)}</tbody></table></div>
          </div>
        </Panel>
        <Panel title="工作台" subtitle="需要优先处理的运营任务" action={<span className="rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">{todos.length} 项</span>}>
          <div className="-mx-5"><TodoList todos={todos} onGo={onGo} limit={5} /></div>
        </Panel>
      </section>
    </div>
  );
}


