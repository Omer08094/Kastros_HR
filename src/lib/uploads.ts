import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type SavedUpload = { ref: string; originalName: string; contentType: string };

export function uploadsDir(): string {
  return join(process.cwd(), "data", "uploads");
}

export async function saveFormDataFile(file: File): Promise<SavedUpload | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ref = randomUUID();
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, ref), buf);
  const meta = {
    originalName: file.name || "document",
    contentType: file.type || "application/octet-stream",
  };
  await writeFile(join(dir, `${ref}.meta.json`), JSON.stringify(meta), "utf8");
  return { ref, ...meta };
}

export async function deleteStoredFile(ref: string | null | undefined): Promise<void> {
  if (!ref || !/^[0-9a-f-]{36}$/i.test(ref)) return;
  const dir = uploadsDir();
  await unlink(join(dir, ref)).catch(() => {});
  await unlink(join(dir, `${ref}.meta.json`)).catch(() => {});
}

export async function deleteStoredFiles(refs: Array<string | null | undefined>): Promise<void> {
  await Promise.all(refs.map((r) => deleteStoredFile(r ?? undefined)));
}

export async function emptyUploadsDir(): Promise<void> {
  try {
    const dir = uploadsDir();
    const names = await readdir(dir);
    await Promise.all(names.map((n) => unlink(join(dir, n)).catch(() => {})));
  } catch {
    // directory may not exist yet
  }
}
