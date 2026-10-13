import { useState } from "react";
import { cloud, writeSession } from "./cloud";
import { Button } from "@/components/ui/button";
import { inputCls } from "./ui";

export function DurhamLogo({ className = "h-16 w-16" }: { className?: string }) {
  return <img src="/aufe-logo.png" alt="安徽财经大学" className={`${className} rounded-full object-cover`} />;
}

export function LoginView() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return setError("请输入有效的邮箱");
    if (password.length < 6) return setError("密码至少 6 位");
    setBusy(true);
    try {
      if (mode === "register") {
        const n = name.trim();
        if (n.length < 1 || n.length > 40) return setError("姓名 1 到 40 字");
        if (password !== confirm) return setError("两次输入的密码不一致");
        await cloud("registerAdmin", { account: em, name: n, password });
        setNotice("注册成功，可以直接登录。");
        setMode("login"); setPassword(""); setConfirm("");
      } else {
        const session = await cloud<{ account: string; name: string; token: string }>("loginAdmin", { account: em, password });
        writeSession(session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <DurhamLogo className="h-24 w-24" />
        <h1 className="mt-5 text-center font-display text-[1.7rem] font-bold leading-snug tracking-tight text-primary">安徽财经大学海外教育</h1>
        <p className="mt-1 text-center font-display text-lg font-bold text-primary">招生管理后台</p>
        <p className="mt-1 text-center text-sm font-semibold tracking-wide text-primary/80">AUFE Overseas Education</p>
        <form onSubmit={submit} className="mt-8 w-full space-y-4 rounded-[1.6rem] border border-white/80 bg-card p-6 shadow-[0_16px_40px_-24px_oklch(0.32_0.11_262/0.55)]">
          <div>
            <h2 className="font-display text-xl font-bold text-primary">{mode === "login" ? "管理员登录" : "注册账号"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "仅招生管理人员可进入。未登录不能查看后台。" : "注册后需超级管理员启用，账号保存在腾讯云开发。"}</p>
          </div>
          {mode === "register" && <label className="block text-sm font-semibold text-primary">姓名<input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-2`} /></label>}
          <label className="block text-sm font-semibold text-primary">邮箱<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-2`} /></label>
          <label className="block text-sm font-semibold text-primary">密码<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-2`} /></label>
          {mode === "register" && <label className="block text-sm font-semibold text-primary">确认密码<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputCls} mt-2`} /></label>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="rounded-2xl bg-positive-soft p-3 text-sm text-positive">{notice}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "请稍候…" : mode === "login" ? "登录" : "注册"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login"
              ? <>还没有账号？<button type="button" className="font-semibold text-primary" onClick={() => { setMode("register"); setError(""); }}>立即注册</button></>
              : <>已有账号？<button type="button" className="font-semibold text-primary" onClick={() => { setMode("login"); setError(""); }}>返回登录</button></>}
          </p>
        </form>
        <p className="mt-8 text-xs text-muted-foreground">© 2026 安徽财经大学海外教育</p>
      </div>
    </div>
  );
}
