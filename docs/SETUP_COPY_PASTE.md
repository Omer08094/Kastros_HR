# Kastros HR — copy/paste setup (5 minutes)

## Your login (after bootstrap)

| Field | Value |
|-------|--------|
| **URL** | `https://YOUR-VERCEL-URL.vercel.app/login` (or `http://localhost:3000/login`) |
| **Email** | `admin@kastros.co` |
| **Password** | `KastrosAdmin!2026` |

Change the password later in [Firebase Console → Authentication → Users](https://console.firebase.google.com).

---

## Step 1 — Firebase (2 clicks)

Open: https://console.firebase.google.com/project/kastros-hr-4fa2f/authentication/providers

1. Click **Email/Password** → turn **Enable** ON → **Save**.

*(Authorized domain for Vercel is Step 4 below.)*

---

## Step 2 — Vercel environment variables

Open your Vercel project → **Settings** → **Environment Variables**.

For **each line** in your local `.env.local` file, click **Add** and paste **name** and **value** (Production + Preview).

Required names (values are in your `.env.local` on your PC):

```
KASTROS_SESSION_SECRET
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_STORAGE_BUCKET
```

**Do not add** `KASTROS_HR_EMAIL` / `KASTROS_HR_PASSWORD`.

After saving all variables → **Deployments** → **Redeploy** latest deployment.

---

## Step 3 — Deploy from GitHub

If the repo is connected, push to `main` and Vercel deploys automatically.

Or in Vercel: **Deployments** → **Redeploy**.

---

## Step 4 — Allow your Vercel URL to sign in

After deploy, copy your site URL (example: `kastros-hr-abc123.vercel.app`).

Open: https://console.firebase.google.com/project/kastros-hr-4fa2f/authentication/settings

Under **Authorized domains** → **Add domain** → paste only the hostname (no `https://`):

```
kastros-hr-abc123.vercel.app
```

---

## Step 5 — Sign in

Open `/login` on your Vercel URL and use the table at the top of this file.

---

## Add employees later

1. Sign in as HR admin.
2. **People** → **Add team member** → their work email.
3. Firebase account is created automatically (employee role).
