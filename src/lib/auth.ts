import { cookies } from "next/headers";
import { cache } from "react";
import { sessionCookieName, verifySession } from "@/lib/session";
import type { RoleId } from "@/lib/roles";

export type Session = {
  email: string;
  role: RoleId;
  name: string;
};

/** One JWT verify per request even when layout + page both call `getSession()`. */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;
  return verifySession(token);
});
