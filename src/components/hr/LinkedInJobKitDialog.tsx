"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { JobPosting } from "@/lib/store/types";
import { BRAND_LOGO } from "@/lib/brand-assets";
import { buildLinkedInJobPostText } from "@/lib/linkedin-job-post";

const CANVAS_W = 1200;
const CANVAS_H = 627;
/** Higher = sharper downloaded PNG (LinkedIn accepts large images). */
const EXPORT_PIXEL_RATIO = 2;

/** Matches transparent logo (#2B3990 / #006837): clean, modern, minimal. */
const BRAND = {
  royal: "#2B3990",
  forest: "#006837",
  ink: "#1e293b",
  muted: "#64748b",
  soft: "#94a3b8",
  /** Soft mint accent (hero-style highlight), used very lightly */
  mint: "#5ecf9a",
} as const;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    if (joined.length < text.length) {
      let last = lines[maxLines - 1] ?? "";
      last = last.replace(/…+$/, "");
      while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo failed to load"));
    img.src = url;
  });
}

/**
 * Very light diagonal wash: soft green-grey (top-left) → cool blue-grey (bottom-right),
 * plus a whisper of mint — evokes kastros-style hero overlay without heavy color.
 */
function drawSimpleLinkedInBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const main = ctx.createLinearGradient(0, 0, w, h);
  main.addColorStop(0, "#ecf4ef");
  main.addColorStop(0.35, "#f0f5f2");
  main.addColorStop(0.65, "#eef2f7");
  main.addColorStop(1, "#e9eff6");
  ctx.fillStyle = main;
  ctx.fillRect(0, 0, w, h);

  const mintMist = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.35, h * 0.28, w * 0.85);
  mintMist.addColorStop(0, "rgba(94, 207, 154, 0.12)");
  mintMist.addColorStop(0.5, "rgba(94, 207, 154, 0.04)");
  mintMist.addColorStop(1, "rgba(94, 207, 154, 0)");
  ctx.fillStyle = mintMist;
  ctx.fillRect(0, 0, w, h);

  const navyMist = ctx.createRadialGradient(w * 0.88, h * 0.92, 0, w * 0.78, h * 0.82, w * 0.7);
  navyMist.addColorStop(0, "rgba(30, 58, 95, 0.1)");
  navyMist.addColorStop(1, "rgba(30, 58, 95, 0)");
  ctx.fillStyle = navyMist;
  ctx.fillRect(0, 0, w, h);
}

async function renderJobCardCanvas(params: {
  canvas: HTMLCanvasElement;
  job: JobPosting;
  logoUrl: string;
}): Promise<void> {
  const { canvas, job, logoUrl } = params;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const dpr = EXPORT_PIXEL_RATIO;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawSimpleLinkedInBackground(ctx, CANVAS_W, CANVAS_H);

  const contentCenterX = CANVAS_W / 2;
  const sidePad = 80;
  const titleMaxW = CANVAS_W - sidePad * 2;
  const footerY = CANVAS_H - 26;
  const footerReserve = CANVAS_H - footerY + 10;

  ctx.font = '700 46px "Fraunces", Georgia, "Times New Roman", serif';
  const titleLines = wrapLines(ctx, job.title, titleMaxW, 3);
  const titleLineCount = titleLines.length;

  const logoSlot = 380;
  const gapLogoText = 12;
  const titleLineStep = 40;
  /** Extra air between text rows (baselines are cumulative). */
  const offsetEyebrow = 12;
  const gapEyebrowToHiring = 28;
  const gapHiringToTitle = 38;
  const gapTitleToLocation = 22;

  let logoImg: HTMLImageElement | null = null;
  let logoH = 0;
  try {
    logoImg = await loadImage(logoUrl);
    if (logoImg.naturalWidth > 0) {
      const sc = Math.min(1, logoSlot / logoImg.naturalWidth);
      logoH = logoImg.naturalHeight * sc;
    }
  } catch {
    logoImg = null;
  }

  const textBlockH =
    offsetEyebrow +
    gapEyebrowToHiring +
    gapHiringToTitle +
    titleLineCount * titleLineStep +
    gapTitleToLocation +
    28;

  const stackH = (logoH > 0 ? logoH + gapLogoText : 20) + textBlockH;
  const contentTop = Math.max(16, (CANVAS_H - footerReserve - stackH) / 2);

  if (logoImg && logoImg.naturalWidth > 0) {
    const sc = Math.min(1, logoSlot / logoImg.naturalWidth);
    const lw = logoImg.naturalWidth * sc;
    const lh = logoImg.naturalHeight * sc;
    ctx.drawImage(logoImg, contentCenterX - lw / 2, contentTop, lw, lh);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let y = contentTop + (logoH > 0 ? logoH + gapLogoText : 18);

  ctx.fillStyle = BRAND.muted;
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  y += offsetEyebrow;
  ctx.fillText("AGRICULTURAL COMMODITIES · CAREERS", contentCenterX, y);

  ctx.fillStyle = BRAND.soft;
  ctx.font = '500 22px ui-sans-serif, system-ui, sans-serif';
  y += gapEyebrowToHiring;
  ctx.fillText("We're hiring", contentCenterX, y);

  ctx.font = '700 46px "Fraunces", Georgia, "Times New Roman", serif';
  ctx.fillStyle = BRAND.royal;
  y += gapHiringToTitle;
  for (const ln of titleLines) {
    ctx.fillText(ln, contentCenterX, y);
    y += titleLineStep;
  }

  ctx.font = '600 25px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = BRAND.mint;
  y += gapTitleToLocation;
  ctx.fillText(job.location, contentCenterX, y);

  ctx.font = '500 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = BRAND.muted;
  ctx.fillText("KASTROS · kastros.co · Apply via the link in the post", contentCenterX, footerY);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export function LinkedInJobKitDialog({
  job,
  applyFullUrl,
  open,
  onClose,
}: {
  job: JobPosting | null;
  applyFullUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [postText, setPostText] = useState("");
  const [drawError, setDrawError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const [busy, setBusy] = useState(false);

  const redraw = useCallback(async () => {
    if (!job || !canvasRef.current) return;
    setDrawError(null);
    setBusy(true);
    try {
      const logoUrl = `${window.location.origin}${BRAND_LOGO}`;
      await renderJobCardCanvas({ canvas: canvasRef.current, job, logoUrl });
    } catch {
      setDrawError("Could not draw the image. Add your transparent logo at public/brand/kastros-logo.png (a real PNG with alpha, not a JPEG renamed).");
    } finally {
      setBusy(false);
    }
  }, [job]);

  useEffect(() => {
    if (!open || !job) return;
    setPostText(
      buildLinkedInJobPostText({
        title: job.title,
        location: job.location,
        description: job.description,
        applyUrl: applyFullUrl,
      }),
    );
    const t = requestAnimationFrame(() => {
      void redraw();
    });
    return () => cancelAnimationFrame(t);
  }, [open, job, applyFullUrl, redraw]);

  useEffect(() => {
    if (!open) setCopied(null);
  }, [open]);

  if (!open || !job) return null;

  const activeJob = job;

  function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `kastros-${activeJob.id}-linkedin.png`);
    }, "image/png");
  }

  async function handleCopyPost() {
    await copyToClipboard(postText);
    setCopied("text");
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleCopyLink() {
    await copyToClipboard(applyFullUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-kastros-ink/40 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-kastros-sand bg-kastros-cream p-5 shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold text-kastros-forest">
              LinkedIn post kit
            </h2>
            <p className="mt-1 text-sm text-kastros-sage">{activeJob.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-kastros-sage hover:bg-kastros-sand/60"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm text-kastros-sage">
          Download the image for your feed (2× resolution for a crisp upload), copy the post text (link included), or copy the apply URL.
          Place your transparent PNG at <code className="text-kastros-ink">public/brand/kastros-logo.png</code> — the template draws it as-is
          (no automatic background removal).
        </p>

        <div className="mt-4 rounded-xl border border-kastros-sand bg-white p-3">
          <div className="relative overflow-hidden rounded-lg bg-kastros-sand/40">
            <canvas
              ref={canvasRef}
              className="mx-auto h-auto w-full max-w-full"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            />
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-sm text-kastros-sage">
                Rendering…
              </div>
            ) : null}
          </div>
          {drawError ? <p className="mt-2 text-sm text-red-700">{drawError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={busy}
              className="rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => void redraw()}
              disabled={busy}
              className="rounded-xl border border-kastros-sand bg-white px-4 py-2 text-sm font-semibold text-kastros-forest disabled:opacity-50"
            >
              Refresh image
            </button>
          </div>
        </div>

        <label className="mt-5 block text-sm">
          <span className="font-medium text-kastros-forest">Post text</span>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={12}
            className="mt-1 w-full rounded-xl border border-kastros-sand bg-white px-3 py-2 font-sans text-sm leading-relaxed text-kastros-ink"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopyPost()}
            className="rounded-xl bg-kastros-forest px-4 py-2 text-sm font-semibold text-white"
          >
            {copied === "text" ? "Copied post" : "Copy post text"}
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="rounded-xl border border-kastros-brandBlue/25 bg-kastros-cream px-4 py-2 text-sm font-semibold text-kastros-forest ring-1 ring-kastros-brandGreen/15"
          >
            {copied === "link" ? "Copied link" : "Copy apply link only"}
          </button>
        </div>

        <p className="mt-2 break-all text-xs text-kastros-sage">{applyFullUrl}</p>
      </div>
    </div>
  );
}
