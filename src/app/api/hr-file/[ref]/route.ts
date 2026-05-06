import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store/persist";
import { visibleEmployees } from "@/lib/store/policy";
import { uploadsDir } from "@/lib/uploads";

type FileMeta = { originalName: string; contentType: string };

export async function GET(_req: Request, context: { params: Promise<{ ref: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { ref } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return new Response("Bad request", { status: 400 });

  const store = await readStore();
  const doc = store.documents.find((d) => d.storedRef === ref);
  const ac = store.academics.find((a) => a.storedRef === ref);
  const appCv = store.jobApplications.find((a) => a.cvStoredRef === ref);
  if (!doc && !ac && !appCv) return new Response("Not found", { status: 404 });

  if (appCv) {
    if (!["hr_admin", "recruiter", "ceo"].includes(session.role)) {
      return new Response("Forbidden", { status: 403 });
    }
  } else if (doc && doc.employeeEmail === null) {
    if (!["hr_admin", "recruiter", "ceo"].includes(session.role)) {
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    const email = (doc?.employeeEmail ?? ac!.employeeEmail).toLowerCase();
    const visible = visibleEmployees(store, session);
    if (!visible.some((e) => e.email.toLowerCase() === email)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const dir = uploadsDir();
  let meta: FileMeta;
  try {
    meta = JSON.parse(await readFile(join(dir, `${ref}.meta.json`), "utf8")) as FileMeta;
  } catch {
    meta = { originalName: "document", contentType: "application/octet-stream" };
  }
  let body: Buffer;
  try {
    body = await readFile(join(dir, ref));
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
