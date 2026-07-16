import { deriveHrNotifications } from "@/lib/hr-notifications";
import { appPublicUrl } from "@/lib/app-url";
import { loadEmployeeAuthRoles } from "@/lib/firebase-auth-roles";
import { sendHrNotificationEmail } from "@/lib/hr-emails";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";
import { mutateStore, readStore } from "@/lib/store/persist";
import type { HrStore } from "@/lib/store/types";

function sentKey(recipientEmail: string, notificationId: string): string {
  return `${recipientEmail.trim().toLowerCase()}:${notificationId}`;
}

/** Skip noisy or duplicate notification ids (leave uses transactional emails). */
export function shouldEmailPortalNotification(notificationId: string): boolean {
  if (notificationId.startsWith("pulse:")) return false;
  if (notificationId.startsWith("leave-")) return false;
  return true;
}

export async function syncPortalNotificationEmails(
  recipientEmail: string,
  role: RoleId,
): Promise<number> {
  const store = await readStore();
  const items = deriveHrNotifications(store, { email: recipientEmail, role });
  const pending = items.filter((item) => {
    if (!shouldEmailPortalNotification(item.id)) return false;
    return !store.notificationEmailsSent[sentKey(recipientEmail, item.id)];
  });
  if (pending.length === 0) return 0;

  const baseUrl = appPublicUrl();
  const newlySent: Record<string, string> = {};
  let sentCount = 0;

  for (const item of pending) {
    const ok = await sendHrNotificationEmail({
      to: [recipientEmail],
      subject: `Kastros HR: ${item.title}`,
      headline: item.title,
      body: item.detail,
      actionLabel: "Open in Kastros HR",
      actionUrl: `${baseUrl}${item.href}`,
    });
    if (ok) {
      newlySent[sentKey(recipientEmail, item.id)] = new Date().toISOString();
      sentCount++;
    }
  }

  if (sentCount > 0) {
    await mutateStore((s) => ({
      next: { ...s, notificationEmailsSent: { ...s.notificationEmailsSent, ...newlySent } },
      result: undefined,
    }));
  }

  return sentCount;
}

async function listNotificationRecipients(store: HrStore): Promise<Array<{ email: string; role: RoleId }>> {
  const rosterEmails = store.employees.map((e) => e.email.toLowerCase());
  const allEmails = [...new Set(rosterEmails)];
  const roles = await loadEmployeeAuthRoles(allEmails);
  const out: Array<{ email: string; role: RoleId }> = [];
  const seen = new Set<string>();

  for (const row of roles) {
    if (!row.hasAuthAccount || !row.role || !isRoleId(row.role)) continue;
    if (seen.has(row.email)) continue;
    seen.add(row.email);
    out.push({ email: row.email, role: row.role });
  }

  return out;
}

/** Daily job: email every signed-in user their current portal notifications. */
export async function syncAllPortalNotificationEmails(): Promise<{ users: number; sent: number }> {
  const store = await readStore();
  const recipients = await listNotificationRecipients(store);
  let sent = 0;
  for (const { email, role } of recipients) {
    sent += await syncPortalNotificationEmails(email, role);
  }
  return { users: recipients.length, sent };
}
