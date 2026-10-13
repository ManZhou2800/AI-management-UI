import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputCls =
  "h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm font-normal shadow-sm outline-none focus:ring-2 focus:ring-ring";
export const textareaCls =
  "w-full resize-y rounded-2xl border border-input bg-card p-4 text-sm font-normal shadow-sm outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-semibold">
      <span className="flex items-center justify-between">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-primary">{title}</h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <div className={cn("rounded-3xl border border-white/80 bg-card p-5 shadow-[0_10px_30px_-18px_oklch(0.32_0.11_262/0.45)]", className)}>{children}</div>;
}

export function Segmented<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm">
      {items.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === i ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

const tones: Record<string, string> = {
  新线索: "bg-info-soft text-info",
  跟进中: "bg-warning-soft text-warning",
  已报名: "bg-positive-soft text-positive",
  无效: "bg-muted text-muted-foreground",
  待确认: "bg-warning-soft text-warning",
  已确认: "bg-info-soft text-info",
  已到访: "bg-positive-soft text-positive",
  已取消: "bg-muted text-muted-foreground",
  上架: "bg-positive-soft text-positive",
  下架: "bg-muted text-muted-foreground",
  启用: "bg-positive-soft text-positive",
  停用: "bg-muted text-muted-foreground",
  置顶: "bg-secondary text-primary",
};
export function StatusTag({ s }: { s: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[s] ?? "bg-muted text-muted-foreground")}>{s}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-primary/20 bg-card px-5 py-14 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Bottom bar shown while a form has unsaved edits, so it is obvious that 保存 still needs clicking. */
export function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard?: () => void }) {
  if (!dirty) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/20 bg-card/95 shadow-lg backdrop-blur lg:left-[272px]">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-7">
        <p className="text-sm font-semibold text-primary">有修改还没保存</p>
        <div className="flex gap-2">
          {onDiscard && <button type="button" onClick={onDiscard} className="h-10 rounded-full border border-input px-4 text-sm font-semibold hover:bg-secondary">撤销修改</button>}
          <button type="button" onClick={onSave} disabled={saving} className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "保存中…" : "保存"}</button>
        </div>
      </div>
    </div>
  );
}
