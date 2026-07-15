import nodemailer from "nodemailer";

export type HrEmailPayload = {
  to: string[];
  subject: string;
  headline: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

type LeaveEmailPayload = {
  to: string[];
  subject: string;
  headline: string;
  intro: string;
  request: {
    requesterEmail: string;
    kind: string;
    start: string;
    end: string;
    note: string | null;
  };
  actionLabel: string;
  actionUrl: string;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  if (!host || !portRaw || !user || !pass || !from) return null;
  const port = Number(portRaw);
  if (!Number.isFinite(port)) return null;
  return { host, port, user, pass, from };
}

function isAuthError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const e = err as { code?: string; responseCode?: number };
    return e.code === "EAUTH" || e.responseCode === 535;
  }
  return false;
}

function smtpAuthHint(host: string, user: string): string {
  const h = host.toLowerCase();
  const u = user.toLowerCase();
  if (u.endsWith("@gmail.com") && !h.includes("gmail")) {
    return " Your sender is Gmail but SMTP_HOST is not smtp.gmail.com.";
  }
  if (h.includes("office365") || h.includes("outlook")) {
    return " For Microsoft 365, use an app password if MFA is enabled and ensure SMTP AUTH is enabled for the mailbox.";
  }
  if (u.endsWith("@gmail.com")) {
    return " Gmail requires an App Password (not your normal password) when 2FA is on.";
  }
  return "";
}

function createSmtpTransport() {
  const cfg = smtpConfig();
  if (!cfg) return null;
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return { cfg, transport };
}

export type SmtpVerifyResult = { ok: true } | { ok: false; authFailed: boolean; message: string };

/** Verify SMTP credentials once before sending a batch (fails fast on bad login). */
export async function verifySmtpConnection(): Promise<SmtpVerifyResult> {
  const created = createSmtpTransport();
  if (!created) {
    return { ok: false, authFailed: false, message: "SMTP is not configured." };
  }
  try {
    await created.transport.verify();
    return { ok: true };
  } catch (err) {
    const authFailed = isAuthError(err);
    const hint = smtpAuthHint(created.cfg.host, created.cfg.user);
    const message = authFailed
      ? `SMTP login failed for ${created.cfg.user} on ${created.cfg.host}.${hint}`
      : err instanceof Error
        ? err.message
        : "SMTP connection failed.";
    console.warn("[kastros-hr] SMTP verify failed", err);
    return { ok: false, authFailed, message };
  } finally {
    created.transport.close();
  }
}

function uniqEmails(emails: string[]): string[] {
  return [...new Set(emails.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

function notificationHtml(payload: HrEmailPayload): string {
  const cta =
    payload.actionLabel && payload.actionUrl
      ? `<p style="margin:0 0 18px">
      <a href="${payload.actionUrl}" style="background:#006837;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600">
        ${payload.actionLabel}
      </a>
    </p>`
      : "";
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.45;color:#1e293b">
    <h2 style="margin:0 0 10px">${payload.headline}</h2>
    <p style="margin:0 0 16px">${payload.body}</p>
    ${cta}
    <p style="margin:0;color:#64748b;font-size:12px">Kastros HR automated notification</p>
  </div>`;
}

function leaveEmailHtml(payload: LeaveEmailPayload): string {
  const note = payload.request.note?.trim() ? payload.request.note.trim() : "—";
  return notificationHtml({
    to: payload.to,
    subject: payload.subject,
    headline: payload.headline,
    body: `${payload.intro}<br/><br/>
      <strong>Employee:</strong> ${payload.request.requesterEmail}<br/>
      <strong>Type:</strong> ${payload.request.kind}<br/>
      <strong>Dates:</strong> ${payload.request.start} to ${payload.request.end}<br/>
      <strong>Note:</strong> ${note}`,
    actionLabel: payload.actionLabel,
    actionUrl: payload.actionUrl,
  });
}

/** True when all required SMTP env vars are present for outbound mail. */
export function isSmtpConfigured(): boolean {
  return smtpConfig() !== null;
}

async function sendMail(payload: { to: string[]; subject: string; html: string; text: string }): Promise<boolean> {
  const created = createSmtpTransport();
  const recipients = uniqEmails(payload.to);
  if (!created || recipients.length === 0) return false;

  try {
    await created.transport.sendMail({
      from: created.cfg.from,
      to: recipients.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return true;
  } catch (err) {
    console.warn("[kastros-hr] email send failed", err);
    return false;
  } finally {
    created.transport.close();
  }
}

/** Send using an already-verified transport (for batch sends). */
export async function sendHrNotificationEmailWithTransport(
  transport: nodemailer.Transporter,
  from: string,
  payload: HrEmailPayload,
): Promise<boolean> {
  const recipients = uniqEmails(payload.to);
  if (recipients.length === 0) return false;
  const text = [
    payload.headline,
    "",
    payload.body.replace(/<br\s*\/?>/gi, "\n"),
    payload.actionLabel && payload.actionUrl ? `\n${payload.actionLabel}: ${payload.actionUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await transport.sendMail({
      from,
      to: recipients.join(", "),
      subject: payload.subject,
      html: notificationHtml(payload),
      text,
    });
    return true;
  } catch (err) {
    console.warn("[kastros-hr] email send failed", err);
    return false;
  }
}

/** Open one SMTP connection for multiple sends; caller must call close() in finally. */
export function openSmtpTransport(): { transport: nodemailer.Transporter; from: string } | null {
  const created = createSmtpTransport();
  if (!created) return null;
  return { transport: created.transport, from: created.cfg.from };
}

/** Generic portal / HR notification email. */
export async function sendHrNotificationEmail(payload: HrEmailPayload): Promise<boolean> {
  const text = [
    payload.headline,
    "",
    payload.body.replace(/<br\s*\/?>/gi, "\n"),
    payload.actionLabel && payload.actionUrl ? `\n${payload.actionLabel}: ${payload.actionUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return sendMail({
    to: payload.to,
    subject: payload.subject,
    html: notificationHtml(payload),
    text,
  });
}

export async function sendLeaveApprovalEmail(payload: LeaveEmailPayload): Promise<boolean> {
  const note = payload.request.note?.trim() ? payload.request.note.trim() : "—";
  const text = `${payload.headline}\n\n${payload.intro}\n\nEmployee: ${payload.request.requesterEmail}\nType: ${payload.request.kind}\nDates: ${payload.request.start} to ${payload.request.end}\nNote: ${note}\n\n${payload.actionLabel}: ${payload.actionUrl}`;
  return sendMail({
    to: payload.to,
    subject: payload.subject,
    html: leaveEmailHtml(payload),
    text,
  });
}
