import { NextResponse } from "next/server";
import { syncSessionRoleFromFirebase } from "@/lib/auth";
import { verifySession } from "@/lib/session-server";
import { sessionCookieName } from "@/lib/session";
import { cookies } from "next/headers";

/** Refresh the session cookie when Firebase role claims change (e.g. after HR Admin promotion). */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session: synced, updated } = await syncSessionRoleFromFirebase(session);
  return NextResponse.json({ role: synced.role, updated });
}
