"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/demo-accounts";
import type { RoleId } from "@/lib/roles";
import { isRoleId } from "@/lib/roles";
import { sessionCookieName } from "@/lib/session";
import { getAdminAuth } from "@/lib/firebase-admin";
import { signSession } from "@/lib/session-server";
import { safeRedirectPath } from "@/lib/auth-redirect";

export type SignInState = { error?: string };

export async function verifyFirebaseToken(idToken: string, next?: string | null): Promise<SignInState | void> {
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) return { error: "No email associated with this account." };

    const roleRaw = decoded.role;
    const role: RoleId =
      typeof roleRaw === "string" && isRoleId(roleRaw) ? roleRaw : "employee";
    const name =
      (typeof decoded.name === "string" && decoded.name.trim()) ||
      (typeof decoded.display_name === "string" && decoded.display_name.trim()) ||
      email;

    // Create a local signed session JWT that can be verified in Edge Runtime (middleware)
    const token = await signSession({ email, role, name });
    
    const jar = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    jar.set(sessionCookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
  } catch (e: any) {
    return { error: `Authentication failed: ${e.message}` };
  }
  redirect(safeRedirectPath(next));
}

export async function signInDemo(formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = authenticate(email, password);
  if (!user) {
    return { error: "Invalid email or password." };
  }

  const token = await signSession({ email: user.email, role: user.role, name: user.name });
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  jar.set(sessionCookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const next = String(formData.get("next") ?? "").trim() || null;
  redirect(safeRedirectPath(next));
}
