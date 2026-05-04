"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName } from "@/lib/session";

export async function signOut() {
  const jar = await cookies();
  jar.delete(sessionCookieName);
  redirect("/login");
}
