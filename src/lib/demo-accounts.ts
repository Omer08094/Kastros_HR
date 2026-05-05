import { createHash, timingSafeEqual } from "node:crypto";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";

export type DemoUser = {
  email: string;
  password: string;
  role: RoleId;
  name: string;
};

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeDigestEqual(a: string, b: string): boolean {
  const da = digest(a);
  const db = digest(b);
  return da.length === db.length && timingSafeEqual(da, db);
}

/** Built-in personas for local / demo testing. */
export const DEMO_USERS: DemoUser[] = [
  {
    email: "elena.employee@kastros.demo",
    password: "Demo!Elena2026",
    role: "employee",
    name: "Elena Rossi",
  },
  {
    email: "marcus.manager@kastros.demo",
    password: "Demo!Marcus2026",
    role: "manager",
    name: "Marcus Okonkwo",
  },
  {
    email: "priya.recruiter@kastros.demo",
    password: "Demo!Priya2026",
    role: "recruiter",
    name: "Priya Nair",
  },
  {
    email: "amelia.hr@kastros.demo",
    password: "Demo!Amelia2026",
    role: "hr_admin",
    name: "Amelia Chen",
  },
  {
    email: "jonas.payroll@kastros.demo",
    password: "Demo!Jonas2026",
    role: "payroll",
    name: "Jonas Berg",
  },
  {
    email: "security.admin@kastros.demo",
    password: "Demo!SecOps2026",
    role: "security_admin",
    name: "Noah Sato",
  },
  {
    email: "ceo@kastros.demo",
    password: "Demo!CEO2026",
    role: "ceo",
    name: "Hassan Malik",
  },
  /** Legacy quick path → HR admin (same access as amelia.hr). */
  {
    email: "demo@kastros.co",
    password: "KastrosDemo!2026",
    role: "hr_admin",
    name: "Demo Admin",
  },
];

function envUser(): DemoUser | null {
  const email = process.env.KASTROS_HR_EMAIL?.trim();
  const password = process.env.KASTROS_HR_PASSWORD ?? "";
  if (!email || !password) return null;
  const roleRaw = process.env.KASTROS_HR_ROLE?.trim() || "hr_admin";
  const role = isRoleId(roleRaw) ? roleRaw : "hr_admin";
  const name = process.env.KASTROS_HR_NAME?.trim() || "Configured user";
  return { email, password, role, name };
}

function demoAccountsEnabled(): boolean {
  if (process.env.KASTROS_DEMO_USERS === "true") return true;
  if (process.env.KASTROS_DEMO_USERS === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function authenticate(email: string, password: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();

  const env = envUser();
  if (env) {
    if (safeDigestEqual(normalized, env.email.toLowerCase()) && safeDigestEqual(password, env.password)) {
      return env;
    }
    if (!demoAccountsEnabled()) return null;
  }

  if (!demoAccountsEnabled() && process.env.NODE_ENV === "production") {
    return null;
  }

  for (const u of DEMO_USERS) {
    if (safeDigestEqual(normalized, u.email.toLowerCase()) && safeDigestEqual(password, u.password)) {
      return u;
    }
  }
  return null;
}

export function listDemoAccountsForDisplay(): { email: string; role: RoleId; name: string; password: string }[] {
  return DEMO_USERS.map(({ email, role, name, password }) => ({ email, role, name, password }));
}
