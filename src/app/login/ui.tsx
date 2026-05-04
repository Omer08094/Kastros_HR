"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initial: SignInState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-kastros-ink">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2 w-full rounded-xl border border-kastros-sand bg-kastros-cream/60 px-4 py-3 text-sm text-kastros-ink shadow-inner transition placeholder:text-kastros-sage/50 focus:border-kastros-sage focus:bg-white focus:outline-none focus:ring-2 focus:ring-kastros-gold/30"
          placeholder="you@kastros.co"
        />
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
          className="mt-2 w-full rounded-xl border border-kastros-sand bg-kastros-cream/60 px-4 py-3 text-sm text-kastros-ink shadow-inner transition placeholder:text-kastros-sage/50 focus:border-kastros-sage focus:bg-white focus:outline-none focus:ring-2 focus:ring-kastros-gold/30"
          placeholder="••••••••"
        />
      </div>
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-xl bg-kastros-forest px-4 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-kastros-pine disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
