import { useState } from "react";
import { ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cloud } from "./cloud";
import { fmtDate } from "./data";
import { Card, Field, PageHeader, inputCls } from "./ui";

type AdminAccount = { id: string; account: string; name: string; role: string; createdAt: string; lastLoginAt: string; online: boolean };

export function PermissionsView({ currentId }: { currentId: string }) {
  const { data: profiles = [], refetch } = useQuery({
    queryKey: ["admins"],
    queryFn: () => cloud<AdminAccount[]>("listAdmins"),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const isSuper = (row: AdminAccount) => row.role === "super_admin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    if (name.length < 1 || name.length > 40) return void toast.error("姓名 1 到 40 字");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return void toast.error("邮箱格式不正确");
    if (f.password.length < 6) return void toast.error("密码至少 6 位");
    setBusy(true);
    try {
      await cloud("createAdvisor", { name, account: f.email.trim(), password: f.password });
      await refetch();
      toast.success("一般管理员已创建，可直接登录"); setF({ name: "", email: "", password: "" }); setAdding(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "创建失败"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="权限管理" desc="只有超级管理员可以添加一般管理员。一般管理员登录后看不到这一项。" action={!adding && <Button onClick={() => setAdding(true)}><UserPlus className="size-4" />新增管理员</Button>} />
      {adding && (
        <Card className="max-w-3xl">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between"><p className="font-display text-sm font-bold">新增账号</p><Button type="button" variant="ghost" size="icon" aria-label="收起" onClick={() => setAdding(false)}><X className="size-4" /></Button></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="姓名" hint="1-40 字"><input maxLength={40} className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="邮箱"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
              <Field label="密码" hint="至少 6 位"><input type="password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAdding(false)}>取消</Button><Button type="submit" disabled={busy}>{busy ? "创建中…" : "创建账号"}</Button></div>
          </form>
        </Card>
      )}
      <div className="overflow-x-auto rounded-3xl border border-white/80 bg-card shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/70 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">账号</th><th className="px-5 py-3 font-medium">姓名</th><th className="px-5 py-3 font-medium">注册时间</th><th className="px-5 py-3 font-medium">最近登录</th><th className="px-5 py-3 font-medium">登录状态</th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-5 py-3.5">{p.account}{p.account === currentId ? " · 当前" : ""}</td>
                <td className="px-5 py-3.5 font-semibold"><span className="flex items-center gap-2">{p.name}{isSuper(p) && <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] text-primary"><ShieldCheck className="size-3" />超级管理员</span>}</span></td>
                <td className="px-5 py-3.5 text-muted-foreground">{fmtDate(p.createdAt)}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{p.lastLoginAt ? fmtDate(p.lastLoginAt) : "还没登录"}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.online ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground"}`}>{p.online ? "在线" : "离线"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
