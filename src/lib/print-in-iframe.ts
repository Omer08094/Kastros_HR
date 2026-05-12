export type PrintInIframeOptions = {
  /** iframe document title (accessibility) */
  title?: string;
  /** Inserted after cloned styles; include @page rules here if needed */
  extraCss?: string;
  delayMs?: number;
};

/**
 * Prints arbitrary HTML with the same Tailwind/global styles as the host page.
 * Avoids printing the full App Router shell (extra blank pages).
 */
export function printInnerHtmlInIframe(innerHtml: string, options?: PrintInIframeOptions): void {
  const { title = "Print", extraCss = "", delayMs = 320 } = options ?? {};

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const baseCss = `
    @page { size: A4; margin: 14mm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff !important;
      height: auto !important;
      min-height: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${extraCss}
  `;

  doc.open();
  doc.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>");
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    doc.write(link.outerHTML);
  });
  document.querySelectorAll("style").forEach((style) => {
    doc.write(style.outerHTML);
  });
  doc.write(`<style>${baseCss}</style></head><body>`);
  doc.write(innerHtml);
  doc.write("</body></html>");
  doc.close();

  const cleanup = () => {
    iframe.remove();
    win.removeEventListener("afterprint", cleanup);
  };
  win.addEventListener("afterprint", cleanup);

  requestAnimationFrame(() => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, delayMs);
  });
}
