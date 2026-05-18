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
          setError("Invalid email or password.");
        }
        setPending(false);
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        idToken = await userCredential.user.getIdToken();
      } catch {
        // If Firebase fails, try the demo fallback via server action
        const result = await signInDemo(formData);
        if (result?.error) {
          setError("Invalid email or password.");
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
          placeholder="HR-issued ID or demo account"
        />
        <p className="mt-1.5 text-xs text-kastros-sage">
          Employees: use the email address and temporary password sent via email. Admins: demo accounts or env bootstrap user.
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
          Firebase browser sign-in is off (missing <span className="font-mono">NEXT_PUBLIC_FIREBASE_API_KEY</span> /{" "}
          <span className="font-mono">NEXT_PUBLIC_FIREBASE_PROJECT_ID</span> in <span className="font-mono">.env.local</span>). You can still
          sign in with demo accounts or your <span className="font-mono">KASTROS_HR_*</span> bootstrap user. Add the web app keys from Firebase
          Console and restart <span className="font-mono">next dev</span> to enable employee email/password via Firebase.
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
