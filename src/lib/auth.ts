import { cookies } from "next/headers";
import { cache } from "react";
import { sessionCookieName } from "@/lib/session";
import { signSession, verifySession } from "@/lib/session-server";
import { getFirebaseRoleForEmail } from "@/lib/firebase-auth-roles";
import type { RoleId } from "@/lib/roles";

export type Session = {
  email: string;
  role: RoleId;
  name: string;
};

function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

async function writeSessionCookie(session: Session): Promise<void> {
  const token = await signSession(session);
  const jar = await cookies();
  jar.set(sessionCookieName, token, sessionCookieOptions());
}

/** Sync session JWT role with Firebase custom claims; returns whether the cookie was updated. */
export async function syncSessionRoleFromFirebase(session: Session): Promise<{ session: Session; updated: boolean }> {
  const liveRole = await getFirebaseRoleForEmail(session.email);
  if (!liveRole || liveRole === session.role) {
    return { session, updated: false };
  }
  const updatedSession = { ...session, role: liveRole };
  await writeSessionCookie(updatedSession);
  return { session: updatedSession, updated: true };
}

/** One JWT verify per request even when layout + page both call `getSession()`. */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const { session: synced } = await syncSessionRoleFromFirebase(session);
  return synced;
});
