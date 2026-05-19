# Firebase authentication & fresh start

Kastros HR uses **Firebase Authentication** for sign-in. There are no hardcoded production users in `.env.local`.

## How accounts work

| Who | How the account is created | Role |
|-----|---------------------------|------|
| **First HR admin (you)** | One-time `npm run bootstrap:fresh` script | `hr_admin` or `ceo` |
| **Employees** | HR adds them under **People → Add team member** | `employee` (Firebase user + custom claim) |
| **Promote to HR / CEO** | **Settings → User roles** (CEO only) | Updates Firebase custom claim `role` |

Sign-in flow:

1. Browser: email + password → Firebase Auth (`signInWithEmailAndPassword`).
2. Server: verifies Firebase ID token, reads custom claim `role`, issues an HTTP-only session cookie (JWT).

## Before first deploy

### Firebase Console

1. **Authentication → Sign-in method** → enable **Email/Password**.
2. **Firestore** → create database (if needed).
3. **Storage** → enable default bucket.
4. After Vercel deploy: **Authentication → Settings → Authorized domains** → add `your-app.vercel.app` (and custom domain).

### Vercel environment variables

Do **not** set `KASTROS_HR_EMAIL` / `KASTROS_HR_PASSWORD` on Vercel.

Required:

- `KASTROS_SESSION_SECRET` (32+ characters)
- All `NEXT_PUBLIC_FIREBASE_*`
- All server `FIREBASE_*` (Admin SDK)

Optional (local dev only):

- `KASTROS_DEMO_USERS=true` — enables built-in `*.kastros.demo` accounts on `/login`

## Fresh start (wipe data + create your admin)

From the project root, with `.env.local` containing Firebase Admin credentials:

```bash
npm run bootstrap:fresh -- --purge-auth \
  --email admin@yourcompany.com \
  --password "YourSecurePass123!" \
  --name "HR Admin" \
  --role hr_admin
```

This will:

- Delete all Firebase Auth users (with `--purge-auth`)
- Clear Firestore document `kastros-hr/store`
- Clear Firebase Storage uploads
- Create your Firebase user with password and role claim
- Seed an empty HR store with one employee row linked to that user

**Roles:** `employee` | `hr_admin` | `ceo`

To wipe data but create no user:

```bash
npm run bootstrap:fresh -- --clear-only --purge-auth
```

## How to log in

1. Open `/login` (local or `https://your-app.vercel.app/login`).
2. Enter the **email** and **password** you passed to `bootstrap:fresh`.
3. You land on the dashboard with permissions for your role.

If login fails on Vercel:

- Add the site hostname to Firebase **Authorized domains**.
- Confirm all env vars are set and redeploy after changing `NEXT_PUBLIC_*`.

## Adding more users

### Employees (default)

1. Sign in as HR admin.
2. **People** → add team member with their work email.
3. The app creates a Firebase Auth user (role `employee`) and stores their HR profile in Firestore.
4. Share the temporary password or password-reset link with them (from your HR process).

### CEO or second admin

**Option A — bootstrap again** (destructive if you use `--purge-auth`):

```bash
npm run bootstrap:fresh -- --email ceo@yourcompany.com --password "..." --name "CEO" --role ceo
```

**Option B — promote in the app:**

1. Bootstrap or add a user as `employee`.
2. Sign in as **CEO** (bootstrap a CEO first if needed).
3. **Settings → User roles** → set their role to `hr_admin` or `ceo`.
4. They must **sign out and sign in again** for the new role to apply.

## Local demo accounts (optional)

Only for development when you do not want real Firebase users:

```env
KASTROS_DEMO_USERS=true
```

Then use the demo table on `/login` (`amelia.hr@kastros.demo`, etc.). **Do not enable this on Vercel production.**
