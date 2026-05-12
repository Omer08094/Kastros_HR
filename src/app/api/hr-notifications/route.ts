import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deriveHrNotifications } from "@/lib/hr-notifications";
import { readStore } from "@/lib/store/persist";

/** GET — lazy notification payload so App Header does not read the store on every RSC navigation. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] });
  const store = await readStore();
  const items = deriveHrNotifications(store, { email: session.email, role: session.role });
  return NextResponse.json({ items });
}
