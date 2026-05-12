import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type SavedUpload = { ref: string; originalName: string; contentType: string };

/** PPTX/PDF training decks only; validated by extension (browser MIME is often missing). */
const TRAINING_UPLOAD_EXT = /\.(pdf|pptx|ppt)$/i;

export function isAllowedTrainingMaterialFile(file: File): boolean {
  if (!(file instanceof File) || file.size === 0) return false;
  return TRAINING_UPLOAD_EXT.test(file.name || "");
}

/** Library / personnel scans: common office formats. */
const LIBRARY_DOC_EXT = /\.(pdf|doc|docx|ppt|pptx|png|jpe?g|webp)$/i;

export function isAllowedLibraryDocumentFile(file: File): boolean {
  if (!(file instanceof File) || file.size === 0) return false;
  return LIBRARY_DOC_EXT.test(file.name || "");
}

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
