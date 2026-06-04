/** Rich job descriptions stored as sanitized HTML. Legacy plain/markdown still supported on read. */

const HTML_TAG = /<(p|h[1-6]|ul|ol|li|strong|em|u|div|br|a)\b/i;

export function isRichHtmlDescription(raw: string): boolean {
  return HTML_TAG.test(raw.trim());
}

/** Normalize description from forms before persisting (server action — dynamic import avoids SSR bundle issues). */
export async function normalizeStoredJobDescription(raw: string): Promise<string | null> {
  const t = raw.trim();
  if (!t || t === "<p></p>") return null;
  if (isRichHtmlDescription(t)) {
    const { sanitizeJobDescriptionHtml } = await import("@/lib/sanitize-job-html");
    const safe = sanitizeJobDescriptionHtml(t).trim();
    return safe && safe !== "<p></p>" ? safe : null;
  }
  return t;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Load legacy plain text or markdown into the rich editor as HTML. */
export function descriptionToEditorHtml(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (isRichHtmlDescription(t)) return t;

  const blocks = t.split(/\n\n+/).filter((b) => b.trim());
  if (blocks.length === 0) return `<p>${escapeHtml(t)}</p>`;

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const htmlLines = lines.map((line) => {
        let s = escapeHtml(line);
        s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/^###\s+(.+)$/, "<strong>$1</strong>");
        s = s.replace(/^##\s+(.+)$/, "<strong>$1</strong>");
        if (/^[-*]\s+/.test(line)) {
          return `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`;
        }
        return s;
      });

      if (htmlLines.every((l) => l.startsWith("<li>"))) {
        return `<ul>${htmlLines.join("")}</ul>`;
      }

      const inner = htmlLines.join("<br>");
      if (block.startsWith("### ") || block.startsWith("## ")) {
        const title = block.replace(/^#{2,3}\s+/, "").split("\n")[0] ?? block;
        const rest = block.includes("\n") ? block.slice(block.indexOf("\n") + 1) : "";
        const body = rest ? `<p>${escapeHtml(rest).replace(/\n/g, "<br>")}</p>` : "";
        return `<h3>${escapeHtml(title)}</h3>${body}`;
      }

      return `<p>${inner}</p>`;
    })
    .join("");
}

/** Plain text for LinkedIn / exports. */
export function stripHtmlForPlainText(html: string): string {
  let t = html.replace(/\r\n/g, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p>\s*<p>/gi, "\n\n");
  t = t.replace(/<\/h[1-6]>/gi, "\n\n");
  t = t.replace(/<\/li>\s*<li>/gi, "\n");
  t = t.replace(/<li>/gi, "• ");
  t = t.replace(/<\/li>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&nbsp;/g, " ");
  t = t.replace(/&amp;/g, "&");
  t = t.replace(/&lt;/g, "<");
  t = t.replace(/&gt;/g, ">");
  t = t.replace(/&quot;/g, '"');
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}
