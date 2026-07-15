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

/** True when all required SMTP env vars are present for outbound mail. */
export function isSmtpConfigured(): boolean {
  return smtpConfig() !== null;
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

async function sendMail(payload: { to: string[]; subject: string; html: string; text: string }): Promise<boolean> {
  const cfg = smtpConfig();
  const recipients = uniqEmails(payload.to);
  if (!cfg || recipients.length === 0) return false;

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transport.sendMail({
      from: cfg.from,
      to: recipients.join(", "),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return true;
  } catch (err) {
    console.warn("[kastros-hr] email send failed", err);
    return false;
  }
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
