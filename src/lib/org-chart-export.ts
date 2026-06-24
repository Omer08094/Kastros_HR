const ORG_CHART_EXPORT_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  .org-tree, .org-tree ul, .org-tree li { list-style: none; margin: 0; padding: 0; }
  .org-tree ul { display: flex; justify-content: center; padding-top: 1rem; position: relative; }
  .org-tree > ul { padding-top: 0; }
  .org-tree li { display: flex; flex-direction: column; align-items: center; position: relative; padding: 1rem 0.25rem 0; }
  .org-tree ul::before { content: ""; position: absolute; top: 0; left: 50%; height: 1.25rem; border-left: 1px solid #c9b8a3; }
  .org-tree > ul::before { display: none; }
  .org-tree li::before, .org-tree li::after { content: ""; position: absolute; top: 0; width: 50%; height: 1.25rem; border-top: 1px solid #c9b8a3; }
  .org-tree li::before { right: 50%; border-right: 1px solid #c9b8a3; }
  .org-tree li::after { left: 50%; border-left: 1px solid #c9b8a3; }
  .org-tree li:only-child::before, .org-tree li:only-child::after { display: none; }
  .org-tree li:only-child { padding-top: 0; }
  .org-tree li:first-child::before { border: none; }
  .org-tree li:last-child::after { border: none; }
  .org-tree li:last-child::before { border-right: 1px solid #c9b8a3; border-radius: 0 0.35rem 0 0; }
  .org-tree li:first-child::after { border-left: 1px solid #c9b8a3; border-radius: 0.35rem 0 0 0; }
  .org-card { display: block; width: 11rem; border-radius: 1rem; border: 1px solid #e8e0d5; background: #fff; padding: 0.625rem; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-decoration: none; color: inherit; }
  .org-card .name { font-weight: 600; font-size: 13px; color: #1a3d2e; margin-top: 0.375rem; }
  .org-card .title { font-size: 11px; color: #52796f; margin-top: 0.125rem; }
  .org-card .meta { font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #52796f; margin-top: 0.25rem; }
  .org-avatar { width: 2.5rem; height: 2.5rem; border-radius: 9999px; margin: 0 auto; background: #f5f0e8; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: rgba(26,61,46,0.7); overflow: hidden; }
  .org-avatar img { width: 100%; height: 100%; object-fit: cover; }
`;

/** Export an HTML subtree as a PNG blob (2× resolution). */
export async function exportOrgChartPng(source: HTMLElement): Promise<Blob | null> {
  const width = source.scrollWidth;
  const height = source.scrollHeight;

  const sandbox = document.createElement("div");
  sandbox.setAttribute("aria-hidden", "true");
  sandbox.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;background:#faf8f5;`;

  const style = document.createElement("style");
  style.textContent = ORG_CHART_EXPORT_CSS;
  sandbox.appendChild(style);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.querySelectorAll("a").forEach((a) => {
    const card = document.createElement("div");
    card.className = `org-card ${a.className}`;
    card.innerHTML = a.innerHTML;
    a.replaceWith(card);
  });
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  const exportWidth = clone.scrollWidth || width;
  const exportHeight = clone.scrollHeight || height;

  try {
    const html = new XMLSerializer().serializeToString(clone);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="background:#faf8f5;width:${exportWidth}px;min-height:${exportHeight}px;padding:24px">
      <style>${ORG_CHART_EXPORT_CSS}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`;

    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render chart image."));
      img.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = exportWidth * scale;
    canvas.height = exportHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#faf8f5";
    ctx.fillRect(0, 0, exportWidth, exportHeight);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } finally {
    document.body.removeChild(sandbox);
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
