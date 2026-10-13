import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "./ImageLibrary";
import { fromLocalInput, toLocalInput, useMutate, useTable, useUnsavedGuard, type Row } from "./data";
import { Card, Empty, Field, PageHeader, StatusTag, inputCls } from "./ui";

export function AdsView({ focusId }: { focusId?: string | undefined }) {
  const { data: ads = [] } = useTable("ads", "seq", true);
  const { save } = useMutate();
  const add = async () => {
    const seq = Math.max(0, ...ads.map((a) => a.seq)) + 1;
    try { await save("ads", { seq }); toast.success("已添加一条广告"); } catch (e) { toast.error(e instanceof Error ? e.message : "添加失败"); }
  };
  return (
    <div className="space-y-5">
      <PageHeader
        title="启动广告"
        desc="每天第一次打开小程序时，弹出一条「启用」且在生效时间内的广告；有多条时，编号靠前的优先。"
        action={<Button onClick={add}><Plus className="size-4" />添加广告</Button>}
      />
      {ads.length === 0 ? <Empty>还没有广告</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2">{ads.map((a) => <AdCard key={a.id} ad={a} focused={a.id === focusId} />)}</div>
      )}
    </div>
  );
}

function AdCard({ ad, focused }: { ad: Row<"ads">; focused: boolean }) {
  const { save } = useMutate();
  const [f, setF] = useState({ image_url: ad.image_url ?? "", enabled: ad.enabled, project_no: ad.project_no, starts: toLocalInput(ad.starts_at), ends: toLocalInput(ad.ends_at) });
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(() => JSON.stringify(f));
  const dirty = JSON.stringify(f) !== initial;
  useUnsavedGuard(dirty);
  useEffect(() => { if (focused) document.getElementById(`ad-${ad.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [focused, ad.id]);
  const now = Date.now();
  const live = f.enabled && f.starts && f.ends && +new Date(f.starts) <= now && now <= +new Date(f.ends);
  const submit = async () => {
    if (f.starts && f.ends && new Date(f.starts) > new Date(f.ends)) return void toast.error("结束时间需晚于开始时间");
    setSaving(true);
    try {
      await save("ads", { image_url: f.image_url || null, enabled: f.enabled, project_no: f.project_no.trim(), starts_at: fromLocalInput(f.starts), ends_at: fromLocalInput(f.ends) }, ad.id);
      setInitial(JSON.stringify(f)); toast.success("广告已保存");
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); } finally { setSaving(false); }
  };
  return (
    <Card className={focused ? "ring-2 ring-primary" : undefined}>
      <div id={`ad-${ad.id}`} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-bold">广告 #{ad.seq}</p>
          <div className="flex items-center gap-2">
            {live && <span className="text-xs font-semibold text-positive">生效中</span>}
            <button type="button" onClick={() => setF({ ...f, enabled: !f.enabled })} title="点击切换"><StatusTag s={f.enabled ? "启用" : "停用"} /></button>
          </div>
        </div>
        <ImagePicker value={f.image_url} onChange={(u) => setF({ ...f, image_url: u })} label="广告图" />
        <Field label="跳转项目编号"><input className={inputCls} value={f.project_no} onChange={(e) => setF({ ...f, project_no: e.target.value })} placeholder="例如 P001" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="开始时间"><input type="datetime-local" className={inputCls} value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></Field>
          <Field label="结束时间"><input type="datetime-local" className={inputCls} value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></Field>
        </div>
        <div className="flex items-center justify-end gap-3">{dirty && <span className="text-xs font-semibold text-primary">有修改还没保存</span>}<Button onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存"}</Button></div>
      </div>
    </Card>
  );
}
