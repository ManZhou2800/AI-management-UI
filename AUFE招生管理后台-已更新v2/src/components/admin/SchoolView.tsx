import { useEffect, useState, type ReactNode } from "react";
import { Bell, BookOpen, ChevronRight, FileText, IdCard, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageLibrary, ImagePicker } from "./ImageLibrary";
import { useQueryClient } from "@tanstack/react-query";
import { saveSetting, useSetting, useUnsavedGuard } from "./data";
import { cn } from "@/lib/utils";
import { Card, Field, PageHeader, SaveBar, inputCls, textareaCls } from "./ui";

type Entry = { title: string; desc: string; target: string };
type StaffSync = { discoverHour: number; discoverMinute: number; refreshEveryHours: number; batchSize: number };
type Campus = { title: string; desc: string; image: string };
type Interview = { name: string; direction: string; quote: string; image: string; items: string[] };
type Stat = { value: string; label: string };
type Home = {
  brand: { title: string; subtitle: string; english: string };
  notice: { version: string; badge: string; body: string };
  points: string[];
  stats: Stat[];
  footer: { text: string; consult: string; about: string };
};
type School = {
  intro: { title: string; image: string; body: string };
  entries: Entry[];
  campus: Campus[];
  interviews: Interview[];
  contact: Record<string, string>;
  home: Home;
  staffSync: StaffSync;
};
const ENTRY_SLOTS = [
  { title: "学校介绍", desc: "了解安徽财经大学", target: "about", icon: FileText },
  { title: "本科留学", desc: "1+3, 2+2 国际本科\n国内过渡，直通海外名校", target: "undergraduate", icon: BookOpen },
  { title: "硕博留学", desc: "本升硕，硕升博\n硕博连读全程方案", target: "postgraduate", icon: Pencil },
  { title: "联系我们", desc: "专属顾问一对一咨询", target: "contact", icon: IdCard },
];
const defaultStaffSync = (): StaffSync => ({ discoverHour: 3, discoverMinute: 0, refreshEveryHours: 1, batchSize: 8 });
const defaultHome = (): Home => ({
  brand: { title: "安徽财经大学海外教育", subtitle: "国际教育一站式服务平台", english: "AUFE Overseas Education" },
  notice: { version: "1.0", badge: "NEW", body: "" },
  points: [
    "专业顾问团队全程陪伴，从选校到签证全流程指导",
    "深耕国际教育多年，助力每一位学子实现留学梦想",
  ],
  stats: [
    { value: "1959年", label: "建校年份" },
    { value: "50+", label: "海外合作院校" },
    { value: "7所", label: "直读升学院校" },
    { value: "安徽第1", label: "US News排名" },
  ],
  footer: { text: "想了解更多留学项目？我们随时在。", consult: "在线客服", about: "关于我们" },
});
const empty: School = {
  intro: { title: "", image: "", body: "" },
  entries: ENTRY_SLOTS.map((item) => ({ title: item.title, desc: item.desc, target: item.target })),
  campus: [],
  interviews: [],
  contact: {},
  home: defaultHome(),
  staffSync: defaultStaffSync(),
};
type Bubble = "brand" | "notice" | "points" | "footer" | "faculty" | "campus" | "interviews" | `entry-${number}` | `stat-${number}`;
const CONTACT_FIELDS: [string, string][] = [
  ["school", "学校名称"], ["address", "地址"], ["lng", "经度"], ["lat", "纬度"], ["phone", "咨询电话"], ["email", "咨询邮箱"],
  ["aiPhone", "AI Hub 电话"], ["aiEmail", "AI Hub 邮箱"], ["website", "学校网页"], ["hours", "工作时间"],
];

function changedKeys(before: School, after: School) {
  const keys: (keyof School)[] = ["intro", "entries", "campus", "interviews", "contact", "home", "staffSync"];
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function withHome(data?: Partial<School>): School {
  const home = { ...defaultHome(), ...(data?.home || {}) };
  home.stats = defaultHome().stats.map((item, i) => ({ ...item, ...(data?.home?.stats?.[i] || {}) }));
  home.points = (data?.home?.points?.length ? data.home.points : defaultHome().points).slice(0, 4);
  const incoming = data?.entries || [];
  const legacy = incoming.some((item) => ["faculty", "campus", "interviews"].includes(item.target));
  return {
    ...empty,
    ...data,
    home,
    intro: { ...empty.intro, ...(data?.intro || {}) },
    contact: data?.contact || {},
    staffSync: { ...defaultStaffSync(), ...(data?.staffSync || {}) },
    campus: data?.campus || [],
    interviews: data?.interviews || [],
    entries: ENTRY_SLOTS.map((slot, i) => ({
      title: slot.title,
      desc: slot.desc,
      target: slot.target,
      ...(!legacy && incoming[i] ? { title: incoming[i].title || slot.title, desc: incoming[i].desc || slot.desc } : {}),
    })),
  };
}

export function SchoolView() {
  const { data, isLoading } = useSetting<School>("school");
  const [s, setS] = useState<School>(empty);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [base, setBase] = useState<School>(empty);
  const qc = useQueryClient();
  const dirty = JSON.stringify(s) !== JSON.stringify(base);
  useUnsavedGuard(dirty);

  useEffect(() => {
    if (!data) return;
    const next = withHome(data);
    setBase(next);
    setS((current) => (current === empty ? next : current));
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const changed = changedKeys(base, s).filter((key) => !["home", "entries", "staffSync"].includes(key));
      if (changed.length > 1) {
        toast.error("学校介绍、校园、访谈和联系方式一次改一块再保存");
        return;
      }
      await saveSetting("school", s);
      setBase(s);
      qc.setQueryData(["site_settings", "school"], s);
      toast.success("已保存");
    }
    catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); }
    finally { setSaving(false); }
  };
  const setCampus = (i: number, p: Partial<Campus>) => setS({ ...s, campus: s.campus.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const setIv = (i: number, p: Partial<Interview>) => setS({ ...s, interviews: s.interviews.map((c, j) => (j === i ? { ...c, ...p } : c)) });



  const setEntry = (i: number, patch: Partial<Entry>) => setS({ ...s, entries: s.entries.map((item, j) => (j === i ? { ...item, ...patch } : item)) });
  const setHome = (patch: Partial<Home>) => setS({ ...s, home: { ...s.home, ...patch } });

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="首页" desc="左边是家长看到的首页。点一张卡片，在右边改这张卡的文字，改完保存。" action={<Button onClick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>} />
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setS(base)} />
      <div className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <PhonePreview school={s} selected={bubble} onSelect={setBubble} />
        <div className="space-y-4">
          {bubble ? (
            <BubbleForm school={s} bubble={bubble} setEntry={setEntry} setHome={setHome} setS={setS} setCampus={setCampus} setIv={setIv} picking={picking} setPicking={setPicking} />
          ) : <Card><p className="text-sm text-muted-foreground">点左侧卡片开始修改。</p></Card>}
        </div>
      </div>
    </div>
  );
}

function Bubble({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("group relative w-full rounded-3xl border bg-card p-4 text-left shadow-sm transition", selected ? "border-primary ring-2 ring-primary/30" : "border-white/80 hover:border-primary/40", className)}>
      <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-secondary text-primary"><Pencil className="size-3" /></span>
      {children}
    </button>
  );
}

function PhonePreview({ school, selected, onSelect }: { school: School; selected: Bubble | null; onSelect: (id: Bubble) => void }) {
  const icons = [FileText, BookOpen, Pencil, IdCard];
  return (
    <div className="mx-auto w-[390px] overflow-hidden rounded-[2rem] bg-[#f7f4ee] px-4 pb-3 pt-6 shadow-[0_16px_40px_-24px_oklch(0.32_0.11_262/0.55)]">
      <div className="flex flex-col items-center">
        <img src="/aufe-logo.png" alt="" className="h-[4.5rem] w-[4.5rem] rounded-full bg-white object-cover" />
        <Bubble selected={selected === "brand"} onClick={() => onSelect("brand")} className="mt-3 border-none bg-transparent p-1 text-center shadow-none">
          <p className="font-display text-[1.35rem] font-bold leading-snug text-[#163a78]">{school.home.brand.title}</p>
          <p className="font-display text-[1.15rem] font-bold leading-snug text-[#163a78]">{school.home.brand.subtitle}</p>
          <p className="text-sm font-semibold text-[#163a78]">{school.home.brand.english}</p>
        </Bubble>
      </div>
      <Bubble selected={selected === "notice"} onClick={() => onSelect("notice")} className="mt-4 flex items-center gap-2 rounded-full bg-white px-3 py-2">
        <Bell className="size-4 text-[#163a78]" />
        <span className="rounded-md bg-[#f3efe6] px-1.5 py-0.5 text-[11px] text-[#163a78]">版本</span>
        <span className="text-sm text-[#163a78]">版本：{school.home.notice.version}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#163a78] px-2.5 py-0.5 text-[11px] font-semibold text-white">{school.home.notice.badge}<ChevronRight className="size-3" /></span>
      </Bubble>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {school.entries.map((entry, i) => {
          const Icon = icons[i] || FileText;
          return (
            <Bubble key={i} selected={selected === `entry-${i}`} onClick={() => onSelect(`entry-${i}`)} className="min-h-[8.5rem] bg-white">
              <Icon className="size-6 text-[#163a78]" strokeWidth={1.6} />
              <p className="mt-4 font-display text-[15px] font-bold text-[#163a78]">{entry.title}</p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-[#8b93a7]">{entry.desc}</p>
            </Bubble>
          );
        })}
      </div>
      <Bubble selected={selected === "points"} onClick={() => onSelect("points")} className="mt-4 border-none bg-transparent px-1 py-2 shadow-none">
        <ul className="space-y-2 pr-6 text-[13px] leading-5 text-[#163a78]">{school.home.points.map((point) => <li key={point}>• {point}</li>)}</ul>
      </Bubble>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {school.home.stats.map((stat, i) => (
          <Bubble key={i} selected={selected === `stat-${i}`} onClick={() => onSelect(`stat-${i}`)} className="bg-white px-3 py-5 text-center">
            <p className="font-display text-[1.65rem] font-bold leading-none text-[#163a78]">{stat.value}</p>
            <p className="mt-2 text-xs text-[#8b93a7]">{stat.label}</p>
          </Bubble>
        ))}
      </div>
      <Bubble selected={selected === "footer"} onClick={() => onSelect("footer")} className="mt-4 border-none bg-transparent py-2 text-center shadow-none">
        <p className="font-display text-sm font-bold text-[#163a78]">{school.home.footer.text}</p>
        <div className="mt-3 flex justify-center gap-3">
          <span className="rounded-full bg-[#163a78] px-5 py-1.5 text-xs text-white">{school.home.footer.consult}</span>
          <span className="rounded-full bg-[#163a78] px-5 py-1.5 text-xs text-white">{school.home.footer.about}</span>
        </div>
      </Bubble>
      <p className="mt-4 text-center text-[11px] text-[#8b93a7]">© 2026 安徽财经大学海外教育</p>
      <div className="mt-3 grid grid-cols-3 border-t border-[#eadfce] pt-2 text-center text-[11px] text-[#8b93a7]">
        <span className="font-semibold text-[#163a78]">首页</span><span>服务</span><span>我的</span>
      </div>
    </div>
  );
}

function BubbleForm({ school, bubble, setEntry, setHome, setS, setCampus, setIv, picking, setPicking }: {
  school: School;
  bubble: Bubble;
  setEntry: (i: number, patch: Partial<Entry>) => void;
  setHome: (patch: Partial<Home>) => void;
  setS: (s: School) => void;
  setCampus: (i: number, p: Partial<Campus>) => void;
  setIv: (i: number, p: Partial<Interview>) => void;
  picking: number | null;
  setPicking: (n: number | null) => void;
}) {
  if (bubble === "brand") {
    return (
      <Card className="space-y-4">
        <p className="font-display font-bold text-primary">校徽下的三行标题</p>
        <Field label="主标题"><input className={inputCls} value={school.home.brand.title} onChange={(e) => setHome({ brand: { ...school.home.brand, title: e.target.value } })} /></Field>
        <Field label="副标题"><input className={inputCls} value={school.home.brand.subtitle} onChange={(e) => setHome({ brand: { ...school.home.brand, subtitle: e.target.value } })} /></Field>
        <Field label="英文名"><input className={inputCls} value={school.home.brand.english} onChange={(e) => setHome({ brand: { ...school.home.brand, english: e.target.value } })} /></Field>
      </Card>
    );
  }
  if (bubble === "notice") {
    return (
      <Card className="space-y-4">
        <p className="font-display font-bold text-primary">版本条</p>
        <Field label="版本号"><input className={inputCls} value={school.home.notice.version} onChange={(e) => setHome({ notice: { ...school.home.notice, version: e.target.value } })} /></Field>
        <Field label="右侧标签"><input className={inputCls} value={school.home.notice.badge} onChange={(e) => setHome({ notice: { ...school.home.notice, badge: e.target.value } })} /></Field>
        <Field label="点开后的说明"><textarea rows={4} className={textareaCls} value={school.home.notice.body} onChange={(e) => setHome({ notice: { ...school.home.notice, body: e.target.value } })} /></Field>
      </Card>
    );
  }
  if (bubble.startsWith("entry-")) {
    const i = Number(bubble.slice(6));
    const entry = school.entries[i]!;
    return (
      <Card className="space-y-4">
        <p className="font-display font-bold text-primary">{entry.title || ENTRY_SLOTS[i]?.title}</p>
        <Field label="卡片标题" hint={`不超过 8 个字；默认「${ENTRY_SLOTS[i]?.title}」`}><input className={inputCls} maxLength={8} value={entry.title} onChange={(e) => setEntry(i, { title: e.target.value })} /></Field>
        <Field label="说明" hint="需要换行时直接回车"><textarea rows={3} className={textareaCls} value={entry.desc} onChange={(e) => setEntry(i, { desc: e.target.value })} /></Field>
        <ModuleBody index={i} school={school} setS={setS} />
      </Card>
    );
  }
  if (bubble === "faculty") return <FacultySync school={school} setS={setS} />;
  if (bubble === "campus") return <CampusEditor school={school} setS={setS} setCampus={setCampus} picking={picking} setPicking={setPicking} />;
  if (bubble === "interviews") return <InterviewEditor school={school} setS={setS} setIv={setIv} />;
  if (bubble === "points") {
    return (
      <Card className="space-y-4">
        <p className="font-display font-bold text-primary">卖点</p>
        {school.home.points.map((point, i) => (
          <div key={i} className="flex gap-2">
            <input className={inputCls} value={point} onChange={(e) => setHome({ points: school.home.points.map((item, j) => (j === i ? e.target.value : item)) })} />
            <Button variant="ghost" size="icon" aria-label="删除卖点" onClick={() => setHome({ points: school.home.points.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {school.home.points.length < 4 && <Button variant="outline" size="sm" onClick={() => setHome({ points: [...school.home.points, ""] })}><Plus className="size-3.5" />添加一条</Button>}
      </Card>
    );
  }
  if (bubble.startsWith("stat-")) {
    const i = Number(bubble.slice(5));
    const stat = school.home.stats[i];
    if (!stat) return null;
    const write = (patch: Partial<Stat>) => setHome({ stats: school.home.stats.map((item, j) => (j === i ? { ...item, ...patch } : item)) });
    return (
      <Card className="space-y-4">
        <p className="font-display font-bold text-primary">{stat.label || "这一张"}</p>
        <Field label="标题"><input className={inputCls} value={stat.value} onChange={(e) => write({ value: e.target.value })} /></Field>
        <Field label="说明"><input className={inputCls} value={stat.label} onChange={(e) => write({ label: e.target.value })} /></Field>
      </Card>
    );
  }
  return (
    <Card className="space-y-4">
      <p className="font-display font-bold text-primary">底部引导</p>
      <Field label="一句文案"><input className={inputCls} value={school.home.footer.text} onChange={(e) => setHome({ footer: { ...school.home.footer, text: e.target.value } })} /></Field>
      <Field label="在线客服按钮"><input className={inputCls} value={school.home.footer.consult} onChange={(e) => setHome({ footer: { ...school.home.footer, consult: e.target.value } })} /></Field>
      <Field label="关于我们按钮"><input className={inputCls} value={school.home.footer.about} onChange={(e) => setHome({ footer: { ...school.home.footer, about: e.target.value } })} /></Field>
    </Card>
  );
}

function ModuleBody({ index, school, setS }: { index: number; school: School; setS: (s: School) => void }) {
  const s = school;
  if (index === 1) {
    return (
      <Card className="space-y-3">
        <p className="font-display text-sm font-bold text-primary">本科留学</p>
        <p className="text-sm text-muted-foreground">这一张卡打开家长端「服务」里的本科项目。项目的添加、上架和置顶在左侧「服务」里改。</p>
      </Card>
    );
  }
  if (index === 2) {
    return (
      <Card className="space-y-3">
        <p className="font-display text-sm font-bold text-primary">硕博留学</p>
        <p className="text-sm text-muted-foreground">这一张卡打开家长端「服务」里的硕博项目。项目的添加、上架和置顶在左侧「服务」里改。</p>
      </Card>
    );
  }
  if (index === 3) {
    return (
      <div className="space-y-4">
        <p className="font-display text-sm font-bold text-primary">联系方式</p>
        {CONTACT_FIELDS.map(([k, label]) => (
          <Field key={k} label={label}>
            {k === "hours" ? (
              <textarea rows={2} className={textareaCls} value={s.contact[k] ?? ""} onChange={(e) => setS({ ...s, contact: { ...s.contact, [k]: e.target.value } })} />
            ) : (
              <input className={inputCls} value={s.contact[k] ?? ""} onChange={(e) => setS({ ...s, contact: { ...s.contact, [k]: e.target.value } })} />
            )}
          </Field>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4 border-t border-border pt-4">
      <p className="font-display text-sm font-bold text-primary">学校介绍正文</p>
      <Field label="页面大标题"><input className={inputCls} value={s.intro.title} onChange={(e) => setS({ ...s, intro: { ...s.intro, title: e.target.value } })} /></Field>
      <Field label="顶部图"><ImagePicker value={s.intro.image} onChange={(u) => setS({ ...s, intro: { ...s.intro, image: u } })} /></Field>
      <Field label="正文"><textarea rows={8} className={textareaCls} value={s.intro.body} onChange={(e) => setS({ ...s, intro: { ...s.intro, body: e.target.value } })} /></Field>
    </div>
  );
}

function FacultySync({ school, setS }: { school: School; setS: (s: School) => void }) {
  const sync = school.staffSync;
  const setSync = (patch: Partial<StaffSync>) => setS({ ...school, staffSync: { ...sync, ...patch } });
  return (
    <Card className="space-y-4">
      <div>
        <p className="font-display font-bold text-primary">师资力量</p>
        <p className="mt-1 text-xs text-muted-foreground">名单从学校各院系官网读取。到了设定时间才开始更新。</p>
      </div>
        <Field label="更新时间">
          <div className="flex gap-2">
            <select aria-label="更新时间类型" className={inputCls} value="每天" onChange={() => undefined}>
              <option value="每天">每天</option>
            </select>
            <input aria-label="更新时间" className={inputCls} type="time" value={`${String(sync.discoverHour).padStart(2, "0")}:${String(sync.discoverMinute).padStart(2, "0")}`} onChange={(e) => {
              const [hour, minute] = e.target.value.split(":");
              setSync({ discoverHour: Number(hour), discoverMinute: Number(minute) });
            }} />
          </div>
        </Field>
        <Field label="更新频率">
          <select className={inputCls} value={sync.refreshEveryHours} onChange={(e) => setSync({ refreshEveryHours: Number(e.target.value) })}>
            {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => <option key={hours} value={hours}>{hours === 24 ? "每天一次" : `每 ${hours} 小时`}</option>)}
          </select>
        </Field>
        <Field label="每次更新人数" hint="1 到 40 人">
          <input className={inputCls} type="number" min={1} max={40} value={sync.batchSize} onChange={(e) => setSync({ batchSize: Math.min(40, Math.max(1, Number(e.target.value) || 1)) })} />
        </Field>
    </Card>
  );
}

function CampusEditor({ school, setS, setCampus, picking, setPicking }: {
  school: School;
  setS: (s: School) => void;
  setCampus: (i: number, p: Partial<Campus>) => void;
  picking: number | null;
  setPicking: (n: number | null) => void;
}) {
  const s = school;
  return (
    <div className="space-y-4">
      <p className="font-display text-lg font-bold text-primary">校园环境</p>
      <div className="grid gap-4 sm:grid-cols-2">
            {s.campus.map((c, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/80 bg-card shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]">
                <div className="aspect-[4/3] bg-muted">{c.image ? <img src={c.image} alt={c.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs text-muted-foreground">暂无图片</div>}</div>
                <div className="space-y-3 p-4">
                  <input className={inputCls} placeholder="标题" value={c.title} onChange={(e) => setCampus(i, { title: e.target.value })} />
                  <input className={inputCls} placeholder="一句说明" value={c.desc} onChange={(e) => setCampus(i, { desc: e.target.value })} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPicking(picking === i ? null : i)}>{picking === i ? "收起" : "更换"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setS({ ...s, campus: s.campus.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" />删除</Button>
                  </div>
                  {picking === i && <ImageLibrary value={c.image} onSelect={(u) => setCampus(i, { image: u })} />}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setS({ ...s, campus: [...s.campus, { title: "", desc: "", image: "" }] })} className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/20 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Plus className="size-5" />添加图片
            </button>
      </div>
    </div>
  );
}

function InterviewEditor({ school, setS, setIv }: { school: School; setS: (s: School) => void; setIv: (i: number, p: Partial<Interview>) => void }) {
  const s = school;
  return (
    <div className="space-y-4">
      <p className="font-display text-lg font-bold text-primary">学生访谈</p>
          {s.interviews.map((iv, i) => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center justify-between"><p className="text-sm font-bold">访谈 {i + 1}</p><Button variant="ghost" size="sm" onClick={() => setS({ ...s, interviews: s.interviews.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" />删除</Button></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="姓名"><input className={inputCls} value={iv.name} onChange={(e) => setIv(i, { name: e.target.value })} /></Field>
                <Field label="录取方向"><input className={inputCls} value={iv.direction} onChange={(e) => setIv(i, { direction: e.target.value })} /></Field>
              </div>
              <Field label="一句话"><input className={inputCls} value={iv.quote} onChange={(e) => setIv(i, { quote: e.target.value })} /></Field>
              <Field label="封面"><ImagePicker value={iv.image} onChange={(u) => setIv(i, { image: u })} /></Field>
              <div>
                <p className="text-sm font-semibold">内容标题</p>
                <div className="mt-2 space-y-2">
                  {iv.items.map((t, k) => (
                    <div key={k} className="flex gap-2">
                      <input className={inputCls} value={t} onChange={(e) => setIv(i, { items: iv.items.map((x, m) => (m === k ? e.target.value : x)) })} />
                      <Button variant="ghost" size="icon" aria-label="删除标题" onClick={() => setIv(i, { items: iv.items.filter((_, m) => m !== k) })}><X className="size-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setIv(i, { items: [...iv.items, ""] })}><Plus className="size-3.5" />添加内容标题</Button>
                </div>
              </div>
            </Card>
          ))}
      <Button variant="outline" onClick={() => setS({ ...s, interviews: [...s.interviews, { name: "", direction: "", quote: "", image: "", items: [] }] })}><Plus className="size-4" />添加学生访谈</Button>
    </div>
  );
}
