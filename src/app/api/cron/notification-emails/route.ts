import { NextResponse } from "next/server";
import { syncAllPortalNotificationEmails } from "@/lib/notification-email-sync";

/** GET — daily cron to email portal notifications (probation, birthdays, training, etc.). */
export async function GET(request: Request) {
  const secret =
    process.env.KASTROS_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllPortalNotificationEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[kastros-hr] notification email cron failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
