# Kastros HR

**Kastros HR** is an internal people-operations platform built for [Kastros](https://www.kastros.co) â€” a global agricultural commodities trading company. It gives HR, managers, and employees one secure place to manage the employee lifecycle: hiring, onboarding, time off, performance, documents, org structure, and compliance workflows.

The app is a **role-based web application** (Employee, HR Admin, CEO) with **Firebase Authentication**, **Firestore-backed data**, secure file storage, in-app notifications, and **email alerts** for approvals and HR milestones.

---

## What it does

Kastros HR replaces scattered spreadsheets and email threads with a single system where:

- **Employees** request leave, complete training, acknowledge policies, and view their own profile and balances.
- **Line managers** approve leave for their direct reports before HR final sign-off.
- **HR Admin** runs recruiting, onboarding, payroll-related records, letters, cases, and company configuration.
- **CEO** has the same operational access as HR Admin, plus an executive dashboard view.

Data is persisted to **Firebase Firestore** in production (with a local JSON fallback for development). Employee photos, CNIC scans, CVs, and HR documents are stored in **Firebase Storage** (or local disk in dev).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, React Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication + HTTP-only session cookies (JWT via `jose`) |
| Database | Firestore (`kastros-hr/store` document) |
| File storage | Firebase Storage / local uploads |
| Email | Nodemailer (SMTP â€” Gmail, Microsoft 365, etc.) |
| Hosting | Vercel (recommended) |

**Node.js 20.9+** is required.

---

## Features

### Overview & self-service

- **Dashboard** â€” role-specific KPIs, probation alerts, pending approvals, and company pulse (CEO view).
- **My leave** â€” request time off, view balances by leave type, track approval status.
- **Expense claims** â€” submit and track reimbursement requests.
- **Notification bell** â€” real-time in-app alerts for approvals, milestones, training, and more.

### People & org

- **People** â€” master-detail employee directory with rich profiles (identity, employment, education, compensation, documents).
- **Onboarding** â€” add team members with full intake forms; creates Firebase login and seeds leave entitlements.
- **Recruiting** â€” job postings, public apply portal (`/apply/[jobId]`), applicant pipeline, approve-to-onboard handoff.
- **Org chart** â€” interactive reporting hierarchy with pan/zoom and PNG export.
- **Transfer / posting** â€” record crossâ€“business-unit movements.

### Time, performance & learning

- **Performance** â€” goals and review records by cycle.
- **Learning** â€” assign training, track completion and attendance, attach materials.

### Letters, documents & compliance

- **Letters** â€” promotion and termination letter workflows.
- **Documents** â€” company-wide and per-employee document library with policy acknowledgement tracking.
- **HR cases** â€” restricted investigation / compliance case management.

### Setup & administration

- **Organization setup** â€” business units (UAE, Karachi, Multan), departments, job descriptions.
- **Settings** â€” leave policy catalog, salary allowance types, company configuration.
- **User roles** â€” assign Employee / HR Admin / CEO via Firebase custom claims.
- **Security** â€” audit trail of HR actions.

### Public surfaces

- **Careers apply portal** â€” candidates apply to open roles without logging in.
- **Training manual** â€” public how-to guide at `/training-manual/how-to`.

---

## Roles & access

| Role | Typical user | Access |
|------|--------------|--------|
| `employee` | Staff | Dashboard, leave, expenses, training, performance (own), documents, org chart |
| `hr_admin` | People Ops | Full HR modules: people, recruiting, onboarding, letters, cases, settings, roles |
| `ceo` | Executive | Same as HR Admin + executive dashboard metrics |

Navigation and server actions enforce **role-based access control (RBAC)** on every route and mutation. Users must sign out and back in after a role change in Firebase.

---

## Leave approval workflow

Leave requests follow a **two-step approval chain**:

1. **Line manager** â€” approves or denies (based on `Reports to` on the employee profile).
2. **HR Admin / CEO** â€” final approval or denial.

If no line manager is set, the request goes directly to HR.

**Email notifications** are sent at each step (submission, manager approval, final decision) when SMTP is configured.

---

## Notifications & email

### In-app notifications

The notification bell surfaces alerts such as:

- Pending leave approvals (manager and HR)
- Probation ending (5 days, 2 days, today)
- Birthdays and work anniversaries
- Upcoming start dates
- New job applicants and ready-to-onboard candidates
- Training due or overdue
- Missing policy acknowledgements
- Open HR cases

### Email notifications

When SMTP is configured, the same portal notifications are emailed to the relevant user (each alert is sent **once**, with deduplication). Leave workflow emails are sent immediately on submit/approve/deny.

A **daily cron job** (5:00 UTC on Vercel) emails proactive HR alerts even if nobody logs in that day.

---

## Authentication

- Production users sign in with **email + password** via Firebase Authentication.
- The server verifies the Firebase ID token, reads the `role` custom claim, and issues a signed **HTTP-only session cookie**.
- First admin is created with `npm run bootstrap:fresh` (not hardcoded in env vars).
- New employees get a Firebase account when HR adds them under **People â†’ Onboarding**.
- Local development can use bundled `*.kastros.demo` accounts when `KASTROS_DEMO_USERS=true`.

See [docs/FIREBASE_AUTH.md](docs/FIREBASE_AUTH.md) for the full auth setup guide.

---

## Getting started (local)

### 1. Clone and install

```bash
git clone https://github.com/Omer08094/Kastros_HR.git
cd Kastros_HR
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_FIREBASE_*` â€” from Firebase Console â†’ Project settings
- `FIREBASE_*` â€” service account credentials (Admin SDK)
- `KASTROS_SESSION_SECRET` â€” random string, 32+ characters
- `SMTP_*` â€” optional, for email notifications
- `NEXT_PUBLIC_APP_URL` â€” `http://localhost:3000` for local dev

### 3. Bootstrap your first admin

```bash
npm run bootstrap:fresh -- --purge-auth \
  --email admin@yourcompany.com \
  --password "YourSecurePass123!" \
  --name "HR Admin" \
  --role hr_admin
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with your bootstrap credentials.

For a quick local demo without Firebase, set `KASTROS_DEMO_USERS=true` and use the accounts shown on the login page.

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add all variables from `.env.example` under **Settings â†’ Environment Variables**.
3. In Firebase Console â†’ **Authentication â†’ Authorized domains**, add your Vercel URL and custom domain.
4. Enable **Firestore** and **Storage** in the Firebase project.
5. Deploy. The first request seeds an empty store if none exists.

Optional for email cron:

- Set `KASTROS_CRON_SECRET` (or use Vercelâ€™s auto-generated `CRON_SECRET`).
- `vercel.json` schedules `/api/cron/notification-emails` daily.

See also [docs/SETUP_COPY_PASTE.md](docs/SETUP_COPY_PASTE.md) for a condensed setup checklist.

---

## Project structure

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ (hr)/          # Authenticated HR app (dashboard, people, leave, â€¦)
â”‚   â”œâ”€â”€ apply/         # Public job application portal
â”‚   â”œâ”€â”€ login/         # Sign-in page
â”‚   â”œâ”€â”€ api/           # File serving, notifications, cron
â”‚   â””â”€â”€ training-manual/
â”œâ”€â”€ components/        # UI components (hr/, layout, notifications)
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ store/         # HR data model, server actions, Firestore persist
â”‚   â”œâ”€â”€ hr-notifications.ts
â”‚   â”œâ”€â”€ hr-emails.ts
â”‚   â”œâ”€â”€ notification-email-sync.ts
â”‚   â”œâ”€â”€ org-tree.ts
â”‚   â””â”€â”€ â€¦
docs/                  # Setup and auth guides
scripts/               # bootstrap-fresh, PDF generation
```

---


## Sales playbook

The sales-facing product walkthrough is generated as **`docs/Kastros-HR-Sales-Playbook.pdf`** (screenshots from a local dev server, then PDF export).

```bash
npm run docs:sales
```

Re-export PDF only (after editing `docs/sales/Kastros-HR-Sales-Playbook.html`):

```bash
npm run docs:sales-pdf
```

Set `SALES_CAPTURE_BASE_URL` if the app is not on `http://localhost:3000`. Screenshot auth uses demo JWT session cookies (no passwords in scripts).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run bootstrap:fresh` | Wipe data and create first Firebase admin |
| `npm run docs:pdf` | Generate executive product overview PDF |
| `npm run docs:sales` | Capture screenshots and generate sales playbook PDF |
| `npm run docs:sales-pdf` | Re-export sales playbook PDF from HTML only |

---

## Multi-currency & business units

Employees are assigned a **business unit** (UAE, Karachi, Multan) which drives default payroll currency (AED, PKR). Compensation, allowances, expenses, and statutory records respect per-employee currency settings.

---

## Security notes

- Session cookies are **HTTP-only** and signed with `KASTROS_SESSION_SECRET`.
- HR file downloads require an authenticated session (`/api/hr-file/[ref]`).
- Sensitive modules (cases, letters, payroll) are restricted to HR Admin and CEO.
- Audit log records key HR actions (who did what, when).
- Never commit `.env.local` or Firebase private keys to git.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/FIREBASE_AUTH.md](docs/FIREBASE_AUTH.md) | Authentication, bootstrap, adding users |
| [docs/SETUP_COPY_PASTE.md](docs/SETUP_COPY_PASTE.md) | Quick copy-paste Vercel + Firebase setup |
| [docs/executive/README.md](docs/executive/README.md) | Executive product overview materials |

---

## License

Private â€” internal use for Kastros. Do not distribute.
