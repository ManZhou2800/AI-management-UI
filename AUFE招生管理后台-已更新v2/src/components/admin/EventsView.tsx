import { useState } from "react";
import { ArrowLeft, CalendarDays, ImageIcon, MapPin, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ImagePicker } from "./ImageLibrary";
import { confirmLeave, fmtDate, fromLocalInput, toLocalInput, useMutate, useTable, useUnsavedGuard, type Row } from "./data";
import { Card, Empty, Field, PageHeader, SaveBar, inputCls, textareaCls } from "./ui";

type Ev = Row<"events">;

export function EventsView({ focusId }: { focusId?: string | undefined }) {
  const { data: events = [] } = useTable("events", "starts_at", true);
  const [openId, setOpenId] = useState<string | "new" | null>(focusId ?? null);
  const open = openId === "new" ? "new" : events.find((e) => e.id === openId);
  if (open) return <EventDetail ev={open === "new" ? null : open} onBack={() => setOpenId(null)} onCreated={setOpenId} />;
  return (
    <div className="space-y-5">
      <PageHeader title="活动管理" desc="校园开放日等活动。家长在小程序报名后，报名记录会出现在活动详情里。" action={<Button onClick={() => setOpenId("new")}><Plus className="size-4" />新建活动</Button>} />
      {events.length === 0 ? (
        <Empty><p>还没有活动</p><Button className="mt-4" onClick={() => setOpenId("new")}><Plus className="size-4" />新建活动</Button></Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => (
            <button key={e.id} onClick={() => setOpenId(e.id)} className="overflow-hidden rounded-3xl border border-white/80 bg-card text-left shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)] transition-shadow hover:shadow-md">
              <div className="grid aspect-[16/9] place-items-center bg-muted">{e.cover_url ? <img src={e.cover_url} alt={e.name} className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}</div>
              <div className="space-y-1.5 p-4">
                <p className="font-semibold">{e.name || "未命名活动"}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{fmtDate(e.starts_at)}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" />{e.location || "—"}</p>
                <p className={`text-xs font-semibold ${e.signup_open ? "text-positive" : "text-muted-foreground"}`}>{e.signup_open ? "报名开放中" : "报名已关闭"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventDetail({ ev, onBack: close, onCreated }: { ev: Ev | null; onBack: () => void; onCreated: (id: string) => void }) {
  const { data: signups = [] } = useTable("event_signups");
  const { save, invalidate } = useMutate();
  const [f, setF] = useState({ name: ev?.name ?? "", starts: toLocalInput(ev?.starts_at), location: ev?.location ?? "", highlights: ev?.highlights ?? "", cover_url: ev?.cover_url ?? "", signup_open: ev?.signup_open ?? true });
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(() => JSON.stringify(f));
  const dirty = JSON.stringify(f) !== initial;
  useUnsavedGuard(dirty);
  const onBack = () => { if (confirmLeave()) close(); };
  const mine = signups.filter((s) => s.event_id === ev?.id);

  const submit = async () => {
    if (!f.name.trim()) return void toast.error("请填写活动名称");
    setSaving(true);
    const values = { name: f.name.trim(), starts_at: fromLocalInput(f.starts), location: f.location, highlights: f.highlights, cover_url: f.cover_url || null, signup_open: f.signup_open };
    try {
      if (ev) { await save("events", values, ev.id); setInitial(JSON.stringify(f)); toast.success("活动已保存"); }
      else {
        const { cloud } = await import("./cloud");
        const data = await cloud<{ id: string }>("saveOpenDay", { name: values.name, startsAt: values.starts_at, location: values.location, highlights: values.highlights, image: values.cover_url, signupOpen: values.signup_open });
        setInitial(JSON.stringify(f)); await invalidate("events"); toast.success("活动已创建"); onCreated(data.id);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 pb-20">
      <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4" />返回列表</Button>
      <PageHeader title={ev ? ev.name || "活动详情" : "新建活动"} />
      <div className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"><TriangleAlert className="size-4 shrink-0" />微信订阅消息模板尚未开通，活动通知还不能发送。</div>
      <Card className="max-w-4xl space-y-5">
        <Field label="活动名称"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="时间"><input type="datetime-local" className={inputCls} value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></Field>
          <Field label="地点"><input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        </div>
        <Field label="亮点"><textarea rows={3} className={textareaCls} value={f.highlights} onChange={(e) => setF({ ...f, highlights: e.target.value })} /></Field>
        <Field label="封面"><ImagePicker value={f.cover_url} onChange={(u) => setF({ ...f, cover_url: u })} /></Field>
        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3"><span className="text-sm font-semibold">报名开关</span><Switch checked={f.signup_open} onCheckedChange={(v) => setF({ ...f, signup_open: v })} /></div>
        <div className="flex justify-end"><Button onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存"}</Button></div>
      </Card>
      <SaveBar dirty={dirty} saving={saving} onSave={submit} />
      {ev && (
        <Card className="max-w-4xl">
          <p className="font-display text-sm font-bold">报名记录 <span className="font-normal text-muted-foreground">（{mine.length} 人，只读）</span></p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">姓名</th><th className="pb-2 font-medium">手机号</th><th className="pb-2 font-medium">提交时间</th></tr></thead>
            <tbody>
              {mine.map((s) => <tr key={s.id} className="border-t border-border"><td className="py-2.5 font-semibold">{s.name}</td><td>{s.phone}</td><td className="text-muted-foreground">{fmtDate(s.created_at)}</td></tr>)}
              {mine.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">暂无报名</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
