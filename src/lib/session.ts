import { SignJWT, jwtVerify } from "jose";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";

const COOKIE = "kastros_hr_session";

function getSecret(): Uint8Array {
  const secret = process.env.KASTROS_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("KASTROS_SESSION_SECRET is required in production (min 32 characters).");
    }
    return new TextEncoder().encode("dev-only-secret-min-32-chars!!");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: { email: string; role: RoleId; name: string }): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name })
    .setSubject(user.email)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer("kastros-hr")
    .setAudience("kastros-hr-app")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<{ email: string; role: RoleId; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "kastros-hr",
      audience: "kastros-hr-app",
    });
    const email = typeof payload.sub === "string" ? payload.sub : null;
    const roleRaw = payload.role;
    const nameRaw = payload.name;
    if (!email || typeof roleRaw !== "string" || !isRoleId(roleRaw)) return null;
    const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : email;
    return { email, role: roleRaw, name };
  } catch {
    return null;
  }
}

export const sessionCookieName = COOKIE;
