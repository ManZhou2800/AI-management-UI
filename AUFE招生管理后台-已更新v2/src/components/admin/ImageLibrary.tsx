import { useRef, useState, type ChangeEvent } from "react";
import { Check, ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImage } from "./cloud";
import { cloud } from "./cloud";
import { useMutate, useTable } from "./data";

type Uploading = { preview: string; progress: number; done: boolean };

/**
 * Shared image library: one row of thumbnails, selected = purple frame,
 * uploaded images can be deleted, dashed "上传图片" at the end.
 */
export function ImageLibrary({ value, onSelect }: { value?: string | null | undefined; onSelect?: ((url: string) => void) | undefined }) {
  const { data: images = [] } = useTable("images", "created_at", false, { refetchOnMount: "always" });
  const { invalidate } = useMutate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading | null>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("请选择图片文件");
    if (file.size > 5 * 1024 * 1024) return void toast.error("图片不能超过 5MB");
    const preview = URL.createObjectURL(file);
    setUploading({ preview, progress: 0, done: false });
    try {
      const saved = await uploadImage(file, (ratio) => setUploading((u) => u && { ...u, progress: Math.round(ratio * 100) }));
      await cloud("adminKeepUpload", { fileID: saved.fileID, url: saved.url });
      setUploading((u) => u && { ...u, progress: 100, done: true });
      await invalidate("images");
      onSelect?.(saved.url);
      window.setTimeout(() => setUploading(null), 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
      setUploading(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("确定删除这张图片？已使用它的内容将不再显示图片。")) return;
    try {
      await cloud("adminRemove", { table: "images", id });
      await invalidate("images");
      toast.success("图片已删除");
    } catch (err) { toast.error(err instanceof Error ? err.message : "删除失败"); }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {images.map((img) => {
        const selected = !!value && value === img.url;
        return (
          <div key={img.id} className="relative shrink-0">
            <button
              type="button"
              onClick={() => onSelect?.(img.url)}
              disabled={!onSelect}
              className={cn(
                "block size-24 overflow-hidden rounded-md border-2 bg-muted",
                selected ? "border-primary ring-2 ring-primary/30" : "border-transparent",
                onSelect && "hover:border-primary/50",
              )}
            >
              <img src={img.url} alt="图片库图片" className="size-full object-cover" loading="lazy" />
            </button>
            {selected && <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
            <button type="button" onClick={() => remove(img.id)} className="absolute right-1 top-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-semibold text-background hover:bg-destructive">
              删除
            </button>
          </div>
        );
      })}
      {uploading && (
        <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
          <img src={uploading.preview} alt="上传预览" className={cn("size-full object-cover transition-all duration-500", uploading.done ? "blur-0" : "scale-110 blur-md")} />
          {!uploading.done && (
            <>
              <div className="absolute inset-x-0 bottom-0 bg-info/55 transition-[height] duration-200" style={{ height: `${uploading.progress}%` }} />
              <span className="absolute inset-0 grid place-items-center text-xs font-bold text-background drop-shadow">{uploading.progress}%</span>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        disabled={!!uploading}
        onClick={() => inputRef.current?.click()}
        className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-input text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
      >
        <Upload className="size-4" />上传图片
      </button>
    </div>
  );
}

/** Current image + the shared library, always visible so every page shows the same images. */
export function ImagePicker({ value, onChange, label = "图片" }: { value?: string | null; onChange: (url: string) => void; label?: string }) {
  return (
    <div className="space-y-3">
      <div className="grid h-24 w-32 place-items-center overflow-hidden rounded-md border border-border bg-muted">
        {value ? <img src={value} alt={label} className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
      </div>
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs text-muted-foreground">从图片库点选，或上传新图片</p>
        <ImageLibrary value={value} onSelect={onChange} />
      </div>
    </div>
  );
}
