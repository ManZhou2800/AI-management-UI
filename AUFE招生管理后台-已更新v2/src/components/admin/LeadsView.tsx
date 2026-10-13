import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fmtDate, useMutate, useTable, type Row } from "./data";
import { Field, inputCls, textareaCls } from "./ui";

export const LEAD_STATUSES = ["新线索", "跟进中", "已报名", "无效"];
export const LEAD_LEVELS = ["A", "B", "C"];
export const LEAD_TAGS = ["高意向", "家长决策", "价格敏感", "关注奖学金", "已加微信", "需二次到访", "空号"];
const NOTE_TEMPLATES = ["电话未接通，稍后再联系", "已加微信，发送项目资料", "已约到校参观", "家长需要再商量"];
export function daysLater(n: number) { const d = new Date(); d.setDate(d.getDate() + n); const p = (v: number) => String(v).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
type Lead = Row<"leads">;
type Profile = {
  name: string; phone: string; education: string; budget: string; project: string; country: string;
  source: string; owner: string; level: string; status: string; last_contact_at: string; next_follow_at: string;
  tags: string[]; booked: boolean; visited: boolean; enrolled: boolean; paid: boolean;
};

function profileOf(lead: Lead): Profile {
  return {
    name: lead.name || "", phone: lead.phone || "", education: lead.education || "", budget: lead.budget || "",
    project: lead.project || "", country: lead.country || "", source: lead.source || "小程序", owner: lead.owner || "",
    level: lead.level || "C", status: lead.status || "新线索", last_contact_at: dateInput(lead.last_contact_at),
    next_follow_at: dateInput(lead.next_follow_at), tags: Array.isArray(lead.tags) ? lead.tags : [], booked: Boolean(lead.booked), visited: Boolean(lead.visited),
    enrolled: Boolean(lead.enrolled), paid: Boolean(lead.paid),
  };
}

function dateInput(value?: string) {
  return value ? String(value).slice(0, 10) : "";
}


export function phoneKey(phone?: string) {
  return String(phone || "").replace(/\D/g, "");
}

export function LeadDrawer({ lead, author, onClose }: { lead: Lead; author: string; onClose: () => void }) {
  const { data: notes = [] } = useTable("lead_notes");
  const { save } = useMutate();
  const [form, setForm] = useState<Profile>(() => profileOf(lead));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(profileOf(lead)); setNote(""); }, [lead]);
  const mine = notes.filter((n) => n.lead_id === lead.id);
  const set = (patch: Partial<Profile>) => setForm({ ...form, ...patch });

  const submit = async () => {
    if (note.length > 500) return void toast.error("备注不超过 500 字");
    setSaving(true);
    try {
      await save("leads", { ...form, note: note.trim(), author }, lead.id);
      setNote("");
      toast.success("已保存");
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-foreground/30" aria-label="关闭" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div><p className="font-display font-bold">{lead.name}</p><p className="text-xs text-muted-foreground">提交于 {fmtDate(lead.created_at)}</p></div>
          <Button variant="outline" size="sm" onClick={onClose}><ArrowLeft className="size-4" />返回列表</Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="姓名"><input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="电话"><input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="学历"><input className={inputCls} value={form.education} onChange={(e) => set({ education: e.target.value })} /></Field>
            <Field label="预算"><input className={inputCls} value={form.budget} onChange={(e) => set({ budget: e.target.value })} /></Field>
            <Field label="意向国家"><input className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })} /></Field>
            <Field label="意向项目"><input className={inputCls} value={form.project} onChange={(e) => set({ project: e.target.value })} /></Field>
            <Field label="来源渠道"><input className={inputCls} value={form.source} onChange={(e) => set({ source: e.target.value })} /></Field>
            <Field label="负责顾问"><input className={inputCls} value={form.owner} onChange={(e) => set({ owner: e.target.value })} /></Field>
            <Field label="线索等级"><select className={inputCls} value={form.level} onChange={(e) => set({ level: e.target.value })}>{LEAD_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></Field>
            <Field label="当前状态"><select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>{LEAD_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
            <Field label="最近一次联系"><input type="date" className={inputCls} value={form.last_contact_at} onChange={(e) => set({ last_contact_at: e.target.value })} /></Field>
            <Field label="下次跟进"><input type="date" className={inputCls} value={form.next_follow_at} onChange={(e) => set({ next_follow_at: e.target.value })} /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {([["booked", "预约"], ["visited", "到访"], ["enrolled", "报名"], ["paid", "缴费"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => set({ [key]: !form[key] })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form[key] ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{label}</button>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold">客户标签</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...new Set([...LEAD_TAGS, ...form.tags])].map((tag) => {
                const on = form.tags.includes(tag);
                return <button key={tag} type="button" onClick={() => set({ tags: on ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>#{tag}</button>;
              })}
              <input aria-label="自定义标签" placeholder="+ 自定义，回车" className="h-8 w-28 rounded-full border border-input bg-card px-3 text-xs" onKeyDown={(e) => { const v = e.currentTarget.value.trim(); if (e.key === "Enter" && v) { e.preventDefault(); if (!form.tags.includes(v)) set({ tags: [...form.tags, v] }); e.currentTarget.value = ""; } }} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">下次跟进快捷设置</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["今天", 0], ["明天", 1], ["3 天后", 3], ["下周", 7]] as const).map(([label, n]) => (
                <button key={label} type="button" onClick={() => set({ next_follow_at: daysLater(n), last_contact_at: form.last_contact_at || daysLater(0) })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.next_follow_at === daysLater(n) ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">跟进记录</p>
            <ol className="mt-3 space-y-4 border-l-2 border-border pl-4">
              {mine.length === 0 && <li className="text-xs text-muted-foreground">暂无记录</li>}
              {mine.map((n) => <li key={n.id} className="relative"><span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" /><p className="text-xs text-muted-foreground">{fmtDate(n.created_at)} · {n.author}</p><p className="mt-0.5 text-sm">{n.note}</p></li>)}
            </ol>
          </div>
          <label className="block text-sm font-semibold">新增跟进备注<textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：已电话沟通，周六到校" className={`${textareaCls} mt-2`} /></label>
          <div className="-mt-3 flex flex-wrap gap-2">{NOTE_TEMPLATES.map((t) => <button key={t} type="button" onClick={() => { setNote(t); set({ last_contact_at: daysLater(0) }); }} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent">{t}</button>)}</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4"><Button variant="outline" onClick={onClose}>关闭</Button><Button onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存"}</Button></div>
      </aside>
    </div>
  );
}
