"use client";

import { useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth, isFirebaseWebConfigured } from "@/lib/firebase-client";
import { verifyFirebaseToken, signInDemo } from "./actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      let idToken: string | null = null;

      if (!isFirebaseWebConfigured) {
        const result = await signInDemo(formData);
        if (result?.error) {
          setError(result.error ?? "Invalid email or password.");
        }
        setPending(false);
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        idToken = await userCredential.user.getIdToken(true);
      } catch (firebaseErr: unknown) {
        const code =
          typeof firebaseErr === "object" && firebaseErr !== null && "code" in firebaseErr
            ? String((firebaseErr as { code: string }).code)
            : "";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
          setError("Invalid email or password.");
        } else if (code === "auth/too-many-requests") {
          setError("Too many attempts. Wait a moment and try again.");
        } else {
          setError(firebaseErr instanceof Error ? firebaseErr.message : "Could not sign in with Firebase.");
        }
        setPending(false);
        return;
      }
      
      if (idToken) {
        const result = await verifyFirebaseToken(idToken);
        if (result && result.error) {
          setError(result.error);
        }
      }
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-kastros-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2 w-full rounded-xl border border-kastros-sand bg-kastros-cream/60 px-4 py-3 text-sm text-kastros-ink shadow-inner transition placeholder:text-kastros-sage/50 focus:border-kastros-brandBlue focus:bg-white focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30"
          placeholder="you@company.com"
        />
        <p className="mt-1.5 text-xs text-kastros-sage">
          Use the work email and password from your HR onboarding email (Firebase Authentication).
        </p>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-kastros-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-xl border border-kastros-sand bg-kastros-cream/60 px-4 py-3 text-sm text-kastros-ink shadow-inner transition placeholder:text-kastros-sage/50 focus:border-kastros-brandBlue focus:bg-white focus:outline-none focus:ring-2 focus:ring-kastros-brandGreen/30"
          placeholder="••••••••"
        />
      </div>
      {!isFirebaseWebConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Firebase sign-in is not configured (set <span className="font-mono">NEXT_PUBLIC_FIREBASE_*</span> in{" "}
          <span className="font-mono">.env.local</span> and redeploy). For local testing only, set{" "}
          <span className="font-mono">KASTROS_DEMO_USERS=true</span> to enable bundled demo accounts.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-xl bg-kastros-brandGreen px-4 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-kastros-brandGreenDark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
