import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageLibrary } from "./ImageLibrary";
import { saveSetting, useSetting } from "./data";
import { Card, Chip, PageHeader, textareaCls } from "./ui";

type Sys = { slotCapacity?: number; hours?: string };

export function SettingsView() {
  const { data } = useSetting<Sys>("system");
  const qc = useQueryClient();
  const [cap, setCap] = useState(100);
  const [hours, setHours] = useState("");
  useEffect(() => { if (data) { setCap(data.slotCapacity ?? 100); setHours(data.hours ?? ""); } }, [data]);

  const persist = async (patch: Sys, msg: string) => {
    try { await saveSetting("system", { ...data, ...patch }); await qc.invalidateQueries({ queryKey: ["site_settings"] }); toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="系统设置" />
      <Card className="space-y-4">
        <div><p className="font-display text-sm font-bold">预约名额</p><p className="mt-1 text-xs text-muted-foreground">每个时段（上午 / 下午）可预约的人数上限</p></div>
        <div className="flex flex-wrap gap-2">{[20, 50, 100, 200].map((n) => <Chip key={n} active={cap === n} onClick={() => setCap(n)}>{n} 人</Chip>)}</div>
        <div className="flex justify-end"><Button onClick={() => persist({ slotCapacity: cap }, "预约名额已保存")}>保存</Button></div>
      </Card>
      <Card className="space-y-4">
        <p className="font-display text-sm font-bold">工作时间</p>
        <textarea rows={3} maxLength={200} className={textareaCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="例如：周一至周五 9:00-17:30" />
        <div className="flex justify-end"><Button onClick={() => persist({ hours: hours.trim() }, "工作时间已保存")}>保存</Button></div>
      </Card>
      <Card className="space-y-4">
        <div><p className="font-display text-sm font-bold">图片库</p><p className="mt-1 text-xs text-muted-foreground">所有页面共用。上传后立即保存到云端，删除后不可恢复。</p></div>
        <ImageLibrary />
      </Card>
    </div>
  );
}
