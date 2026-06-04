/**
 * Source content for the public Kastros HR training manual (/training-manual/how-to).
 * Structured as progressive modules (similar to a product how-to guide).
 */

export type ManualAudience = "all" | "employee" | "hr";

export type ManualSection = {
  id: string;
  title: string;
  paragraphs: string[];
  steps?: string[];
};

export type ManualModule = {
  id: string;
  title: string;
  summary: string;
  audience: ManualAudience;
  objectives: string[];
  sections: ManualSection[];
  /** Extra terms for search (routes, features, synonyms). */
  keywords: string[];
};

export const MANUAL_PATH = "/training-manual/how-to";

export const MANUAL_INTRO = {
  title: "Kastros HR — How-to manual",
  subtitle: "Training modules — in-depth HR administration",
  description:
    "This manual explains how to use Kastros HR. HR and CEO users should focus on Modules 9–19: rollout order, settings, organization master data, onboarding, full profile management, leave and expense operations, compliance documents, recruiting, letters, and executive controls. Employees can use Modules 1–8 for self-service. Search any keyword (e.g. probation, allowance, Pending CEO) to jump directly to a section.",
  outcomes: [
    "Configure leave policy, salary allowances, and organization structure before go-live",
    "Onboard employees top-down with correct reporting lines and Firebase logins",
    "Maintain complete profiles: identity, employment, salary, education, documents, policy acks",
    "Operate leave and expense approval queues daily",
    "Run recruiting, transfers, letters, cases, and audit review",
  ],
};

export type ManualRole = "employee" | "hr";

/** Which modules appear for each role (keeps the manual short and relevant). */
const EMPLOYEE_MODULE_IDS = new Set([
  "module-01-getting-started",
  "module-02-roles-navigation",
  "module-03-employee-daily",
  "module-04-leave",
  "module-05-expenses",
  "module-06-documents",
  "module-07-learning-performance",
  "module-08-org-chart",
  "module-20-troubleshooting",
]);

const HR_MODULE_IDS = new Set([
  "module-09-hr-setup",
  "module-10-hr-settings",
  "module-11-hr-organization",
  "module-12-hr-onboarding",
  "module-13-hr-people",
  "module-14-hr-leave-ops",
  "module-15-hr-expense-ops",
  "module-16-hr-documents",
  "module-17-hr-recruiting",
  "module-18-hr-letters-transfer-cases",
  "module-19-hr-ceo-security",
  "module-20-troubleshooting",
]);

export function modulesForRole(role: ManualRole): ManualModule[] {
  const ids = role === "hr" ? HR_MODULE_IDS : EMPLOYEE_MODULE_IDS;
  return MANUAL_MODULES.filter((m) => ids.has(m.id));
}

export const MANUAL_AUDIENCE_INTRO: Record<
  ManualRole,
  { title: string; subtitle: string; description: string; startHere: string[] }
> = {
  employee: {
    title: "Employee guide",
    subtitle: "The basics — login, leave, expenses, and documents",
    description:
      "Pick a topic below. Each card opens to short steps only. Use search if you know what you need (e.g. “leave” or “password”).",
    startHere: [
      "Sign in and set your password",
      "Check Overview for your manager and leave balance",
      "Acknowledge policies under Documents",
      "Submit leave or expenses when needed",
    ],
  },
  hr: {
    title: "HR & CEO guide",
    subtitle: "Setup, people, approvals, and compliance",
    description:
      "Follow Module 9 first if you're launching the system. Open one card at a time — steps are concise; expand only what you need.",
    startHere: [
      "Module 9 — rollout checklist (do this first)",
      "Modules 10–11 — settings and organization",
      "Module 12–13 — onboarding and profiles",
      "Modules 14–15 — leave and expense queues",
    ],
  },
};

export const EMPLOYEE_QUICK_TOPICS = [
  "Sign in & password",
  "Request leave",
  "Expense claims",
  "Policies & CoI form",
  "Training tasks",
  "Who is my manager? (org chart)",
] as const;

export const MANUAL_CORE_TOPICS = [
  "HR rollout checklist (foundation → people → operations)",
  "Settings: leave types, allocations, salary allowance catalog",
  "Organization setup: BU, departments, sub-departments, job descriptions",
  "Onboarding & Add team member (Firebase account + profile)",
  "People: edit profile, photo, ID card, appointment letter, salary",
  "Leave administration: entitlements, Pending HR / Pending CEO",
  "Expense administration: approve, reject, mark reimbursed",
  "Documents: library, CoI template, policy acknowledgements (HR record)",
  "Recruiting pipeline and public apply vs HR onboarding",
  "Letters, transfer/posting, HR cases, security audit, CEO roles",
] as const;

export const MANUAL_MODULES: ManualModule[] = [
  {
    id: "module-01-getting-started",
    title: "Module 1 — Getting started",
    summary: "Access the portal, set your password, and confirm your profile appears correctly.",
    audience: "all",
    objectives: [
      "Open the correct Kastros HR URL for your environment",
      "Sign in with your work email and password",
      "Use the password-reset email when HR onboarded you",
    ],
    keywords: ["login", "password", "reset", "sign in", "firebase", "first time"],
    sections: [
      {
        id: "sign-in",
        title: "Signing in",
        paragraphs: [
          "Use the work email address on your employee record. Passwords are managed through Firebase Authentication — the same account HR created when you were added to People.",
        ],
        steps: [
          "Open your company's Kastros HR link (production or the URL HR shared).",
          "Enter your work email and password on the login screen.",
          "After success you land on Overview (dashboard).",
        ],
      },
      {
        id: "password-reset",
        title: "First-time password",
        paragraphs: [
          "When HR adds you, a password reset email may be sent automatically. Use that link to set a password, then sign in on the main login page.",
          "Important: the reset link only works for the Firebase project used when the email was sent. If HR sent the link from localhost, it will not change your password on the live site (and vice versa).",
        ],
        steps: [
          "Open the reset link from your inbox.",
          "Choose a new password and submit.",
          "Return to the main login page and sign in.",
        ],
      },
      {
        id: "profile-check",
        title: "Confirm your profile",
        paragraphs: [
          "On Overview, you should see your name, job title, department, and manager. If you see a message that your profile was not found, your login email does not match the employee record — contact HR.",
        ],
      },
    ],
  },
  {
    id: "module-02-roles-navigation",
    title: "Module 2 — Roles & navigation",
    summary: "Understand what you can open in the sidebar and why some pages show Access denied.",
    audience: "all",
    objectives: [
      "Know the difference between Employee, HR Admin, and CEO",
      "Use the sidebar groups to find modules",
      "Recognize when a page is restricted by role",
    ],
    keywords: ["role", "hr admin", "ceo", "employee", "sidebar", "access denied", "navigation"],
    sections: [
      {
        id: "roles",
        title: "Roles",
        paragraphs: [
          "Employee — self-service: Overview, leave, expenses, documents, training, performance (own), org chart (view).",
          "HR Admin — full HR: People, onboarding, recruiting, letters, cases, settings, organization, approve leave and expenses.",
          "CEO — same modules as HR Admin plus executive dashboard metrics and changing Firebase user roles (sign out/in required after role change).",
        ],
      },
      {
        id: "sidebar",
        title: "Sidebar groups",
        paragraphs: [
          "Overview — dashboard, leave, expenses.",
          "People — directory (HR), onboarding, recruiting, transfer, reporting channel.",
          "Time & performance — performance reviews, learning.",
          "Letters & docs — letters (HR), documents, HR cases (HR).",
          "Setup — organization, security, settings (HR/CEO).",
        ],
      },
    ],
  },
  {
    id: "module-03-employee-daily",
    title: "Module 3 — Employee self-service (daily use)",
    summary: "What every employee should do after go-live.",
    audience: "employee",
    objectives: [
      "Check Overview for probation and leave summaries",
      "Acknowledge policies and upload signed CoI",
      "Know where to request leave and submit expenses",
    ],
    keywords: ["overview", "dashboard", "employee", "daily", "coi", "policy"],
    sections: [
      {
        id: "day-one",
        title: "Recommended first-day checklist",
        steps: [
          "Sign in and set your password.",
          "Open Overview and confirm your job details and manager.",
          "Go to Documents — acknowledge each policy in the manual.",
          "Download the CoI template, sign offline, upload your signed copy.",
          "Open My leave and note your balances for the year.",
          "Bookmark Expense claims if you claim business expenses.",
        ],
        paragraphs: [],
      },
      {
        id: "overview",
        title: "Overview (dashboard)",
        paragraphs: [
          "Shows welcome message, role, department, joining date, manager, probation warning if applicable, and estimated annual leave remaining with a link to request leave.",
        ],
      },
    ],
  },
  {
    id: "module-04-leave",
    title: "Module 4 — Leave (time off)",
    summary: "View balances, submit requests, and understand approval stages.",
    audience: "all",
    objectives: [
      "Read balances per leave type for the calendar year",
      "Submit a leave request with dates and notes",
      "Track Pending HR, Pending CEO, Approved, or Denied",
    ],
    keywords: ["leave", "annual", "sick", "holiday", "pending hr", "pending ceo", "approval", "balance"],
    sections: [
      {
        id: "balances",
        title: "Balances",
        paragraphs: [
          "Balances appear on My leave. Each row is a leave type (configured by HR in Settings). Allocated, used, and remaining days are shown for the current calendar year (approved leave only counts as used).",
        ],
      },
      {
        id: "submit-leave",
        title: "Submit a request",
        steps: [
          "Open My leave.",
          "Select leave type, start date, end date, and optional notes.",
          "Submit — status is Pending HR or Pending CEO depending on your reporting line.",
          "Watch the list on the same page for updates.",
        ],
        paragraphs: [],
      },
      {
        id: "approval",
        title: "Approval workflow",
        paragraphs: [
          "Pending HR — HR Admin reviews first.",
          "Pending CEO — executive sign-off when required (e.g. direct CEO reports).",
          "Approved — counts against balance; Denied — does not.",
        ],
      },
    ],
  },
  {
    id: "module-05-expenses",
    title: "Module 5 — Expense claims",
    summary: "Submit business expenses with optional receipts; HR approves and marks reimbursed when paid.",
    audience: "all",
    objectives: [
      "Submit category, currency, amount, description, and receipt",
      "Follow status: Pending → Approved/Rejected → Paid",
      "Withdraw a pending claim you no longer need",
    ],
    keywords: ["expense", "claim", "receipt", "reimburse", "aed", "pkr", "usd", "approve", "paid"],
    sections: [
      {
        id: "submit-expense",
        title: "Submit a claim",
        steps: [
          "Open Expense claims in the sidebar.",
          "Choose category (Travel, Meals, etc.).",
          "Select currency — defaults from your business unit (UAE → AED, Karachi/Multan → PKR); change if you paid in another currency.",
          "Enter amount and description; attach receipt (PDF, Office, or image) when available.",
          "Click Submit claim.",
        ],
        paragraphs: [],
      },
      {
        id: "expense-status",
        title: "Statuses",
        paragraphs: [
          "Pending — awaiting HR review. You can withdraw your own pending claim.",
          "Approved — accepted; finance has not yet been marked in the system.",
          "Rejected — not approved.",
          "Paid — HR marked as reimbursed after you were paid.",
        ],
      },
      {
        id: "hr-expenses",
        title: "HR actions",
        paragraphs: [
          "HR/CEO see all claims, pending counts, and buttons: Approve, Reject, Mark reimbursed.",
        ],
      },
    ],
  },
  {
    id: "module-06-documents",
    title: "Module 6 — Documents & compliance",
    summary: "Company library, policy acknowledgements, and Conflict of Interest declarations.",
    audience: "all",
    objectives: [
      "Find company-wide notices in the library",
      "Acknowledge policy manual versions",
      "Complete the CoI download-sign-upload cycle",
    ],
    keywords: ["documents", "policy", "acknowledge", "coi", "conflict of interest", "library", "template"],
    sections: [
      {
        id: "library",
        title: "Company library",
        paragraphs: [
          "HR-published notices and templates visible to all users. Preview, print, or open files. Personnel files for one employee live on that person's People profile, not in the company library.",
        ],
      },
      {
        id: "policies",
        title: "Policy acknowledgements",
        steps: [
          "Open Documents.",
          "For each policy: preview or open the printable copy.",
          "Click Acknowledge once you have read it — records your email and timestamp.",
        ],
        paragraphs: [],
      },
      {
        id: "coi",
        title: "Conflict of Interest (CoI)",
        steps: [
          "HR uploads the master template (HR only).",
          "Download the template from Documents.",
          "Complete and sign offline.",
          "Upload your signed copy in the employee submission area.",
        ],
        paragraphs: [],
      },
    ],
  },
  {
    id: "module-07-learning-performance",
    title: "Module 7 — Learning & performance",
    summary: "Training assignments and formal performance review records.",
    audience: "all",
    objectives: [
      "View assigned training and due dates",
      "Open training materials when attached",
      "View performance reviews recorded for you",
    ],
    keywords: ["training", "learning", "performance", "review", "grade", "material", "due"],
    sections: [
      {
        id: "training",
        title: "Learning (training)",
        paragraphs: [
          "Shows programs assigned to you: name, provider, due date, status (Required/Done), and downloadable materials.",
          "HR assigns training, uploads PDF/PPT materials, and marks completion.",
        ],
      },
      {
        id: "performance",
        title: "Performance",
        paragraphs: [
          "Formal reviews (cycle, grade A–D, comments). Employees see their own reviews; HR/CEO see all and can add records.",
        ],
      },
    ],
  },
  {
    id: "module-08-org-chart",
    title: "Module 8 — Reporting channel (org chart)",
    summary: "How reporting lines are defined and how to fix a broken tree.",
    audience: "all",
    objectives: [
      "Understand that Reports to drives the org chart",
      "Set manager email correctly when editing profiles",
      "Avoid expecting two managers per person",
    ],
    keywords: ["org chart", "reports to", "manager", "hierarchy", "reporting channel", "tree"],
    sections: [
      {
        id: "how-it-works",
        title: "How it works",
        paragraphs: [
          "Each employee has one Reports to field: their line manager's work email. Reporting channel builds a tree from those links — not from department names alone.",
          "Matrix reporting (two managers) is not supported. Use one primary manager in the system.",
        ],
      },
      {
        id: "fix-tree",
        title: "Fixing the chart",
        steps: [
          "Add the most senior person first with Reports to empty (root).",
          "Add each level setting Reports to the manager's exact work email.",
          "Open Reporting channel and verify nesting.",
          "Fix stray roots via People → Edit profile → Reports to.",
        ],
        paragraphs: [],
      },
    ],
  },
  {
    id: "module-09-hr-setup",
    title: "Module 9 — HR rollout checklist",
    summary: "End-to-end go-live sequence for HR/CEO. Follow in order before asking all staff to sign in.",
    audience: "hr",
    objectives: [
      "Complete master data and policy setup before roster import",
      "Load employees top-down so the org chart and leave routing work",
      "Switch on daily HR operations with clear ownership",
    ],
    keywords: ["rollout", "go-live", "checklist", "hr setup", "implementation", "launch"],
    sections: [
      {
        id: "before-start",
        title: "Before you start",
        paragraphs: [
          "Confirm Firebase and email are configured so new hires receive password-reset links from the same environment (production URL) they will use to log in.",
          "Decide who holds HR Admin vs CEO access. Only CEO can change Firebase roles (Settings → role manager on Overview for CEO).",
          "Prepare: department list, BU mapping (UAE / Karachi / Multan), leave policy types and annual days, allowance types for payroll, CoI template PDF, policy manual files.",
        ],
      },
      {
        id: "phase-a",
        title: "Phase A — Foundation (Week 1)",
        steps: [
          "Organization setup — add/verify business units, departments, sub-departments, job descriptions.",
          "Settings → Leave policy — create leave types (Annual, Sick, etc.), set default days per year, run Apply to all employees for the current year.",
          "Settings → Salary allowances — create catalog items (fuel in liters, housing, etc.) if you use compensation on profiles.",
          "Documents — upload company library notices; upload CoI template; verify each policy manual has a printable path and appears in the acknowledgement list.",
        ],
        paragraphs: [
          "Skipping Phase A causes empty dropdowns on onboarding and wrong leave balances for everyone.",
        ],
      },
      {
        id: "phase-b",
        title: "Phase B — Roster (Week 1–2)",
        steps: [
          "Onboarding — add CEO or top leader first. Leave Reports to empty unless they report to someone already in the system.",
          "Add VPs/heads, then managers, then individual contributors. Always set Reports to = manager's exact work email.",
          "Open Reporting channel after each batch to catch stray roots (wrong manager email).",
          "For each hire: confirm Overview works for their email; resend password reset if they did not receive the auto email.",
          "People → Edit profile — backfill CNIC, BU, duty hours, statutory flags (Gratuity, EOBI, PF), profile photo for ID cards.",
        ],
        paragraphs: [],
      },
      {
        id: "phase-c",
        title: "Phase C — Operations (ongoing)",
        steps: [
          "Communicate staff: login link, How-to manual URL, acknowledge policies, submit CoI.",
          "Recruiting — publish roles; use public apply link; hire via Onboarding (not from apply form alone).",
          "Daily: My leave / Overview for pending leave; Expense claims for pending and approved-awaiting-payment.",
          "Learning — assign compliance training with due dates and materials.",
          "Performance — record review cycles per department.",
          "Letters / ID card / appointment letter as events occur.",
          "Transfer/posting when employees move BU or department.",
        ],
        paragraphs: [],
      },
      {
        id: "ownership",
        title: "Suggested ownership",
        paragraphs: [
          "HR Admin — leave/expense queues, onboarding, profiles, documents, recruiting, training assignment.",
          "CEO — executive leave sign-off (Pending CEO), company dashboard, promoting HR Admin roles.",
          "Finance — mark expenses Paid after bank transfer (HR clicks Mark reimbursed).",
        ],
      },
    ],
  },
  {
    id: "module-10-hr-settings",
    title: "Module 10 — Settings (leave policy & salary)",
    summary: "Configure leave types, company-wide allocations, and the salary allowance catalog used on People profiles.",
    audience: "hr",
    objectives: [
      "Create and maintain leave categories",
      "Apply default allocations to all employees for a year",
      "Override individual entitlements on the Leave page",
      "Maintain allowance types for compensation lines",
    ],
    keywords: ["settings", "leave policy", "leave category", "allocation", "entitlement", "allowance", "salary catalog", "default days"],
    sections: [
      {
        id: "leave-types",
        title: "Leave policy — leave types",
        paragraphs: [
          "Path: Settings → Leave policy. Each leave type has a name, standard days per year, sort order (display order on My leave), and active flag.",
          "Examples: Annual leave 22 days, Sick leave 10 days, Unpaid leave 0 days (if you track it).",
        ],
        steps: [
          "Add leave type with name and Standard days / year.",
          "Set Sort order so Annual appears first on employee balance tables.",
          "Click Add leave type; edit existing types with Update.",
          "Deactivate by deleting only if unused — prefer setting days to 0 if needed.",
        ],
      },
      {
        id: "apply-all",
        title: "Apply defaults to all employees",
        paragraphs: [
          "Button: Apply to all employees (current calendar year). Copies each active leave type's default days into every employee's allocation for that year.",
          "Run this after creating types or at year start. Does not replace per-person overrides you set later on Leave.",
        ],
      },
      {
        id: "per-employee-override",
        title: "Per-employee entitlements",
        paragraphs: [
          "Path: My leave (as HR) — Employee leave entitlements panel when visible. Adjust allocated days per person per leave type for the selected year.",
          "Use for: probation (reduced annual), part-time, contractual differences, carry-forward adjustments entered manually.",
        ],
      },
      {
        id: "balances",
        title: "How balances are calculated",
        paragraphs: [
          "Allocated = entitlement for the year (default or override). Used = approved leave days in that year for that type. Remaining = allocated minus used.",
          "Pending requests do not reduce remaining until approved. Denied requests never count.",
        ],
      },
      {
        id: "allowances",
        title: "Salary allowance catalog",
        paragraphs: [
          "Path: Settings → Salary allowances. Define catalog items: name, unit (fixed amount or fuel in liters), sort order, active.",
          "These appear when editing compensation on People. Fuel-type allowances expect liters on the employee line; fixed types expect currency amount.",
          "Changing catalog does not auto-update existing employee compensation — re-open each profile if needed.",
        ],
      },
      {
        id: "demo-reset",
        title: "Demo reset (non-production)",
        paragraphs: [
          "Reset demo data wipes local seed data. Never use on production. For live systems, changes are in Firestore / persisted store only.",
        ],
      },
    ],
  },
  {
    id: "module-11-hr-organization",
    title: "Module 11 — Organization setup",
    summary: "Master data for business units, departments, sub-departments, and job descriptions.",
    audience: "hr",
    objectives: [
      "Keep BU list aligned with legal entities (UAE, Karachi, Multan)",
      "Maintain department dropdowns used in onboarding and profiles",
      "Link job descriptions to designation numbers where used",
    ],
    keywords: ["organization", "business unit", "department", "sub-department", "job description", "bu", "master data"],
    sections: [
      {
        id: "business-units",
        title: "Business units",
        paragraphs: [
          "Fixed set: UAE, Karachi, Multan. Drives default currency on profiles and expenses: UAE → AED, Karachi/Multan → PKR.",
          "Add notes per BU row for HR reference. Employees pick BU on profile/onboarding — affects compensation currency default.",
        ],
      },
      {
        id: "departments",
        title: "Departments & sub-departments",
        paragraphs: [
          "Create departments first (e.g. Operations, Finance, People Ops). Sub-departments hang under a department for finer reporting.",
          "Onboarding and Edit profile use these as dropdowns when configured; otherwise free-text department still works on legacy records.",
        ],
        steps: [
          "Add department name and save.",
          "Add sub-department linked to parent department.",
          "Verify they appear on Onboarding form before bulk hire.",
        ],
      },
      {
        id: "job-descriptions",
        title: "Job descriptions",
        paragraphs: [
          "Optional catalog: designation number, title, department, summary text, attachment reference. Used when employees have Designation # on profile.",
          "Upload or link JD files for HR reference; not automatically shown to employees unless you expose via documents.",
        ],
      },
      {
        id: "not-org-chart",
        title: "Not the same as org chart",
        paragraphs: [
          "Organization setup does not draw reporting lines. Reporting hierarchy is only from Reports to on each employee (see Module 8 and 13).",
        ],
      },
    ],
  },
  {
    id: "module-12-hr-onboarding",
    title: "Module 12 — Onboarding (Add team member)",
    summary: "Create employee record + Firebase login in one flow. This is the authoritative way to add staff.",
    audience: "hr",
    objectives: [
      "Submit a complete intake without validation errors",
      "Understand what candidates do NOT fill on the public apply form",
      "Ensure manager email and BU are correct on day one",
    ],
    keywords: ["onboarding", "add team member", "new hire", "firebase", "create employee", "intake"],
    sections: [
      {
        id: "path",
        title: "Where to go",
        paragraphs: ["Path: Onboarding → Add team member form. Same field layout as employee intake used elsewhere."],
      },
      {
        id: "identity",
        title: "Identity section",
        paragraphs: [
          "Salutation, full name, father's name, work email (becomes login — must be unique), gender, DOB, nationality/second nationality, marital status, religion, CNIC + expiry, address.",
          "Email typos break login and password reset. Use lowercase consistent work email.",
        ],
      },
      {
        id: "employment",
        title: "Employment section",
        paragraphs: [
          "Title, designation #, official #, department, sub-department, location, business unit, employment type, joining date, probation (0/3/6 months — auto-calculates completion date), Reports to (manager email — dropdown when roster exists).",
          "Employee ID (card): optional; leave blank for auto KST-#### style ID.",
        ],
      },
      {
        id: "schedule-vehicle",
        title: "Schedule, vehicle, benefits",
        paragraphs: [
          "Duty hours/days per week, company/personal phones, emergency contact, family/COI declaration row, company vehicle + plate + driving licence if applicable.",
          "Statutory checkboxes: Gratuity, EOBI, Provident Fund — drive appointment letter and payroll context.",
        ],
      },
      {
        id: "education-files",
        title: "Education & files at hire",
        paragraphs: [
          "Multi-row education (degree, institution, year). Optional certification block with file uploads. Profile photo for ID card. Files stored and linked to academics/documents collections.",
        ],
      },
      {
        id: "after-submit",
        title: "After submit",
        steps: [
          "System creates Firestore employee row and Firebase Auth user (role: employee).",
          "Password reset email sends if mail/API configured — tell hire to check spam.",
          "Verify on People and Reporting channel.",
          "If hire was from Recruiting: use same email as application; fill HR-only fields here (department, manager, joining) that apply form left empty.",
        ],
        paragraphs: [],
      },
      {
        id: "not-on-apply",
        title: "Public apply form vs onboarding",
        paragraphs: [
          "Candidates on /apply/[jobId] submit personal info, education rows, CV, cover letter — not department, sub-department, BU, manager, joining date, probation, or statutory flags. Always complete onboarding after hire decision.",
        ],
      },
    ],
  },
  {
    id: "module-13-hr-people",
    title: "Module 13 — People (full profile guide)",
    summary: "Directory, every profile section, edit mode, linked records, ID card, letters, and salary.",
    audience: "hr",
    objectives: [
      "Navigate and search the full roster",
      "Edit all profile sections and understand what each field means",
      "Manage education, personnel docs, and policy acks without leaving edit mode",
    ],
    keywords: ["people", "profile", "edit profile", "identity", "employment", "cnic", "salary", "compensation", "id card", "photo"],
    sections: [
      {
        id: "directory",
        title: "Directory & search",
        paragraphs: [
          "Path: People. Search by display name or email (press Enter or Search). Pagination for large rosters. CNIC expiry warnings may surface on rows (90-day / expired).",
        ],
      },
      {
        id: "edit-mode",
        title: "Edit profile workflow",
        steps: [
          "Open employee row → Edit profile.",
          "Fields switch from read-only to inputs. Main Save profile button saves identity, employment, contact, vehicle, statutory flags, photo.",
          "Separate forms below Save bar add academics, documents, policy acks (save immediately, no need to click Save profile for those).",
          "Cancel exits edit without undoing already-saved linked records.",
        ],
        paragraphs: [],
      },
      {
        id: "identity-fields",
        title: "Identity section (fields)",
        paragraphs: [
          "Salutation, full name, work email (changing email updates Firebase identity when configured — hire must re-login), gender, DOB, nationalities, marital status, religion, CNIC, CNIC expiry, address.",
        ],
      },
      {
        id: "employment-fields",
        title: "Employment section (fields)",
        paragraphs: [
          "Title, department, sub-department, location, business unit, employment type, status (Active / On leave / Offboarding / Separated), employee ID for card, joining date, probation months, Reports to email, profile photo upload or remove photo.",
          "Resend password reset email — separate form; triggers Firebase email when API key set.",
        ],
      },
      {
        id: "schedule-vehicle",
        title: "Working schedule & vehicle",
        paragraphs: [
          "Designation #, official #, duty hours/days, company vehicle flag, vehicle plate, driving licence # and expiry. Other licences list is view-only from onboarding data.",
        ],
      },
      {
        id: "personal-contact",
        title: "Personal & contact",
        paragraphs: [
          "Father's name, company/personal phone. Emergency contact (name, relation, phone). Family/COI declaration row (name, relation, firm, linked to traders flag).",
        ],
      },
      {
        id: "linked-records",
        title: "Education, documents, policy acks (while editing)",
        steps: [
          "Education — Add degree/certification with optional file; Remove record deletes academic row.",
          "Personnel documents — Add name, owner, sensitivity, file; Remove deletes document row.",
          "Policy acknowledgements — Record ack per policy not yet listed for that employee (HR attests offline completion).",
        ],
        paragraphs: [
          "Empty sections show add forms only in edit mode. View photo opens /api/hr-file for profile image.",
        ],
      },
      {
        id: "salary",
        title: "Salary / compensation (HR)",
        paragraphs: [
          "Gross salary, basic salary, currency (defaults from BU), allowance lines from Settings catalog. Visible when editing or when compensation exists. Uses comma formatting. Clear salary removes compensation block.",
        ],
      },
      {
        id: "quick-actions",
        title: "Appointment letter & ID card",
        paragraphs: [
          "Appointment letter dialog — pulls name, title, department, joining, probation, reports-to, salary gross when saved. Print from browser.",
          "Corporate ID card — uses profile photo and employee ID display; print front/back. Fix photo first if preview empty.",
        ],
      },
      {
        id: "delete",
        title: "Removing employees",
        paragraphs: [
          "Delete employee (if exposed in UI) removes roster row and related links — destructive. Prefer status Separated for leavers if you retain history.",
        ],
      },
    ],
  },
  {
    id: "module-14-hr-leave-ops",
    title: "Module 14 — Leave administration (HR)",
    summary: "Operate the approval queue, CEO path, and entitlements.",
    audience: "hr",
    objectives: [
      "Process Pending HR and Pending CEO requests correctly",
      "Know when CEO approval is required",
      "Adjust entitlements without breaking balances",
    ],
    keywords: ["leave admin", "approve leave", "deny", "pending hr", "pending ceo", "hr decide", "entitlement"],
    sections: [
      {
        id: "queue",
        title: "Where HR works leave",
        paragraphs: [
          "Path: My leave. HR/CEO see all requests (not only own). Overview dashboard shows count of company-wide pending items.",
        ],
      },
      {
        id: "statuses",
        title: "Status reference",
        paragraphs: [
          "Pending HR — awaiting HR Admin review. Approve may move to Pending CEO or straight to Approved depending on requester.",
          "Pending CEO — awaiting CEO sign-off (common for direct CEO reports or certain rules).",
          "Approved — counts against balance; visible in used days.",
          "Denied — final; no balance impact.",
        ],
      },
      {
        id: "decide",
        title: "Approve or deny",
        steps: [
          "Open request row; read notes and dates.",
          "Approve — advances workflow (may need CEO step next).",
          "Deny — employee sees Denied; communicate reason offline.",
        ],
        paragraphs: [
          "Only HR/CEO see decision buttons. Employees cannot approve their own requests.",
        ],
      },
      {
        id: "ceo-reports",
        title: "CEO reporting line",
        paragraphs: [
          "Requesters who report directly to CEO (or CEO-submitted leave) often land in Pending CEO. CEO must sign in and approve from My leave.",
        ],
      },
      {
        id: "entitlements-hr",
        title: "Entitlements panel",
        paragraphs: [
          "On Leave page: adjust per-employee allocated days per type/year. Do after policy change or for exceptions. Employee balance table refreshes on next load.",
        ],
      },
    ],
  },
  {
    id: "module-15-hr-expense-ops",
    title: "Module 15 — Expense claims (HR)",
    summary: "Review, approve, reject, and mark reimbursed.",
    audience: "hr",
    objectives: [
      "Work the pending and approved-awaiting-payment queues",
      "Open receipt files for audit",
      "Align Paid status with finance payout",
    ],
    keywords: ["expense hr", "approve expense", "reject", "reimbursed", "paid", "pending review", "receipt"],
    sections: [
      {
        id: "queue",
        title: "HR view",
        paragraphs: [
          "Path: Expense claims. HR sees all employees' claims with badges: X pending review, Y approved · awaiting payment.",
        ],
      },
      {
        id: "review",
        title: "Review checklist",
        steps: [
          "Verify employee, category, amount, currency, description.",
          "Open View receipt when attached (PDF/image).",
          "Approve if policy-compliant; Reject with offline explanation to employee.",
        ],
        paragraphs: [],
      },
      {
        id: "paid",
        title: "Mark reimbursed",
        paragraphs: [
          "After finance pays the employee, click Mark reimbursed on Approved claims → status Paid with timestamp.",
          "Do not mark Paid before payment — employees use status to track reimbursement.",
        ],
      },
      {
        id: "delete",
        title: "Delete / withdraw",
        paragraphs: [
          "HR can delete claims. Employees can withdraw own Pending claims only.",
        ],
      },
    ],
  },
  {
    id: "module-16-hr-documents",
    title: "Module 16 — Documents & compliance (HR)",
    summary: "Company library, CoI program, policy manuals, and personnel files.",
    audience: "hr",
    objectives: [
      "Publish company-wide vs personnel-linked documents correctly",
      "Run CoI template and submission review",
      "Record policy acknowledgements on behalf of employees when needed",
    ],
    keywords: ["documents hr", "coi", "policy", "library", "personnel file", "template", "register document"],
    sections: [
      {
        id: "register",
        title: "Register a document",
        steps: [
          "Documents → Register a document.",
          "Attach file optional (PDF, Word, PPT, image).",
          "Name, owner, sensitivity.",
          "Personnel file dropdown: pick employee to link to profile only; leave company-wide for library.",
        ],
        paragraphs: [
          "Company library = everyone sees under library. Personnel file = only on that employee's People profile.",
        ],
      },
      {
        id: "coi-hr",
        title: "CoI program (HR)",
        steps: [
          "Upload CoI template (HR-only area on Documents).",
          "Communicate: employees download, sign, upload signed copy.",
          "Review submission registry for completeness; chase missing submissions.",
        ],
        paragraphs: [],
      },
      {
        id: "policies-hr",
        title: "Policy manuals",
        paragraphs: [
          "Each policy needs title, version, printable URL (site path like /policies/file.pdf). Employees self-acknowledge; HR can Record ack on People when paper sign-off done.",
        ],
      },
      {
        id: "people-docs",
        title: "Personnel files on profile",
        paragraphs: [
          "Alternatively add via People → Edit profile → Add personnel document. Good for contracts, visas, certificates tied to one person.",
        ],
      },
    ],
  },
  {
    id: "module-17-hr-recruiting",
    title: "Module 17 — Recruiting (HR)",
    summary: "Jobs, applications, approve/reject, and handoff to onboarding.",
    audience: "hr",
    objectives: [
      "Create and publish job postings",
      "Review applications with full detail and CV",
      "Hire through onboarding with HR-only fields",
    ],
    keywords: ["recruiting", "job posting", "application", "approve application", "linkedin", "cv", "pipeline"],
    sections: [
      {
        id: "create-job",
        title: "Create a job",
        paragraphs: [
          "Path: Recruiting. Add title, department, location, description, status. LinkedIn kit dialog may help with external posting copy.",
          "Apply link format: [your-site]/apply/[jobId] — share on careers page or LinkedIn.",
        ],
      },
      {
        id: "applications",
        title: "Review applications",
        steps: [
          "Open job card → applicant table.",
          "View CV link opens stored file.",
          "View full application — education rows, cover letter, cert attachments, candidate snapshot.",
          "HR onboarding snapshot section shows empty HR fields until you onboard — expected.",
        ],
        paragraphs: [],
      },
      {
        id: "decision",
        title: "Approve or reject candidate",
        paragraphs: [
          "Approve — marks application approved; proceed to Onboarding with same email. Reject — closes pipeline for that candidate.",
        ],
      },
      {
        id: "hire",
        title: "Hire handoff",
        steps: [
          "Onboarding → Add team member.",
          "Re-enter or confirm identity; set department, BU, manager, joining, probation, statutory flags.",
          "Do not rely on apply form for internal assignment data.",
        ],
        paragraphs: [],
      },
    ],
  },
  {
    id: "module-18-hr-letters-transfer-cases",
    title: "Module 18 — Letters, transfers & cases",
    summary: "Employee letters, BU moves, and confidential HR cases.",
    audience: "hr",
    objectives: [
      "Generate and track HR letters",
      "Document transfers between BUs/departments",
      "Maintain HR case log for investigations",
    ],
    keywords: ["letters", "promotion letter", "termination", "transfer", "posting", "hr case", "investigation"],
    sections: [
      {
        id: "letters",
        title: "Letters module",
        paragraphs: [
          "Path: Letters. Create letter records tied to employees: type (promotion, termination, etc.), content workflow, printable view.",
          "Quick path: People → Appointment letter for new hires using live profile data.",
        ],
      },
      {
        id: "transfer",
        title: "Transfer / posting",
        steps: [
          "Transfer/posting → new record.",
          "Select employee, from/to business unit and department, effective date, status, notes.",
          "Update employee profile separately if their master BU/department should change permanently.",
        ],
        paragraphs: [
          "Transfer log is historical record; align People profile fields for payroll and expense currency defaults.",
        ],
      },
      {
        id: "cases",
        title: "HR cases",
        paragraphs: [
          "Confidential case tracker: open case, type/description, status until resolved/closed. Not visible to general employees. Use for investigations, grievances, discipline documentation.",
        ],
      },
      {
        id: "training-performance",
        title: "Learning & performance (HR actions)",
        paragraphs: [
          "Learning: assign training with due date, upload material, mark Done. Performance: add review row with cycle, grade A–D, criteria type, manager comments.",
        ],
      },
    ],
  },
  {
    id: "module-19-hr-ceo-security",
    title: "Module 19 — CEO & security (HR oversight)",
    summary: "Executive dashboard, role promotion, and audit trail.",
    audience: "hr",
    objectives: [
      "Understand CEO-only vs HR Admin capabilities",
      "Promote users to HR Admin safely",
      "Use audit log for compliance spot checks",
    ],
    keywords: ["ceo", "role manager", "hr admin", "promote", "audit", "security", "executive"],
    sections: [
      {
        id: "ceo-vs-hr",
        title: "CEO vs HR Admin",
        paragraphs: [
          "HR Admin and CEO share same module access (People, onboarding, settings, etc.). CEO Overview adds company pulse metrics (headcount, pending leave company-wide, open jobs, training backlog).",
          "Pending CEO leave approvals often require CEO login.",
        ],
      },
      {
        id: "roles",
        title: "Changing user roles (CEO only)",
        steps: [
          "Overview → Role manager (CEO section).",
          "Pick employee by email, set role Employee / HR Admin / CEO.",
          "User must sign out and sign in again for Firebase custom claim to apply.",
        ],
        paragraphs: [
          "Do not promote to HR Admin without governance approval. HR Admin can see all employee data and approve leave/expenses.",
        ],
      },
      {
        id: "audit",
        title: "Security / audit",
        paragraphs: [
          "Path: Security. Scroll audit log: timestamp, actor email, action description (onboarding, leave decision, expense paid, etc.). Use for who changed what; not a full legal hold system.",
        ],
      },
      {
        id: "dashboard-alerts",
        title: "Overview alerts (HR)",
        paragraphs: [
          "Probation alert banner — employees within 10 days of probation end; link to People for confirmation workflow.",
          "Monitor open cases, pending applications, training Required count from Overview cards.",
        ],
      },
    ],
  },
  {
    id: "module-20-troubleshooting",
    title: "Module 20 — Troubleshooting & glossary (HR focus)",
    summary: "Common problems and term definitions.",
    audience: "all",
    objectives: [
      "Resolve login, access, and file issues",
      "Understand key terms used in the app",
    ],
    keywords: ["troubleshoot", "error", "not found", "access denied", "glossary", "help", "problem"],
    sections: [
      {
        id: "issues",
        title: "Common issues (HR)",
        paragraphs: [
          "Access denied — user role is Employee; promote via CEO role manager if they need HR modules.",
          "Profile not found on Overview — login email ≠ employee record email; fix email on People (may sync Firebase).",
          "Password reset not received — check NEXT_PUBLIC_FIREBASE_API_KEY and spam; resend from People; same environment as production URL.",
          "Password works on localhost but not live — different Firebase projects between environments.",
          "Leave balance zero for everyone — Settings → leave types → Apply to all employees for current year.",
          "Leave stuck Pending CEO — CEO must log in and approve; check Reports to chain.",
          "Expense receipt Not found — file upload failed or hr-file route; re-upload receipt.",
          "Onboarding email already exists — duplicate email in roster or Firebase; use unique work email.",
          "Department dropdown empty — add departments in Organization setup first.",
          "Org chart flat/wrong — Reports to email must match existing manager exactly; one manager only.",
          "Role change not effective — user must sign out and back in after CEO role update.",
          "Salary not on appointment letter — save compensation on profile first.",
        ],
      },
      {
        id: "glossary",
        title: "Glossary",
        paragraphs: [
          "Business unit (BU) — UAE, Karachi, or Multan; affects default currency.",
          "Reports to — line manager's work email; defines org chart.",
          "Personnel file — document linked to one employee.",
          "Company library — documents for all staff.",
          "Pending HR / Pending CEO — leave approval stages.",
          "Marked reimbursed — expense paid (status Paid).",
        ],
      },
    ],
  },
];

/** Short label for cards (no "Module N —" prefix). */
export function moduleShortTitle(m: ManualModule): string {
  return m.title.replace(/^Module \d+ — /, "");
}

/** Step bullets for simple view (no long paragraphs on first screen). */
export function moduleQuickSteps(m: ManualModule, max = 8): string[] {
  const fromSections = m.sections.flatMap((s) => s.steps ?? []);
  const merged = [...m.objectives.slice(0, 3), ...fromSections];
  return merged.slice(0, max);
}

/** Flatten module + sections into searchable text. */
export function manualSearchBlob(m: ManualModule): string {
  const parts = [
    m.title,
    m.summary,
    m.audience,
    ...m.objectives,
    ...m.keywords,
    ...m.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.steps ?? [])]),
  ];
  return parts.join(" ").toLowerCase();
}
