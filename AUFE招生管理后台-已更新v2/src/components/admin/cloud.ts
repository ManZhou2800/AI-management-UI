const KEY = "admin-session";

export type AdminSession = { account: string; name: string; token: string; role?: "super_admin" | "advisor" };

export function readSession(): AdminSession | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function writeSession(session: AdminSession | null) {
  if (session) localStorage.setItem(KEY, JSON.stringify(session));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("admin-session"));
}

let demoMode = false;
async function useDemo<T>(action: string, data: Record<string, unknown>) {
  demoMode = true;
  const { demoCloud } = await import("./demo");
  return (await demoCloud(action, data)) as T;
}

export async function cloud<T = unknown>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (demoMode) return useDemo<T>(action, data);
  const session = readSession();
  let response: Response;
  try {
    response = await fetch("/api/cloud", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, adminToken: session?.token || "", actor: session?.account || "", ...data }),
    });
  } catch {
    return useDemo<T>(action, data);
  }
  // No local cloud proxy (e.g. online preview): fall back to browser demo data.
  if (!(response.headers.get("content-type") || "").includes("json")) return useDemo<T>(action, data);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new Error(body.error || "云端没有响应");
  return body.data as T;
}

export function uploadImage(file: File, onProgress?: (ratio: number) => void) {
  return new Promise<{ fileID: string; url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 400 || body.ok === false) reject(new Error(body.error || "上传失败"));
      else resolve(body.data);
    };
    xhr.onerror = () => reject(new Error("上传失败"));
    xhr.send(file);
  });
}
