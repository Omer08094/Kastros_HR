import { readFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { hasExecAccess } from "@/lib/roles";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees, visibleTraining } from "@/lib/store/policy";
import { uploadsDir } from "@/lib/uploads";
import { storage } from "@/lib/firebase-admin";

type FileMeta = { originalName: string; contentType: string };

function canAccessStoredRef(
  store: Awaited<ReturnType<typeof readStore>>,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  ref: string,
): boolean {
  const trainingRow = store.training.find((t) => t.trainingMaterialStoredRef === ref);
  if (trainingRow) {
    return visibleTraining(store, session).some((t) => t.id === trainingRow.id);
  }

  const appFile = store.jobApplications.find(
    (a) => a.cvStoredRef === ref || a.eduStoredRef === ref || a.certStoredRef === ref,
  );
  if (appFile) return hasExecAccess(session.role);

  const doc = store.documents.find((d) => d.storedRef === ref);
  if (doc?.employeeEmail === null) return hasExecAccess(session.role);

  const ac = store.academics.find((a) => a.storedRef === ref);
  if (ac) {
    const email = ac.employeeEmail.toLowerCase();
    return visibleEmployees(store, session).some((e) => e.email.toLowerCase() === email);
  }

  const profilePhoto = store.employees.find((e) => e.photoStoredRef === ref);
  if (profilePhoto) {
    const email = profilePhoto.email.toLowerCase();
    return visibleEmployees(store, session).some((e) => e.email.toLowerCase() === email);
  }

  const coiSub = store.coiSubmissions.find((s) => s.storedRef === ref);
  if (coiSub) {
    const email = coiSub.employeeEmail.toLowerCase();
    return visibleEmployees(store, session).some((e) => e.email.toLowerCase() === email);
  }

  if (doc) {
    const email = (doc.employeeEmail ?? "").toLowerCase();
    return visibleEmployees(store, session).some((e) => e.email.toLowerCase() === email);
  }

  return false;
}

export async function GET(_req: Request, context: { params: Promise<{ ref: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { ref } = await context.params;
  const normalizedRef = ref.trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(normalizedRef)) return new Response("Bad request", { status: 400 });

  const store = await readStore();
  const knownRef =
    store.documents.some((d) => d.storedRef === normalizedRef) ||
    store.academics.some((a) => a.storedRef === normalizedRef) ||
    store.jobApplications.some(
      (a) =>
        a.cvStoredRef === normalizedRef ||
        a.eduStoredRef === normalizedRef ||
        a.certStoredRef === normalizedRef,
    ) ||
    store.training.some((t) => t.trainingMaterialStoredRef === normalizedRef) ||
    store.employees.some((e) => e.photoStoredRef === normalizedRef) ||
    store.coiSubmissions.some((s) => s.storedRef === normalizedRef);

  if (!knownRef) return new Response("Not found", { status: 404 });

  if (!canAccessStoredRef(store, session, normalizedRef)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (storage) {
    try {
      const bucket = storage.bucket();
      const fileRef = bucket.file(`uploads/${normalizedRef}`);
      const [exists] = await fileRef.exists();
      if (exists) {
        const [metadata] = await fileRef.getMetadata();
        const customMeta = metadata.metadata || {};
        const originalName = customMeta.originalName || "document";
        const contentType = metadata.contentType || "application/octet-stream";

        const [body] = await fileRef.download();
        return new Response(new Uint8Array(body), {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
            "Cache-Control": "private, no-store",
          },
        });
      }
    } catch (e) {
      console.error("[kastros-hr] Failed to read from Firebase Storage, trying local.", e);
    }
  }

  const dir = uploadsDir();
  let meta: FileMeta;
  try {
    meta = JSON.parse(await readFile(join(dir, `${normalizedRef}.meta.json`), "utf8")) as FileMeta;
  } catch {
    meta = { originalName: "document", contentType: "application/octet-stream" };
  }
  let body: Buffer;
  try {
    body = await readFile(join(dir, normalizedRef));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": meta.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(meta.originalName || "document")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
