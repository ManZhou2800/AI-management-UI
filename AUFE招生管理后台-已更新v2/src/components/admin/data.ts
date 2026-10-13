import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cloud } from "./cloud";

export type TableName = "projects" | "ads" | "leads" | "lead_notes" | "bookings" | "events" | "event_signups" | "images" | "tags" | "profiles" | "user_roles";

// The screens already name every field. Keep the row loose so those names type-check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row<K extends TableName = TableName> = any;

const bundleKey = ["cloud-bundle"];

type Bundle = {
  projects: Row[];
  ads: Row[];
  leads: Row[];
  bookings: Row[];
  events: Row[];
  event_signups: Row[];
  images: Row[];
  tags: Row[];
  profiles: Row[];
  user_roles: Row[];
  school: Record<string, unknown>;
  system: { slotCapacity?: number; hours?: string };
};

function sortRows(rows: Row[], order: string, ascending: boolean) {
  return [...rows].sort((a, b) => {
    const left = a[order];
    const right = b[order];
    const diff = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
    return ascending ? diff : -diff;
  });
}

export function useCloudBundle() {
  return useQuery({
    queryKey: bundleKey,
    queryFn: () => cloud<Bundle>("adminBundle"),
  });
}

export function useTable<K extends TableName>(table: K, order = "created_at", ascending = false, opts: { refetchOnMount?: boolean | "always" } = {}) {
  const query = useCloudBundle();
  const rows = ((query.data?.[table as keyof Bundle] as Row<K>[] | undefined) ?? []);
  return {
    ...query,
    ...opts,
    data: sortRows(rows, order, ascending) as Row<K>[],
  };
}

export function useMutate() {
  const qc = useQueryClient();
  return {
    async save<K extends TableName>(table: K, values: Partial<Row<K>>, id?: string) {
      await cloud("adminSave", { table, id, values });
      await qc.invalidateQueries({ queryKey: bundleKey });
    },
    async remove<K extends TableName>(table: K, id: string) {
      await cloud("adminRemove", { table, id });
      await qc.invalidateQueries({ queryKey: bundleKey });
    },
    invalidate: (table: TableName) => qc.invalidateQueries({ queryKey: [table] }).then(() => qc.invalidateQueries({ queryKey: bundleKey })),
  };
}

export function useSetting<T>(key: string) {
  const query = useCloudBundle();
  const value = key === "school" ? query.data?.school : key === "system" ? query.data?.system : undefined;
  return { ...query, data: value as T | undefined };
}

export async function saveSetting(key: string, value: unknown) {
  await cloud("adminSaveSetting", { key, value });
}

export const fmtDate = (v?: string | null, withTime = true) => {
  if (!v) return "—";
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
};

/** Converts an ISO timestamp to the value format used by datetime-local inputs. */
export const toLocalInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/* ---------- Unsaved-changes guard: shared across views so leaving a page with edits asks first. ---------- */
const dirtyOwners = new Set<symbol>();
export const hasUnsaved = () => dirtyOwners.size > 0;
export const confirmLeave = () => !hasUnsaved() || window.confirm("这一页有修改还没保存，离开后修改会丢失。确定离开吗？");
export function useUnsavedGuard(dirty: boolean) {
  const [id] = useState(() => Symbol("form"));
  useEffect(() => {
    if (dirty) dirtyOwners.add(id); else dirtyOwners.delete(id);
    return () => { dirtyOwners.delete(id); };
  }, [dirty, id]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}
