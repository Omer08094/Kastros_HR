import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "@/lib/session";
import type { RoleId } from "@/lib/roles";

export type Session = {
  email: string;
  role: RoleId;
  name: string;
};

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;
  return verifySession(token);
}
