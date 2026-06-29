import { toBlob } from "html-to-image";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

/** Inline employee photos so export does not depend on blob-URL SVG loading /api routes. */
async function inlineImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try {
        const url = new URL(src, window.location.href).href;
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        img.src = await blobToDataUrl(await res.blob());
        img.removeAttribute("srcset");
      } catch {
        img.remove();
      }
    }),
  );
}

function prepareExportClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.position = "static";
  clone.style.left = "auto";
  clone.style.top = "auto";
  clone.style.willChange = "auto";

  clone.querySelectorAll("a").forEach((anchor) => {
    const card = document.createElement("div");
    card.className = anchor.className;
    card.innerHTML = anchor.innerHTML;
    anchor.replaceWith(card);
  });

  return clone;
}

/** Export an HTML subtree as a PNG blob (2× resolution). */
export async function exportOrgChartPng(source: HTMLElement): Promise<Blob | null> {
  const clone = prepareExportClone(source);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;overflow:visible;background:#faf8f5;";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await inlineImages(clone);
    if (typeof document.fonts?.ready !== "undefined") {
      await document.fonts.ready;
    }

    const blob = await toBlob(clone, {
      backgroundColor: "#faf8f5",
      pixelRatio: 2,
      cacheBust: true,
      skipAutoScale: true,
    });

    return blob;
  } finally {
    document.body.removeChild(host);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
