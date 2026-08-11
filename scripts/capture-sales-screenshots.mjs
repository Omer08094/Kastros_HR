#!/usr/bin/env node
/**
 * Captures UI screenshots for the sales playbook PDF.
 * Uses session JWT cookies (same format as signSession) â€” no password in script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { SignJWT } from "jose";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
loadEnv({ path: path.join(root, ".env.local") });
const outDir = path.join(root, "docs/sales/screenshots");
const demoJsonPath = path.join(root, "data/kastros-hr-demo.json");
const BASE_URL = (process.env.SALES_CAPTURE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const DEMO_SECRET = "dev-only-secret-min-32-chars!!";
const NAV_TIMEOUT = 120_000;

const DEMO_USERS = {
  hr_admin: { email: "amelia.hr@kastros.demo", role: "hr_admin", name: "Amelia Chen" },
  employee: { email: "elena.employee@kastros.demo", role: "employee", name: "Elena Rossi" },
  ceo: { email: "ceo@kastros.demo", role: "ceo", name: "Hassan Malik" },
};

function getSecret() {
  const secret = process.env.KASTROS_SESSION_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  return new TextEncoder().encode(DEMO_SECRET);
}

async function signSession(user) {
  return new SignJWT({ role: user.role, name: user.name })
    .setSubject(user.email)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("kastros-hr")
    .setAudience("kastros-hr-app")
    .sign(getSecret());
}

function loadDemoMeta() {
  try {
    const store = JSON.parse(fs.readFileSync(demoJsonPath, "utf8"));
    return { jobId: store.jobs?.[0]?.id || "job-1", pmdfFormId: store.pmdfForms?.[0]?.id ?? null };
  } catch {
    return { jobId: "job-1", pmdfFormId: null };
  }
}

function buildShots(meta) {
  const shots = [
    { slug: "login", path: "/login", auth: false },
    { slug: "dashboard-employee", path: "/dashboard", role: "employee" },
    { slug: "dashboard-ceo", path: "/dashboard", role: "ceo" },
    { slug: "leave", path: "/leave", role: "employee" },
    { slug: "leave-hr-entitlements", path: "/leave", role: "hr_admin" },
    { slug: "employees", path: "/employees", role: "hr_admin" },
    { slug: "onboarding", path: "/onboarding", role: "hr_admin" },
    { slug: "recruiting", path: "/recruiting", role: "hr_admin" },
    { slug: "apply-portal", path: `/apply/${meta.jobId}`, auth: false },
    { slug: "org-chart", path: "/org-chart", role: "employee" },
    { slug: "performance", path: "/performance", role: "hr_admin" },
    { slug: "training", path: "/training", role: "employee" },
    { slug: "documents", path: "/documents", role: "employee" },
    { slug: "letters", path: "/letters", role: "hr_admin" },
    { slug: "transfer-posting", path: "/transfer-posting", role: "hr_admin" },
    { slug: "cases", path: "/cases", role: "hr_admin" },
    { slug: "organization", path: "/organization", role: "hr_admin" },
    { slug: "settings", path: "/settings", role: "hr_admin" },
    { slug: "user-roles", path: "/user-roles", role: "hr_admin" },
    { slug: "security", path: "/security", role: "hr_admin" },
    { slug: "notifications", path: "/dashboard", role: "hr_admin", after: "open-notifications" },
    { slug: "training-manual", path: "/training-manual/how-to", auth: false },
  ];
  if (meta.pmdfFormId) {
    shots.splice(11, 0, {
      slug: "performance-print",
      path: `/performance/print/${meta.pmdfFormId}`,
      role: "hr_admin",
    });
  }
  return shots;
}

async function setAuthCookie(page, role) {
  const user = DEMO_USERS[role];
  if (!user) throw new Error(`Unknown role: ${role}`);
  const token = await signSession(user);
  const url = new URL(BASE_URL);
  await page.setCookie({
    name: "kastros_hr_session",
    value: token,
    url: BASE_URL,
    domain: url.hostname === "localhost" ? "localhost" : url.hostname,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
}

async function clearSessionCookie(page) {
  const cookies = await page.cookies();
  for (const c of cookies) {
    if (c.name === "kastros_hr_session") await page.deleteCookie(c);
  }
}

async function capture(page, shot) {
  if (shot.auth !== false && shot.role) {
    await setAuthCookie(page, shot.role);
  } else {
    await clearSessionCookie(page);
  }
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "load", timeout: 120_000 });
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 1000));
    if (shot.after === "open-notifications") {
    await page.waitForSelector("header details summary", { timeout: 20_000 }).catch(() => null);
    const summaries = await page.$$("header details summary");
    const bell = summaries[0];
    if (bell) {
      await bell.click();
      await new Promise((r) => setTimeout(r, 800));
    } else {
      console.warn("Warning: notifications bell (header details summary) not found");
    }
  }
  await page.screenshot({ path: path.join(outDir, `${shot.slug}.png`), fullPage: false });
  console.log("Captured:", shot.slug);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const shots = buildShots(loadDemoMeta());
  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.error("Install puppeteer: npm install");
    process.exit(1);
  }
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  for (const shot of shots) {
    try {
      await capture(page, shot);
    } catch (e) {
      console.warn(`Warning: failed ${shot.slug}:`, e.message);
    }
  }
  await browser.close();
  console.log(`Done. ${shots.length} screenshots â†’ ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
