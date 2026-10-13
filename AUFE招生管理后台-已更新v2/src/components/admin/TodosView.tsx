import { useMemo } from "react";
import { CalendarClock, CalendarDays, Image as ImageIcon, UserPlus, type LucideIcon } from "lucide-react";
import { fmtDate, useTable } from "./data";
import { PageHeader } from "./ui";

export type Todo = { key: string; icon: LucideIcon; text: string; view: string; id: string; at: number };
const DAY = 864e5;

/** Derives to-dos from the four source tables — no separate to-do storage. */
export function useTodos(enabled = true) {
  const leads = useTable("leads");
  const bookings = useTable("bookings");
  const events = useTable("events");
  const ads = useTable("ads");
  return useMemo<Todo[]>(() => {
    if (!enabled) return [];
    const now = Date.now();
    const list: Todo[] = [];
    (leads.data ?? []).filter((l) => l.status === "新线索").forEach((l) =>
      list.push({ key: `l${l.id}`, icon: UserPlus, text: `新意向：${l.name}（${l.project ?? "未选项目"}）待跟进`, view: "工作台", id: l.id, at: +new Date(l.created_at) }));
    (bookings.data ?? []).filter((b) => b.status === "待确认").forEach((b) =>
      list.push({ key: `b${b.id}`, icon: CalendarClock, text: `待确认预约：${b.name} ${b.visit_date} ${b.slot} ${b.people} 人`, view: "到校预约", id: b.id, at: +new Date(b.visit_date) }));
    (events.data ?? []).filter((e) => e.starts_at && +new Date(e.starts_at) > now && +new Date(e.starts_at) - now < 7 * DAY).forEach((e) =>
      list.push({ key: `e${e.id}`, icon: CalendarDays, text: `活动即将开始：${e.name}（${fmtDate(e.starts_at)}）`, view: "活动管理", id: e.id, at: +new Date(e.starts_at!) }));
    (ads.data ?? []).filter((a) => a.enabled && a.ends_at && +new Date(a.ends_at) > now && +new Date(a.ends_at) - now < 3 * DAY).forEach((a) =>
      list.push({ key: `a${a.id}`, icon: ImageIcon, text: `广告 #${a.seq} 将于 ${fmtDate(a.ends_at)} 到期`, view: "启动广告", id: a.id, at: +new Date(a.ends_at!) }));
    return list.sort((x, y) => Math.abs(x.at - now) - Math.abs(y.at - now));
  }, [enabled, leads.data, bookings.data, events.data, ads.data]);
}

export function TodoList({ todos, onGo, limit }: { todos: Todo[]; onGo: (view: string, id: string) => void; limit?: number }) {
  const shown = limit ? todos.slice(0, limit) : todos;
  if (todos.length === 0) return <p className="px-5 py-12 text-center text-sm text-muted-foreground">现在没有待处理的事</p>;
  return (
    <div className="divide-y divide-border">
      {shown.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.key} onClick={() => onGo(t.view, t.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/50">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Icon className="size-4" /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{t.view}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TodosView({ todos, onGo }: { todos: Todo[]; onGo: (view: string, id: string) => void }) {
  return (
    <div className="space-y-5">
      <PageHeader title="工作台" desc="汇总新意向、待确认预约、即将开始的活动、3 天内到期的广告。在来源页处理完成后，这里会自动消失。" />
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-card shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]"><TodoList todos={todos} onGo={onGo} /></div>
    </div>
  );
}
