import { createHash, timingSafeEqual } from "crypto";
import type { RoleId } from "@/lib/roles";

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
    email: "amelia.hr@kastros.demo",
    password: "Demo!Amelia2026",
    role: "hr_admin",
    name: "Amelia Chen",
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

/** Demo / env bootstrap logins are opt-in only (local testing). Production uses Firebase Auth. */
function demoAccountsEnabled(): boolean {
  return process.env.KASTROS_DEMO_USERS === "true";
}

export function authenticate(email: string, password: string): DemoUser | null {
  if (!demoAccountsEnabled()) return null;

  const normalized = email.trim().toLowerCase();

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
