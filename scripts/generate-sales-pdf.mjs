#!/usr/bin/env node
/**
 * Generates docs/Kastros-HR-Sales-Playbook.pdf from HTML source.
 * Usage: node scripts/generate-sales-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "docs/sales/Kastros-HR-Sales-Playbook.html");
const pdfPath = path.join(root, "docs/Kastros-HR-Sales-Playbook.pdf");
const publicPdf = path.join(root, "public/downloads/Kastros-HR-Sales-Playbook.pdf");

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error("Missing:", htmlPath);
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.error("Install puppeteer: npm install");
    process.exit(1);
  }

  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  const fileUrl = `file://${htmlPath.replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 120_000 });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#64748b;padding:0 14mm;text-align:center;">Kastros HR · Sales Playbook · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await browser.close();

  fs.mkdirSync(path.dirname(publicPdf), { recursive: true });
  fs.copyFileSync(pdfPath, publicPdf);
  console.log("Wrote:", pdfPath);
  console.log("Copy:", publicPdf);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
