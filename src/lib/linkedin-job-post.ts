/** LinkedIn-friendly copy from HR’s draft — no external API; formatting + structure only. */

const DEFAULT_COMPANY = "KASTROS";

function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Split long blocks into short paragraphs at sentence boundaries for feed readability. */
export function polishJobDescriptionForLinkedIn(raw: string): string {
  const t = normalizeWhitespace(raw);
  if (!t) return "";

  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return sentences.join(" ");

  const paragraphs: string[] = [];
  let buf: string[] = [];
  for (const s of sentences) {
    buf.push(s.trim());
    if (buf.length >= 2) {
      paragraphs.push(buf.join(" "));
      buf = [];
    }
  }
  if (buf.length) paragraphs.push(buf.join(" "));
  return paragraphs.join("\n\n");
}

function hashtagsForRole(title: string, company: string): string {
  const tags = new Set<string>(["Hiring", "Careers"]);
  const co = company.replace(/[^a-zA-Z0-9]/g, "");
  if (co) tags.add(co);
  for (const w of title.split(/[\s,/·&|-]+/)) {
    const t = w.replace(/[^a-zA-Z0-9]/g, "");
    if (t.length > 2) tags.add(t);
    if (tags.size >= 6) break;
  }
  return [...tags].map((x) => `#${x}`).join(" ");
}

export type LinkedInJobPostInput = {
  title: string;
  location: string;
  description: string | null;
  applyUrl: string;
  companyName?: string;
};

export function buildLinkedInJobPostText(input: LinkedInJobPostInput): string {
  const company = (input.companyName ?? DEFAULT_COMPANY).trim() || DEFAULT_COMPANY;
  const title = input.title.trim();
  const location = input.location.trim();
  const polishedBody = polishJobDescriptionForLinkedIn(input.description ?? "");

  const intro = `We're hiring a ${title} in ${location} at ${company}.`;

  const body =
    polishedBody ||
    "We're looking for someone who brings curiosity, ownership, and great collaboration. If that sounds like you, we'd love to see your application.";

  const cta = `Apply here:\n${input.applyUrl.trim()}`;

  const tags = hashtagsForRole(title, company);

  return `${intro}\n\n${body}\n\n${cta}\n\n${tags}`;
}
