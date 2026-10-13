import { fmtDate, type Row } from "./data";
import { nowStamp, type Sheet } from "./exporter";

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
const dayKey = (v?: string) => String(v || "").slice(0, 10);
function countBy(rows: Row[], key: (r: Row) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = key(r) || "未填写"; m.set(k, (m.get(k) || 0) + 1); });
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Statistically useful overview: summary, per-day series, breakdowns, then raw detail. */
export function buildOverviewSheets(leadsAll: Row[], bookingsAll: Row[], start: string, end: string): Sheet[] {
  const inSpan = (v?: string) => { const k = dayKey(v); return k >= start && k <= end; };
  const leads = leadsAll.filter((l) => !l.mergedInto && inSpan(l.created_at));
  const bookings = bookingsAll.filter((b) => inSpan(b.visit_date));
  const valid = bookings.filter((b) => b.status !== "已取消");
  const people = valid.reduce((n, b) => n + (Number(b.people) || 0), 0);
  const enrolled = leads.filter((l) => l.status === "已报名").length;
  const days = Math.round((+new Date(end) - +new Date(start)) / 864e5) + 1;

  const summary: Sheet = { name: "汇总", rows: [
    ["指标", "数值", "说明"],
    ["导出时间", nowStamp(), ""],
    ["统计区间", `${start} 至 ${end}`, `共 ${days} 天`],
    ["新增潜在客户", leads.length, `日均 ${(leads.length / days).toFixed(1)}`],
    ["已分配顾问", leads.filter((l) => l.owner).length, pct(leads.filter((l) => l.owner).length, leads.length)],
    ["跟进中", leads.filter((l) => l.status === "跟进中").length, pct(leads.filter((l) => l.status === "跟进中").length, leads.length)],
    ["已报名", enrolled, `转化率 ${pct(enrolled, leads.length)}`],
    ["无效", leads.filter((l) => l.status === "无效").length, pct(leads.filter((l) => l.status === "无效").length, leads.length)],
    ["A 级高意向", leads.filter((l) => l.level === "A").length, pct(leads.filter((l) => l.level === "A").length, leads.length)],
    ["到校预约（组）", valid.length, `已取消 ${bookings.length - valid.length} 组`],
    ["到校预约（人次）", people, `每组平均 ${valid.length ? (people / valid.length).toFixed(1) : 0} 人`],
    ["已到访", bookings.filter((b) => b.status === "已到访").length, pct(bookings.filter((b) => b.status === "已到访").length, valid.length)],
  ] };

  const daily: Sheet = { name: "每日统计", rows: [["日期", "星期", "新增客户", "A级", "预约组数", "上午人数", "下午人数", "预约人次"]] };
  for (let i = 0; i < days; i++) {
    const d = new Date(+new Date(start) + i * 864e5); const k = d.toISOString().slice(0, 10);
    const dl = leads.filter((l) => dayKey(l.created_at) === k);
    const db = valid.filter((b) => b.visit_date === k);
    const ppl = (slot: string) => db.filter((b) => b.slot === slot).reduce((n, b) => n + (Number(b.people) || 0), 0);
    daily.rows.push([k, "日一二三四五六"[d.getDay()]!, dl.length, dl.filter((l) => l.level === "A").length, db.length, ppl("上午"), ppl("下午"), ppl("上午") + ppl("下午")]);
  }

  const breakdown = (name: string, key: (r: Row) => string): Sheet => ({ name, rows: [[name.replace("分布", ""), "客户数", "占比", "已报名", "报名率"], ...countBy(leads, key).map(([k, n]) => {
    const e = leads.filter((l) => (key(l) || "未填写") === k && l.status === "已报名").length;
    return [k, n, pct(n, leads.length), e, pct(e, n)];
  })] });

  return [
    summary, daily,
    breakdown("来源渠道分布", (l) => l.source), breakdown("意向项目分布", (l) => l.project),
    breakdown("顾问分布", (l) => l.owner || "未分配"), breakdown("状态分布", (l) => l.status),
    { name: "客户明细", rows: [["提交时间", "姓名", "电话", "学历", "预算", "国家", "项目", "来源", "顾问", "等级", "状态", "标签", "下次跟进"], ...leads.map((l) => [fmtDate(l.created_at), l.name, l.phone, l.education, l.budget, l.country, l.project, l.source, l.owner, l.level, l.status, (l.tags || []).join("/"), l.next_follow_at || ""])] },
    bookingSheet(bookings),
  ];
}

export function bookingSheet(rows: Row[]): Sheet {
  const order = (b: Row) => `${b.visit_date}${b.slot === "上午" ? 0 : 1}`;
  return { name: "预约明细", rows: [["到校日期", "星期", "时段", "姓名", "电话", "人数", "状态", "提交时间"], ...[...rows].sort((a, b) => order(a).localeCompare(order(b))).map((b) => [b.visit_date, "日一二三四五六"[new Date(b.visit_date).getDay()], b.slot, b.name, b.phone, Number(b.people) || 0, b.status, fmtDate(b.created_at)])] };
}
