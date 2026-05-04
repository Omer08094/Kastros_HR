"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/demo-accounts";
import { sessionCookieName, signSession } from "@/lib/session";

export type SignInState = { error?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your work email and password." };
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

  redirect("/dashboard");
}
