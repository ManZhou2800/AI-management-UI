import { useMemo, useState } from "react";
import { ArrowLeft, ImageIcon, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "./ImageLibrary";
import { confirmLeave, useMutate, useTable, useUnsavedGuard, type Row } from "./data";
import { Card, Chip, Empty, Field, PageHeader, SaveBar, StatusTag, inputCls, textareaCls } from "./ui";

const CATEGORIES = ["国际本科", "硕士项目", "本科直博"];
const STATUSES = ["上架", "下架"];
const TAG_GROUPS = ["国家", "学制", "方向", "合作院校", "专业方向", "培养优势"];
type Project = Row<"projects">;
type TagMap = Record<string, string[]>;

export function ProjectsView() {
  const { data: projects = [] } = useTable("projects");
  const { save } = useMutate();
  const [editing, setEditing] = useState<Project | "new" | null>(null);

  const sorted = useMemo(
    () => [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.created_at) - +new Date(a.created_at)),
    [projects],
  );

  if (editing) return <ProjectForm project={editing === "new" ? null : editing} onBack={() => setEditing(null)} />;

  const act = async (p: Project, values: Partial<Project>, msg: string) => {
    try { await save("projects", values, p.id); toast.success(msg); } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="服务" desc="对应家长端底部「服务」里的本科留学、硕博留学。置顶的项目排在最前，可同时置顶多个。" action={<Button onClick={() => setEditing("new")}><Plus className="size-4" />添加项目</Button>} />
      {sorted.length === 0 ? <Empty>还没有项目，点右上角「添加项目」</Empty> : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-white/80 bg-card shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]">
          {sorted.map((p) => {
            const tags = Object.values((p.tags ?? {}) as TagMap).flat();
            return (
              <div key={p.id} className="flex gap-4 p-4">
                <div className="grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
                  {p.cover_url ? <img src={p.cover_url} alt={p.name} className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.name || "未命名项目"}</p>
                    <StatusTag s={p.status} />{p.pinned && <StatusTag s="置顶" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.category} · {p.highlight}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{tags.slice(0, 8).map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">{t}</span>)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>修改</Button>
                    <Button size="sm" variant="outline" onClick={() => act(p, { status: p.status === "上架" ? "下架" : "上架" }, p.status === "上架" ? "已下架" : "已上架")}>{p.status === "上架" ? "下架" : "上架"}</Button>
                    <Button size="sm" variant={p.pinned ? "subtle" : "outline"} onClick={() => act(p, { pinned: !p.pinned }, p.pinned ? "已取消置顶" : "已置顶")}><Pin className="size-3.5" />{p.pinned ? "取消置顶" : "置顶"}</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectForm({ project, onBack: close }: { project: Project | null; onBack: () => void }) {
  const { data: allTags = [] } = useTable("tags", "created_at", true);
  const { save } = useMutate();
  const [f, setF] = useState({
    name: project?.name ?? "", highlight: project?.highlight ?? "", cover_url: project?.cover_url ?? "",
    overview: project?.overview ?? "", category: project?.category ?? "国际本科", status: project?.status ?? "下架",
    tags: ((project?.tags ?? {}) as TagMap),
  });
  const [newTag, setNewTag] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [initial] = useState(() => JSON.stringify(f));
  const dirty = JSON.stringify(f) !== initial;
  useUnsavedGuard(dirty);
  const onBack = () => { if (confirmLeave()) close(); };

  const toggle = (g: string, t: string) => {
    const cur = f.tags[g] ?? [];
    setF({ ...f, tags: { ...f.tags, [g]: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] } });
  };
  const addTag = async (g: string) => {
    const name = (newTag[g] ?? "").trim();
    if (!name || name.length > 20) return void toast.error("标签 1 到 20 字");
    try {
      await save("tags", { grp: g, name });
      toggle(g, name); setNewTag({ ...newTag, [g]: "" }); setExpanded({ ...expanded, [g]: true });
      toast.success("新标签已保存");
    } catch { toast.error("标签已存在或保存失败"); }
  };
  const submit = async () => {
    if (!f.name.trim()) return void toast.error("请填写项目名称");
    if (f.highlight.length > 20) return void toast.error("亮点不超过 20 字");
    setSaving(true);
    try {
      await save("projects", { ...f, cover_url: f.cover_url || null, updated_at: new Date().toISOString() }, project?.id);
      toast.success("项目已保存"); close();
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 pb-20">
      <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4" />返回列表</Button>
      <PageHeader title={project ? "修改项目" : "添加项目"} />
      <Card className="max-w-4xl space-y-6">
        <Field label="项目名称"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="亮点" hint={`${f.highlight.length}/20`}><input maxLength={20} className={inputCls} value={f.highlight} onChange={(e) => setF({ ...f, highlight: e.target.value })} /></Field>
        <div><p className="text-sm font-semibold">分类</p><div className="mt-2 flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c} active={f.category === c} onClick={() => setF({ ...f, category: c })}>{c}</Chip>)}</div></div>
        <div><p className="text-sm font-semibold">状态</p><div className="mt-2 flex flex-wrap gap-2">{STATUSES.map((c) => <Chip key={c} active={f.status === c} onClick={() => setF({ ...f, status: c })}>{c}</Chip>)}</div></div>
        {TAG_GROUPS.map((g) => {
          const opts = allTags.filter((t) => t.grp === g).map((t) => t.name);
          const shown = expanded[g] ? opts : opts.slice(0, 8);
          return (
            <div key={g}>
              <p className="text-sm font-semibold">{g}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {shown.map((t) => <Chip key={t} active={(f.tags[g] ?? []).includes(t)} onClick={() => toggle(g, t)}>{t}</Chip>)}
                {opts.length > 8 && <button type="button" className="text-xs font-semibold text-primary" onClick={() => setExpanded({ ...expanded, [g]: !expanded[g] })}>{expanded[g] ? "收起" : `展开全部 ${opts.length} 个`}</button>}
                <span className="flex items-center gap-1">
                  <input value={newTag[g] ?? ""} onChange={(e) => setNewTag({ ...newTag, [g]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(g))} placeholder="新增标签" className="h-7 w-24 rounded-full border border-dashed border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  <button type="button" onClick={() => addTag(g)} className="text-xs font-semibold text-primary">添加</button>
                </span>
              </div>
            </div>
          );
        })}
        <div>
          <p className="text-sm font-semibold">封面</p>
          <div className="mt-2"><ImagePicker value={f.cover_url} onChange={(u) => setF({ ...f, cover_url: u })} label="封面" /></div>
        </div>
        <Field label="项目概览"><textarea rows={8} className={textareaCls} value={f.overview} onChange={(e) => setF({ ...f, overview: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={onBack}>取消</Button><Button onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存"}</Button></div>
      </Card>
      <SaveBar dirty={dirty} saving={saving} onSave={submit} />
    </div>
  );
}
