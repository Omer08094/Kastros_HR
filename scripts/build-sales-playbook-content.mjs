#!/usr/bin/env node
/**
 * Generates main body content for docs/sales/Kastros-HR-Sales-Playbook.html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "../docs/sales/Kastros-HR-Sales-Playbook.html");

function shot(slug, caption) {
  return `<figure class="screenshot">
      <img src="screenshots/${slug}.png" alt="${caption}" />
      <figcaption>${caption}</figcaption>
    </figure>`;
}

function moduleSection(id, title, benefit, slug, caption, roles, workflow, value, config) {
  return `
    <section id="${id}" class="page-break">
      <p class="module-tag">Module deep dive · <span class="badge-live">Live</span></p>
      <h2>${title}</h2>
      <p class="lead"><strong>${benefit}</strong></p>
      ${shot(slug, caption)}
      <h3>Who benefits — by role</h3>
      ${roles}
      <h3>Typical workflow</h3>
      ${workflow}
      <h3>Business value</h3>
      ${value}
      <h3>Configuration &amp; rollout notes</h3>
      ${config}
    </section>`;
}

function ul(items) {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function ol(items) {
  return `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
}

const modules = [
  {
    id: "mod-login",
    title: "Secure sign-in",
    benefit: "Give every employee a branded, work-email login — no shadow spreadsheets, no shared passwords.",
    slug: "login",
    caption: "Sign-in screen — Firebase Auth with work email and password; automatic redirect to role-appropriate dashboard.",
    roles: ul([
      "<strong>Employee:</strong> Access personal dashboard, leave, documents, training, and org chart.",
      "<strong>HR Admin:</strong> Full operational modules after authentication.",
      "<strong>CEO:</strong> Executive dashboard plus HR capabilities and role management.",
    ]),
    workflow: ol([
      "HR creates the employee record during onboarding; Firebase account is provisioned.",
      "Employee receives password reset / welcome email when SMTP is configured.",
      "User signs in with work email; session cookie carries JWT with role claims.",
      "Middleware routes authenticated users to dashboard; unauthenticated users to login.",
    ]),
    value: ul([
      "Single front door reduces IT support burden and enforces consistent access policy.",
      "Password reset flows through Firebase — no manual credential sharing.",
      "Already-authenticated users skip login when returning to the app.",
    ]),
    config: ul([
      "Configure Firebase project credentials and SMTP for onboarding emails.",
      "Map corporate email domain; each employee profile email must match login identity.",
      "Session cookies are HTTP-only; role changes take effect after re-login.",
    ]),
  },
  {
    id: "mod-dashboard-employee",
    title: "Employee dashboard",
    benefit: "Employees see what matters today — profile summary, leave balance, goals, probation reminders, and quick links — without hunting through menus.",
    slug: "dashboard-employee",
    caption: "Employee home — personal snapshot with leave estimate, assigned goals, and shortcuts to self-service modules.",
    roles: ul([
      "<strong>Employee:</strong> Primary landing page after login.",
      "<strong>HR Admin / CEO:</strong> Can preview employee experience when impersonation is not needed — use employee test account in demos.",
    ]),
    workflow: ol([
      "Employee logs in and lands on Overview.",
      "Dashboard surfaces job title, department, manager, joining date, and probation countdown.",
      "Estimated annual leave remaining helps plan time off before submitting requests.",
      "Quick links route to My leave, Documents, Learning, and Help manual.",
    ]),
    value: ul([
      "Reduces HR inbox questions about balances and probation dates.",
      "Encourages self-service adoption from day one.",
      "Consistent layout across UAE, Karachi, and Multan locations.",
    ]),
    config: ul([
      "Ensure leave entitlements are allocated for the calendar year so balance estimates are meaningful.",
      "Probation alerts appear when end date is within 10 days — verify joining and probation months on profile.",
    ]),
  },
  {
    id: "mod-dashboard-ceo",
    title: "Executive dashboard",
    benefit: "Leadership gets company pulse in one glance — headcount, pending leave, open jobs, new applicants, training backlog, and probation alerts.",
    slug: "dashboard-ceo",
    caption: "CEO overview — company-wide KPI tiles and operational alerts for proactive decision-making.",
    roles: ul([
      "<strong>CEO:</strong> Company pulse metrics and approval queues requiring executive attention.",
      "<strong>HR Admin:</strong> Similar operational tiles with team-focused counts (shared exec access pattern).",
    ]),
    workflow: ol([
      "CEO signs in and opens Overview.",
      "Tiles show active headcount, employees on leave, department count, pending leave company-wide.",
      "Recruiting tiles highlight open jobs and new applications.",
      "Probation-ending-soon list prompts HR follow-up before confirmations.",
      "Drill through to Leave, Recruiting, or People for action.",
    ]),
    value: ul([
      "Board-ready visibility without exporting from multiple systems.",
      "Surfaces bottlenecks (pending approvals, open requisitions) before they become crises.",
      "Aligns executive and HR on the same live numbers.",
    ]),
    config: ul([
      "Maintain accurate employee status (Active, On leave, Offboarding, Separated) for headcount integrity.",
      "Use CEO role sparingly; role promotion is CEO-only in User roles module.",
    ]),
  },
  {
    id: "mod-leave",
    title: "Leave management",
    benefit: "Employees request time off in seconds; managers and HR approve with a clear two-step chain and full audit trail.",
    slug: "leave",
    caption: "My leave — balances by type and year, request submission, and status tracking through approval stages.",
    roles: ul([
      "<strong>Employee:</strong> View balances, submit requests with type, dates, and notes; track status.",
      "<strong>Line manager:</strong> Approve or deny direct reports' requests (no separate login — manager is a reporting-line relationship).",
      "<strong>HR Admin / CEO:</strong> Final HR approval after manager sign-off; cannot approve own leave.",
    ]),
    workflow: ol([
      "Employee submits leave request → status <strong>Pending Manager</strong>.",
      "Line manager (from Reports to on employee profile) approves or denies.",
      "On manager approval → status <strong>Pending HR</strong>; HR Admin or CEO gives final approval.",
      "Employee receives in-app notification at each stage; optional SMTP email when configured.",
      "Approved leave reflects in dashboards; denied requests retain history.",
    ]),
    value: ul([
      "Eliminates email chains and spreadsheet leave trackers.",
      "Manager-first approval respects operational coverage before HR payroll processing.",
      "Per-employee entitlement overrides handle edge cases without changing global policy.",
    ]),
    config: ul([
      "Define leave types and default days per year in Settings before go-live.",
      "Apply defaults to all employees for the calendar year; override individuals on Leave (HR view).",
      "Set Reports to (manager email) on every profile — required for manager approval routing.",
    ]),
  },
  {
    id: "mod-leave-hr",
    title: "Leave entitlements (HR)",
    benefit: "HR controls policy at scale — bulk defaults plus per-employee adjustments — so balances stay accurate across business units.",
    slug: "leave-hr-entitlements",
    caption: "HR leave administration — entitlement grid, approval queue, and per-employee balance overrides.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Configure and override entitlements; process Pending HR queue.",
      "<strong>Employee:</strong> Sees resulting balances on My leave (read-only).",
    ]),
    workflow: ol([
      "HR opens Leave module and reviews company-wide requests.",
      "Filter or expand rows to adjust entitlement days per employee per leave type.",
      "Apply policy defaults from Settings for new year or new hires.",
      "Approve or deny requests in Pending HR status after manager approval.",
    ]),
    value: ul([
      "Central entitlement management prevents overbooking and compliance gaps.",
      "Supports different allocations for seniority, location, or contract type.",
      "Approval queue mirrors best-practice HRIS patterns (manager then HR).",
    ]),
    config: ul([
      "Run Settings → leave types before first entitlement push.",
      "Document override rationale externally if required by policy; system stores balances and decisions.",
    ]),
  },
  {
    id: "mod-employees",
    title: "People directory & profiles",
    benefit: "One golden record per employee — identity, employment, compensation, education, documents, and manager linkage — searchable and always current.",
    slug: "employees",
    caption: "People directory — searchable roster with rich profile drill-down for HR operations.",
    roles: ul([
      "<strong>Employee:</strong> No directory access; sees own data on dashboard and modules.",
      "<strong>HR Admin / CEO:</strong> Full search, inline edit, compensation, letters, ID card, document links.",
    ]),
    workflow: ol([
      "HR searches roster by name, department, or email.",
      "Opens profile: identity, employment, statutory flags, manager, phones, emergency contact.",
      "Edits inline; changes persist with audit logging.",
      "Generates appointment letter, prints corporate ID card, manages salary and allowances.",
      "Links personnel documents and records policy acknowledgements.",
    ]),
    value: ul([
      "Replaces fragmented folders and duplicate Excel master lists.",
      "CNIC expiry and probation alerts surface compliance risk early.",
      "Manager email on profile powers leave approval and live org chart.",
    ]),
    config: ul([
      "Recommended hire order: top-down (leaders before reports) for correct org chart.",
      "Configure allowance catalog in Settings before entering compensation lines.",
    ]),
  },
  {
    id: "mod-onboarding",
    title: "Onboarding",
    benefit: "Convert an approved candidate or new hire into a live employee with Firebase login in one guided flow — minutes, not days.",
    slug: "onboarding",
    caption: "Add team member — comprehensive intake form creating roster entry and authentication account.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Create employees; optional Quick add executive for C-suite.",
      "<strong>Employee:</strong> Receives credentials after HR completes onboarding.",
    ]),
    workflow: ol([
      "HR opens Onboarding → Add team member (or follows Onboard link from approved applicant).",
      "If from recruiting: approved application prefills name, email, phones, emergency contact, title, location, probation.",
      "HR completes employment fields not on public form: department, BU, manager, joining date.",
      "Submit creates employee record + Firebase user; audit log records event.",
      "Trigger password reset email for first login.",
    ]),
    value: ul([
      "Recruit-to-hire continuity eliminates re-keying applicant data.",
      "Single flow reduces onboarding errors and missing manager assignments.",
      "Executive quick-add streamlines board-level appointments.",
    ]),
    config: ul([
      "Approve candidate in Recruiting before Onboard prefill works.",
      "Education files from apply portal are not auto-copied — re-attach on profile if needed.",
      "Verify persistence mode (Firestore vs demo JSON) for production cutover.",
    ]),
  },
  {
    id: "mod-recruiting",
    title: "Recruiting & applicant tracking",
    benefit: "Publish roles, share public apply links, review CVs and attachments, and move approved candidates straight into onboarding.",
    slug: "recruiting",
    caption: "Recruiting pipeline — job postings, applicant table, status decisions, and hire path to onboarding.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Create jobs, review applications, approve/reject, launch onboard.",
      "<strong>Candidate:</strong> Applies via public portal (no login).",
    ]),
    workflow: ol([
      "HR creates job with title, description, location; copies public apply URL.",
      "Candidates submit via /apply/[jobId] with CV and certificates.",
      "HR expands application rows; reviews education, experience, cover letter.",
      "Approve or reject; approved rows show Onboard action.",
      "Onboard opens with prefilled intake from application.",
    ]),
    value: ul([
      "Professional careers experience without third-party ATS fees for core workflow.",
      "Attachments stored securely; HR-only access.",
      "LinkedIn job kit supports external posting collateral.",
    ]),
    config: ul([
      "Define job descriptions in Organization setup for consistency.",
      "Share apply links on LinkedIn, careers page, or email — no candidate account required.",
    ]),
  },
  {
    id: "mod-apply",
    title: "Public apply portal",
    benefit: "Candidates apply from anywhere — mobile-friendly form, file uploads, no account friction — while HR controls what is collected publicly vs internally.",
    slug: "apply-portal",
    caption: "Public careers form — candidate-facing application for a specific job posting.",
    roles: ul([
      "<strong>Candidate:</strong> Submit application, upload CV and certificates.",
      "<strong>HR Admin:</strong> Receives submission in Recruiting module.",
    ]),
    workflow: ol([
      "Candidate opens shared apply link for a specific job.",
      "Completes contact, education rows, experience, cover letter, LinkedIn.",
      "Uploads CV, education certificate, other certs.",
      "Submission appears in Recruiting as Submitted; HR reviews asynchronously.",
    ]),
    value: ul([
      "Widens talent pool; no login barrier.",
      "Separates candidate-facing fields from internal employment setup (department, BU, manager).",
      "Reduces unqualified phone screens — full application visible upfront.",
    ]),
    config: ul([
      "Employment setup fields intentionally excluded from public form — completed at onboarding.",
      "Ensure Firebase Storage / upload limits configured for certificate files.",
    ]),
  },
  {
    id: "mod-org-chart",
    title: "Reporting channel (org chart)",
    benefit: "Live org structure from manager relationships — no separate diagram tool to maintain.",
    slug: "org-chart",
    caption: "Reporting channel — hierarchical view derived from Reports to email on each employee profile.",
    roles: ul([
      "<strong>All authenticated users:</strong> View reporting lines.",
      "<strong>HR Admin:</strong> Maintains accuracy via profile manager email and hire order.",
    ]),
    workflow: ol([
      "Each profile stores Reports to (manager work email).",
      "Org chart renders tree from CEO / top nodes downward.",
      "Transfer/posting or profile edit updates chart automatically.",
    ]),
    value: ul([
      "Always reflects current state — not a stale PowerPoint.",
      "Helps employees understand escalation paths.",
      "Supports reorgs without redeploying static charts.",
    ]),
    config: ul([
      "Onboard managers before direct reports.",
      "Use consistent corporate email format for manager linkage.",
    ]),
  },
  {
    id: "mod-performance",
    title: "Performance management (PMDF)",
    benefit: "Run structured annual performance cycles with phased objectives, 80% business / 20% development weighting, and field lockdown by HR-controlled date windows.",
    slug: "performance",
    caption: "PMDF performance forms — business objectives, development pillars, phased reviews, and printable evaluation output.",
    roles: ul([
      "<strong>Employee:</strong> Completes self-assessment sections when phase is open.",
      "<strong>Line manager:</strong> Reviews and scores direct reports (reporting-line access, not a fourth login role).",
      "<strong>HR Admin / CEO:</strong> Configures cycle date windows per phase; calibration and finalization.",
    ]),
    workflow: ol([
      "HR creates PMDF cycle and sets open/deadline dates for each phase (objective setting, mid-year, year-end, calibration, finalization).",
      "Employee enters business objectives (must total 100% weight) and development objectives auto-distribute across five pillars.",
      "Fields lock outside HR-defined windows — prevents out-of-phase edits.",
      "Manager completes manager sections for direct reports when manager phase opens.",
      "Scoring applies 80% business final rating + 20% development final rating for overall PMDP score.",
      "Print/export formal evaluation for HR file.",
    ]),
    value: ul([
      "Embeds Kastros performance methodology (Empathy, Accountability, Initiative, Collaboration, Integrity).",
      "Phase governance ensures fair, time-boxed process.",
      "Rating bands link scores to HR actions (e.g. PIP eligibility).",
    ]),
    config: ul([
      "Configure phase windows before opening cycle to employees.",
      "Assign line manager on profile before launching forms.",
      "Functional areas and location categories align to Dubai, Karachi, Multan offices.",
    ]),
  },
  {
    id: "mod-training",
    title: "Learning & training",
    benefit: "Assign compliance and skills training with due dates, materials, and completion tracking — internal or external providers.",
    slug: "training",
    caption: "Learning module — assigned training rows with Required/Done status and downloadable materials.",
    roles: ul([
      "<strong>Employee:</strong> View assignments, open PDF/PPT materials, mark completion where permitted.",
      "<strong>HR Admin / CEO:</strong> Assign training to any employee; upload materials; track overdue items.",
    ]),
    workflow: ol([
      "HR creates training assignment: title, assignee, due date, provider, material upload.",
      "Employee sees assignment on Learning page and dashboard alerts.",
      "Employee completes programme; status moves to Done.",
      "HR monitors open training count on executive dashboard.",
    ]),
    value: ul([
      "Audit-ready training register for compliance visits.",
      "Central materials — no emailing decks repeatedly.",
      "Supports onboarding curricula and annual refreshers.",
    ]),
    config: ul([
      "Upload limits respect hosting platform (4MB on Vercel Hobby — plan accordingly for large decks).",
      "Use notifications to nudge overdue assignees.",
    ]),
  },
  {
    id: "mod-documents",
    title: "Documents & compliance library",
    benefit: "Policy acknowledgements, Conflict of Interest programme, and company library — with timestamped employee compliance records.",
    slug: "documents",
    caption: "Documents — policy manual acknowledgements, CoI submissions, and company-wide library access.",
    roles: ul([
      "<strong>Employee:</strong> Acknowledge policies, download CoI template, upload signed declaration.",
      "<strong>HR Admin / CEO:</strong> Publish policies, upload CoI master, record acknowledgements on behalf of employees when needed.",
    ]),
    workflow: ol([
      "HR publishes policy versions to company library.",
      "Employee acknowledges in-app; timestamp stored on profile.",
      "CoI: HR uploads template → employee signs offline → uploads signed copy.",
      "HR reviews CoI registry for completeness.",
    ]),
    value: ul([
      "Demonstrates compliance during audits without paper binders.",
      "Separation of company library vs personnel files on employee profile.",
      "Authorised download only — files linked to employee or document record.",
    ]),
    config: ul([
      "Version policies when content changes; prompt re-acknowledgement.",
      "Personnel contracts and visas live on individual profiles, not mixed into library.",
    ]),
  },
  {
    id: "mod-letters",
    title: "Letters & HR correspondence",
    benefit: "Generate appointment letters from profile data, maintain letter repository, and print professional HR correspondence on demand.",
    slug: "letters",
    caption: "Letters module — HR letter repository and appointment letter generation from employee profile.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Create, store, and print letters.",
      "<strong>Employee:</strong> Receives printed/PDF output via HR (not self-service letter generation).",
    ]),
    workflow: ol([
      "HR opens employee profile → Generate appointment letter (pulls salary, title, BU, statutory flags).",
      "Store executed letters in repository with type and date.",
      "Print or save for employee file.",
    ]),
    value: ul([
      "Consistent branding and data accuracy from single employee record.",
      "Reduces Word template drift across locations.",
      "Supports promotion, termination, and custom letter types.",
    ]),
    config: ul([
      "Enter compensation on profile before generating appointment letter.",
      "Configure Gratuity, EOBI, PF flags for locale-appropriate letter text.",
    ]),
  },
  {
    id: "mod-transfer",
    title: "Transfer & posting",
    benefit: "Record cross–business unit and department moves with effective dates — history preserved for HR and audit.",
    slug: "transfer-posting",
    caption: "Transfer/posting — document internal moves across UAE, Karachi, and Multan operations.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Create transfer records.",
      "<strong>Employee:</strong> Updated profile reflects new BU/department after HR action.",
    ]),
    workflow: ol([
      "HR initiates transfer: employee, from/to BU, department, effective date.",
      "Profile updates; org chart and dashboards reflect new structure.",
      "Audit log captures change.",
    ]),
    value: ul([
      "Supports multi-BU trading group operations (UAE AED, Pakistan PKR contexts).",
      "Clear paper trail for mobility and compensation reviews.",
    ]),
    config: ul([
      "Maintain business unit master in Organization setup.",
      "Align currency on compensation when transferring across countries.",
    ]),
  },
  {
    id: "mod-cases",
    title: "HR cases",
    benefit: "Confidential case log for investigations and employee relations — restricted to HR and executive access.",
    slug: "cases",
    caption: "HR cases — secure log for sensitive employee relations and investigation matters.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Create and manage cases.",
      "<strong>Employee:</strong> No access — cases are restricted HR workspace.",
    ]),
    workflow: ol([
      "HR opens new case with summary, involved parties, status.",
      "Updates notes as matter progresses.",
      "Closes case when resolved; record retained for governance.",
    ]),
    value: ul([
      "Separates sensitive matters from general profile notes.",
      "Supports consistent ER process across locations.",
    ]),
    config: ul([
      "Define internal protocol for case numbering and retention outside system if required by law.",
      "Limit CEO/HR role assignment to trusted users.",
    ]),
  },
  {
    id: "mod-organization",
    title: "Organization setup",
    benefit: "Master data foundation — business units, departments, sub-departments, and job descriptions — that every module depends on.",
    slug: "organization",
    caption: "Organization setup — business units, departments, and job description library.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Full configuration.",
      "<strong>Employee:</strong> Sees assigned department/BU on profile and dashboard.",
    ]),
    workflow: ol([
      "HR defines business units (e.g. UAE, Karachi, Multan).",
      "Creates departments and sub-departments.",
      "Maintains job description catalog linked to postings and profiles.",
    ]),
    value: ul([
      "Clean dropdowns across onboarding, recruiting, and reporting.",
      "Enables location-aware policies and dashboards.",
    ]),
    config: ul([
      "Complete organization master before bulk onboarding.",
      "Align BU list with legal entities for payroll handoff (future module).",
    ]),
  },
  {
    id: "mod-settings",
    title: "Settings & policy catalog",
    benefit: "Centralize leave types, default entitlements, and salary allowance catalog — HR changes policy once, applies everywhere.",
    slug: "settings",
    caption: "Settings — leave policy types, allowance catalog, and environment configuration.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> Configure policies and catalogs.",
      "<strong>Employee:</strong> Experiences resulting leave types and sees compensation components on letters (not catalog edit).",
    ]),
    workflow: ol([
      "HR defines leave types and standard days per year.",
      "Creates allowance types (housing, fuel, etc.).",
      "Applies leave defaults to workforce for calendar year.",
      "Per-employee overrides remain on Leave module.",
    ]),
    value: ul([
      "Policy changes propagate without code deployments.",
      "Allowance catalog standardizes compensation entries across BUs.",
    ]),
    config: ul([
      "Settings first in 3-week implementation plan (see Part G).",
      "Demo reset available in non-production environments only.",
    ]),
  },
  {
    id: "mod-user-roles",
    title: "User roles & access control",
    benefit: "Three login roles — Employee, HR Admin, CEO — with route-level enforcement; CEO controls role elevation.",
    slug: "user-roles",
    caption: "User roles — Firebase role assignment with CEO-only promotion to HR Admin or CEO.",
    roles: ul([
      "<strong>CEO:</strong> Promote/demote Employee ↔ HR Admin ↔ CEO.",
      "<strong>HR Admin:</strong> Cannot self-elevate; operational access only.",
      "<strong>Employee:</strong> Self-service scope only.",
    ]),
    workflow: ol([
      "CEO opens User roles, searches by email.",
      "Assigns role; Firebase custom claims update.",
      "User re-logs in for new permissions to take effect.",
    ]),
    value: ul([
      "Prevents privilege creep — only CEO can create HR Admins.",
      "Clear separation between employee self-service and HR operations.",
    ]),
    config: ul([
      "Minimize CEO role count; use HR Admin for daily operations.",
      "Managers are not a login role — they act via reporting line on leave and PMDF.",
    ]),
  },
  {
    id: "mod-security",
    title: "Security & audit log",
    benefit: "Demonstrate accountability — chronological audit of material HR actions for compliance spot-checks and investigations.",
    slug: "security",
    caption: "Security module — audit log viewer with actor, action, and timestamp.",
    roles: ul([
      "<strong>HR Admin / CEO:</strong> View audit log.",
      "<strong>Employee:</strong> No access.",
    ]),
    workflow: ol([
      "HR opens Security → Audit log.",
      "Filter chronologically; review onboarding, leave decisions, role changes, document events.",
      "Export or screenshot for audit pack as needed.",
    ]),
    value: ul([
      "Supports ISO-style accountability questions.",
      "Complements Firebase Auth logs for defence in depth.",
    ]),
    config: ul([
      "Review audit log monthly as HR control.",
      "Retention follows Firestore backup policy in production.",
    ]),
  },
  {
    id: "mod-notifications",
    title: "In-app notifications",
    benefit: "Keep managers and HR on top of approvals, recruiting, training, and compliance — without email overload.",
    slug: "notifications",
    caption: "Notification bell — aggregated alerts for leave approvals, new applicants, training due, and policy items.",
    roles: ul([
      "<strong>All roles:</strong> See notifications permitted for their route access.",
      "<strong>Line manager:</strong> Leave pending manager approval for direct reports.",
      "<strong>HR Admin:</strong> Pending HR leave, new applicants, approved-ready-to-hire, training overdue.",
    ]),
    workflow: ol([
      "System derives notifications from live store state on each page load.",
      "User opens bell icon; clicks through to relevant module.",
      "Parallel SMTP emails sent for leave events when mail is configured.",
    ]),
    value: ul([
      "Reduces missed approvals that delay payroll and coverage planning.",
      "Single inbox inside the HR platform users already open daily.",
    ]),
    config: ul([
      "Configure SMTP for email parity with in-app alerts.",
      "Ensure manager emails correct for leave routing.",
    ]),
  },
  {
    id: "mod-training-manual",
    title: "Public training manual",
    benefit: "20 progressive modules — shareable without login — so employees and HR adopt the platform faster with searchable how-to guidance.",
    slug: "training-manual",
    caption: "Public how-to manual — Employee path (Modules 1–8) and HR/CEO path (Modules 9–19) plus troubleshooting.",
    roles: ul([
      "<strong>Employee:</strong> Modules 1–8 — login, navigation, leave, documents, learning, org chart.",
      "<strong>HR Admin / CEO:</strong> Modules 9–19 — setup, onboarding, people, leave ops, recruiting, letters, security.",
      "<strong>All:</strong> Module 20 troubleshooting; search any keyword (e.g. probation, Pending HR).",
    ]),
    workflow: ol([
      "Share /training-manual/how-to link in welcome email.",
      "Use ?role=employee or ?role=hr query for targeted comms.",
      "In-app ? button opens manual in new tab during work.",
    ]),
    value: ul([
      "Cuts training cost — no separate LMS required for system adoption.",
      "Always matches shipped product (same source as in-app help).",
      "Prospects can review help content before purchase.",
    ]),
    config: ul([
      "Expenses modules hidden in manual when KASTROS_EXPENSES_ENABLED is false.",
      "No authentication required — suitable for intranet and email links.",
    ]),
  },
];

let moduleHtml = modules.map((m) =>
  moduleSection(m.id, m.title, m.benefit, m.slug, m.caption, m.roles, m.workflow, m.value, m.config),
).join("\n");

const content = `
    <section>
      <h2>Table of contents</h2>
      <ol class="toc">
        <li><a href="#part-a">Part A — Executive summary &amp; value proposition</a></li>
        <li><a href="#part-b">Part B — Platform trust &amp; security</a></li>
        <li><a href="#part-c">Part C — Roles &amp; access model</a></li>
        <li><a href="#part-d">Part D — Module deep dives</a>
          <ol>${modules.map((m) => `<li><a href="#${m.id}">${m.title}</a></li>`).join("")}</ol>
        </li>
        <li><a href="#part-e">Part E — Cross-cutting capabilities</a></li>
        <li><a href="#part-f">Part F — Roadmap</a></li>
        <li><a href="#part-g">Part G — Implementation &amp; demo</a></li>
      </ol>
    </section>

    <section id="part-a" class="page-break">
      <h2>Part A — Executive summary</h2>
      <p class="lead">
        <strong>Kastros HR</strong> is a modern, browser-based human resources platform designed for trading and corporate groups
        operating across multiple countries and business units. It replaces disconnected spreadsheets, email approvals, and folder-based
        personnel files with one secure system your employees actually use.
      </p>
      <div class="box">
        <strong>What your organisation gains:</strong> Faster hiring cycles, auditable leave and performance processes, executive visibility
        without manual reporting, and compliance artefacts (policies, CoI, training) stored where auditors expect them.
      </div>

      <h3>Problems we solve</h3>
      <div class="two-col">
        <ul>
          <li><strong>Fragmented employee data</strong> — profiles, documents, and salary scattered across drives and inboxes.</li>
          <li><strong>Opaque leave tracking</strong> — managers and HR lack a shared approval queue with balances.</li>
          <li><strong>Slow hiring</strong> — applicants emailed as PDFs; duplicate data entry at hire.</li>
          <li><strong>Performance on paper</strong> — annual review forms without phase control or scoring consistency.</li>
        </ul>
        <ul>
          <li><strong>Compliance gaps</strong> — policy sign-offs not provably timestamped.</li>
          <li><strong>No executive dashboard</strong> — leadership asks HR for headcount and pending items weekly.</li>
          <li><strong>Training ad hoc</strong> — decks emailed; completion not tracked.</li>
          <li><strong>Weak audit trail</strong> — cannot answer “who changed this record?”</li>
        </ul>
      </div>

      <h3>Why Kastros HR — key differentiators</h3>
      <ul>
        <li><strong>End-to-end lifecycle in one product</strong> — public apply → onboard → operate → develop → comply; not five vendors.</li>
        <li><strong>Manager-as-reporting-line</strong> — line managers approve leave and PMDF without a fourth login tier or per-manager licensing.</li>
        <li><strong>Multi-BU native</strong> — UAE, Karachi, Multan with AED/PKR currency contexts built into profiles and compensation.</li>
        <li><strong>PMDF performance methodology embedded</strong> — 80/20 scoring, phased lockdown, printable evaluations.</li>
        <li><strong>Public training manual (20 modules)</strong> — adoption included; share links before go-live.</li>
        <li><strong>Enterprise-grade security posture</strong> — Firebase Auth, JWT sessions, RBAC, CSP, audit log, authorised file downloads.</li>
        <li><strong>Cloud-ready on Vercel</strong> — modern Next.js 15 stack; no on-prem server maintenance.</li>
      </ul>

      <h3>Who it is for</h3>
      <table>
        <thead><tr><th>Organisation profile</th><th>Fit</th></tr></thead>
        <tbody>
          <tr><td>Multi-location trading / corporate group (100–2,000 employees)</td><td>Ideal — BU structure, multi-currency, org chart from reporting lines</td></tr>
          <tr><td>HR team seeking self-service + control</td><td>Strong — employees submit leave; HR governs policy and approvals</td></tr>
          <tr><td>CEO needing operational pulse</td><td>Strong — dedicated dashboard tiles and probation alerts</td></tr>
          <tr><td>Regulated or audit-conscious employers</td><td>Strong — policy acks, CoI, audit log, case management</td></tr>
          <tr><td>Needs full payroll engine day one</td><td>Partial — compensation data captured; payroll UI on roadmap (schema ready)</td></tr>
        </tbody>
      </table>

      <h3>Employee lifecycle flow</h3>
      <p>Kastros HR mirrors how people actually move through your organisation:</p>
      <div class="lifecycle">
        <div><strong>Hire</strong>Public apply portal, applicant tracking, approve → onboard</div>
        <div><strong>Onboard</strong>Profile + login, policies, training assignments, appointment letter</div>
        <div><strong>Operate</strong>Leave, documents, org chart, notifications, daily dashboard</div>
        <div><strong>Develop</strong>PMDF performance cycles, learning &amp; training programmes</div>
        <div><strong>Comply</strong>Policy acknowledgements, CoI, audit log, HR cases, transfers</div>
      </div>
      <p>Each stage connects to the next without exporting CSVs or re-keying names and emails.</p>
    </section>

    <section id="part-b" class="page-break">
      <h2>Part B — Platform trust &amp; security</h2>
      <p class="lead">IT and procurement buyers need more than feature lists. Kastros HR is built on a mainstream cloud stack with defence-in-depth access controls suitable for HR data classification.</p>

      <h3>Cloud architecture</h3>
      <ul>
        <li><strong>Application layer:</strong> Next.js 15 (App Router) — server components and server actions for secure mutations.</li>
        <li><strong>Hosting:</strong> Vercel or equivalent edge/cloud deployment with environment-based configuration.</li>
        <li><strong>Authentication:</strong> Firebase Auth — work email + password; password reset flows.</li>
        <li><strong>Data persistence:</strong> Firestore (production) with structured HR collections; demo JSON for sales environments.</li>
        <li><strong>File storage:</strong> Firebase Storage for CVs, receipts, profile photos, policy PDFs, training decks, CoI uploads.</li>
        <li><strong>Email:</strong> SMTP integration for leave notifications and onboarding messages when configured.</li>
      </ul>

      <h3>Session &amp; identity</h3>
      <ul>
        <li>JWT session cookie (HTTP-only) issued after Firebase authentication.</li>
        <li>Custom claims carry role: <code>employee</code>, <code>hr_admin</code>, <code>ceo</code>.</li>
        <li>Middleware verifies session on every protected route; invalid/expired sessions redirect to login.</li>
        <li>Request headers propagate user email and role to server components for policy checks.</li>
      </ul>

      <h3>RBAC — three layers</h3>
      <ol>
        <li><strong>Route access</strong> — middleware + route map deny modules by role (employees cannot open /employees).</li>
        <li><strong>Server action policy</strong> — mutations validate session role and ownership before writing.</li>
        <li><strong>Row-level visibility</strong> — e.g. leave requests visible to requester, their manager (when Pending Manager), and HR/exec.</li>
      </ol>

      <h3>File security</h3>
      <ul>
        <li>Downloads authorised per artefact type — own files, manager scope, or HR-wide.</li>
        <li>Upload size limits tuned for cloud host (4MB on Vercel Hobby; 20MB elsewhere).</li>
        <li>Storage paths tied to employee, application, training, or document IDs — no open directory listing.</li>
      </ul>

      <h3>Audit log</h3>
      <p>Material mutations append to an append-only audit stream viewable in the Security module: onboarding, leave decisions, role changes, document registration, expense status changes, and more. Each entry records actor, description, and timestamp.</p>

      <h3>SMTP notifications</h3>
      <p>When SMTP environment variables are set, leave workflow sends parallel emails to managers, HR, and requesters — in addition to in-app notification bell items.</p>

      <h3>Security headers (production)</h3>
      <table>
        <thead><tr><th>Header</th><th>Value / purpose</th></tr></thead>
        <tbody>
          <tr><td>Strict-Transport-Security</td><td>max-age=63072000; includeSubDomains; preload</td></tr>
          <tr><td>X-Frame-Options</td><td>DENY — clickjacking protection</td></tr>
          <tr><td>X-Content-Type-Options</td><td>nosniff</td></tr>
          <tr><td>Content-Security-Policy</td><td>Restricts scripts, frames, connect to self + Firebase/Google APIs</td></tr>
          <tr><td>Referrer-Policy</td><td>strict-origin-when-cross-origin</td></tr>
          <tr><td>Permissions-Policy</td><td>Disables camera, microphone, geolocation by default</td></tr>
          <tr><td>poweredByHeader</td><td>Disabled — no Next.js fingerprint</td></tr>
        </tbody>
      </table>

      <h3>IT buyer appendix</h3>
      <table>
        <thead><tr><th>Question</th><th>Answer</th></tr></thead>
        <tbody>
          <tr><td>Where is data hosted?</td><td>Firebase/Google Cloud region per project configuration; app on Vercel edge</td></tr>
          <tr><td>SSO / SAML?</td><td><span class="badge-roadmap">Roadmap</span> — email/password today via Firebase Auth</td></tr>
          <tr><td>Backup &amp; DR?</td><td>Firestore native replication; export via GCP backup policies</td></tr>
          <tr><td>Pen test / SOC2?</td><td>Customer-specific programmes available during enterprise rollout</td></tr>
          <tr><td>Data residency</td><td>Configurable Firebase project region at provisioning</td></tr>
          <tr><td>API access</td><td>Server actions today; public REST API <span class="badge-roadmap">Roadmap</span> for integrations</td></tr>
          <tr><td>Mobile</td><td>Responsive web today; native apps <span class="badge-roadmap">Roadmap</span></td></tr>
          <tr><td>Multi-tenant SaaS</td><td>Single-tenant deployment today; multi-tenant <span class="badge-roadmap">Roadmap</span></td></tr>
          <tr><td>Encryption in transit</td><td>TLS everywhere (HSTS enforced)</td></tr>
          <tr><td>Encryption at rest</td><td>Firebase/Google Cloud default encryption</td></tr>
        </tbody>
      </table>
    </section>

    <section id="part-c" class="page-break">
      <h2>Part C — Roles &amp; access model</h2>
      <h3>Three login roles</h3>
      <table>
        <thead><tr><th>Role</th><th>Typical users</th><th>Access scope</th></tr></thead>
        <tbody>
          <tr><td><strong>Employee</strong></td><td>All staff</td><td>Own dashboard, leave, documents, training, own PMDF, org chart view. No people directory or admin setup.</td></tr>
          <tr><td><strong>HR Admin</strong></td><td>People Operations</td><td>Full HR module set: people, onboarding, recruiting, settings, organization, letters, cases, leave HR queue, PMDF administration.</td></tr>
          <tr><td><strong>CEO</strong></td><td>Executive leadership</td><td>HR Admin capabilities plus executive dashboard emphasis and User roles (Firebase role promotion).</td></tr>
        </tbody>
      </table>

      <h3>Manager is not a fourth login</h3>
      <div class="box">
        <strong>Important for prospects:</strong> Line managers do not receive a separate “Manager” product login or license.
        Manager powers derive from the <em>Reports to</em> email on each employee profile. Anyone with an Employee login who has
        direct reports automatically sees pending leave and PMDF actions for their team. This reduces cost and complexity versus
        traditional HRIS per-seat manager tiers.
      </div>
      <ul>
        <li>Leave: manager approves when status is Pending Manager and requester reports to them.</li>
        <li>PMDF: line manager completes manager phases for direct reports.</li>
        <li>Managers without reports use standard employee self-service only.</li>
      </ul>

      <h3>Module access matrix</h3>
      <table>
        <thead>
          <tr><th>Module</th><th>Employee</th><th>Manager (reporting line)</th><th>HR Admin</th><th>CEO</th></tr>
        </thead>
        <tbody>
          <tr><td>Dashboard</td><td class="check">Own</td><td class="check">Own</td><td class="check">Ops tiles</td><td class="check">Company pulse</td></tr>
          <tr><td>My leave</td><td class="check">Submit</td><td class="check">Submit + approve team</td><td class="check">Approve HR step</td><td class="check">Approve HR step</td></tr>
          <tr><td>People directory</td><td class="dash">—</td><td class="dash">—</td><td class="check">Full</td><td class="check">Full</td></tr>
          <tr><td>Onboarding</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>Recruiting</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>Org chart</td><td class="check">View</td><td class="check">View</td><td class="check">View</td><td class="check">View</td></tr>
          <tr><td>PMDF / Performance</td><td class="check">Own form</td><td class="check">Direct reports</td><td class="check">All + config</td><td class="check">All + config</td></tr>
          <tr><td>Learning</td><td class="check">Own</td><td class="check">Own</td><td class="check">Assign all</td><td class="check">Assign all</td></tr>
          <tr><td>Documents</td><td class="check">Ack / CoI</td><td class="check">Ack / CoI</td><td class="check">Publish</td><td class="check">Publish</td></tr>
          <tr><td>Letters</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>Transfer / posting</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>HR cases</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>Organization / Settings</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td><td class="check">Yes</td></tr>
          <tr><td>User roles</td><td class="dash">—</td><td class="dash">—</td><td class="dash">—</td><td class="check">Yes</td></tr>
          <tr><td>Security / audit</td><td class="dash">—</td><td class="dash">—</td><td class="check">View</td><td class="check">View</td></tr>
          <tr><td>Public apply / manual</td><td class="check">Apply / read</td><td class="check">Apply / read</td><td class="check">Manage / read</td><td class="check">Manage / read</td></tr>
        </tbody>
      </table>
    </section>

    <section id="part-d" class="page-break">
      <h2>Part D — Module deep dives</h2>
      <p>The following sections walk through each major capability with screenshots from the demonstration environment, role-specific benefits, workflows, and rollout guidance. Use these pages in order during a structured demo or leave-behind for economic buyers and HR leaders.</p>
    </section>
    ${moduleHtml}

    <section id="part-e" class="page-break">
      <h2>Part E — Cross-cutting capabilities</h2>

      <h3>Notification types</h3>
      <p>In-app notifications aggregate actionable items by kind:</p>
      <table>
        <thead><tr><th>Kind</th><th>Examples</th><th>Typical recipient</th></tr></thead>
        <tbody>
          <tr><td><strong>approval</strong></td><td>Leave pending manager / HR; your leave awaiting approval</td><td>Manager, HR, employee</td></tr>
          <tr><td><strong>recruiting</strong></td><td>New applicant submitted; approved candidate ready to onboard</td><td>HR Admin, CEO</td></tr>
          <tr><td><strong>learning</strong></td><td>Training overdue or due soon</td><td>Assignee, HR</td></tr>
          <tr><td><strong>policy</strong></td><td>Policy acknowledgement pending</td><td>Employee, HR</td></tr>
          <tr><td><strong>people</strong></td><td>Probation ending soon; CNIC expiry approaching</td><td>HR Admin, CEO</td></tr>
          <tr><td><strong>team</strong></td><td>Team-scoped operational hints</td><td>Managers, HR</td></tr>
          <tr><td><strong>compliance</strong></td><td>CoI or document compliance gaps</td><td>HR Admin</td></tr>
          <tr><td><strong>payroll</strong></td><td>Reserved for future payroll workflow hooks</td><td>HR Admin</td></tr>
        </tbody>
      </table>

      <h3>Appointment letter generation</h3>
      <p>From any employee profile, HR generates a formatted appointment letter pulling live data: name, title, department, business unit, joining date, probation, gross salary, statutory flags (Gratuity, EOBI, Provident Fund). Eliminates copy-paste errors from Word templates and ensures compensation on file matches the letter issued.</p>

      <h3>Corporate ID card</h3>
      <p>Print-ready corporate ID card from profile photo, employee ID, name, title, and department — standardised branding for UAE and Pakistan offices. Reduces dependency on external print vendors for routine new-hire badges.</p>

      <h3>LinkedIn job kit</h3>
      <p>Recruiting module supports collateral for external job posts (LinkedIn and careers pages) so HR markets openings consistently with internal job records and public apply links.</p>

      <h3>Multi–business unit operations</h3>
      <p>Native support for Kastros Group locations:</p>
      <ul>
        <li><strong>UAE</strong> — AED default currency context; Dubai office category in PMDF.</li>
        <li><strong>Karachi</strong> — PKR context; Karachi office category.</li>
        <li><strong>Multan</strong> — PKR context; Multan office category.</li>
      </ul>
      <p>Transfer/posting module records moves between BUs with effective dates; compensation currency editable per profile.</p>

      <h3>Multi-currency compensation</h3>
      <p>Profiles store salary in AED, PKR, or USD with configurable allowance lines from the Settings catalog. Display formatting uses thousands separators for executive readability. Prepares for payroll integration without re-entry.</p>

      <h3>Public training manual — 20 modules</h3>
      <p>Shipped as part of the product — not an extra consulting deliverable:</p>
      <ol>
        <li>Getting started</li><li>Roles &amp; navigation</li><li>Employee daily workflow</li><li>Leave (employee)</li><li>Expenses (when enabled)</li><li>Documents</li><li>Learning &amp; performance view</li><li>Org chart</li><li>HR setup overview</li><li>HR settings</li><li>HR organization</li><li>HR onboarding</li><li>HR people / profiles</li><li>HR leave operations</li><li>HR expense operations</li><li>HR documents</li><li>HR recruiting</li><li>HR letters, transfer, cases</li><li>HR CEO &amp; security</li><li>Troubleshooting</li>
      </ol>
      <p>Search supports keywords like <em>probation</em>, <em>allowance</em>, <em>Pending HR</em>. Share before go-live to accelerate adoption.</p>
    </section>

    <section id="part-f" class="page-break">
      <h2>Part F — Product roadmap</h2>
      <p class="lead">Kastros HR is production-ready for core HR operations today. The following items extend the platform for prospects with advanced requirements:</p>
      <table>
        <thead><tr><th>Capability</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Core HR (leave, people, recruiting, PMDF, docs, training)</td><td><span class="badge-live">Live</span></td><td>Demonstrated in this playbook</td></tr>
          <tr><td>Expense claims</td><td><span class="badge-roadmap">Feature-flagged</span></td><td>Set <code>KASTROS_EXPENSES_ENABLED=true</code> in environment; hidden by default</td></tr>
          <tr><td>Payroll UI</td><td><span class="badge-roadmap">Roadmap</span></td><td>Compensation schema ready on profiles; payroll processing UI planned</td></tr>
          <tr><td>Mobile-native apps</td><td><span class="badge-roadmap">Roadmap</span></td><td>Responsive web today; iOS/Android clients planned</td></tr>
          <tr><td>SSO / SAML</td><td><span class="badge-roadmap">Roadmap</span></td><td>Enterprise IdP integration (Azure AD, Okta) on Firebase/custom token path</td></tr>
          <tr><td>Multi-tenant SaaS</td><td><span class="badge-roadmap">Roadmap</span></td><td>Single-tenant per customer today; shared SaaS for SMB segment planned</td></tr>
        </tbody>
      </table>
      <div class="box">
        <strong>Sales talk track:</strong> Lead with live modules. Position expense claims as flip-a-switch for prospects needing T&amp;E now. Position payroll as natural phase 2 — data model already captures gross, basic, and allowances. SSO and multi-tenant address enterprise procurement checklists without blocking mid-market deals today.
      </div>
    </section>

    <section id="part-g" class="page-break">
      <h2>Part G — Implementation, demo &amp; next steps</h2>

      <h3>Feature matrix (summary)</h3>
      <table>
        <thead><tr><th>Capability</th><th>Employee</th><th>HR Admin</th><th>CEO</th></tr></thead>
        <tbody>
          <tr><td>Dashboard</td><td>Own</td><td>Ops</td><td>Pulse</td></tr>
          <tr><td>Leave</td><td>Request</td><td>Entitlements + HR approve</td><td>HR approve</td></tr>
          <tr><td>People / profiles</td><td>—</td><td>Full</td><td>Full</td></tr>
          <tr><td>Onboarding + auth</td><td>—</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Recruiting + apply portal</td><td>Apply</td><td>Full</td><td>Full</td></tr>
          <tr><td>PMDF performance</td><td>Own</td><td>Configure + all</td><td>Configure + all</td></tr>
          <tr><td>Learning</td><td>Own</td><td>Assign</td><td>Assign</td></tr>
          <tr><td>Documents / CoI</td><td>Submit</td><td>Manage</td><td>Manage</td></tr>
          <tr><td>Letters / ID card</td><td>—</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Transfer / cases</td><td>—</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Org / settings</td><td>—</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Audit log</td><td>—</td><td>View</td><td>View</td></tr>
          <tr><td>User roles</td><td>—</td><td>—</td><td>Yes</td></tr>
          <tr><td>Training manual (public)</td><td>Read</td><td>Read</td><td>Read</td></tr>
          <tr><td>Expense claims</td><td>If enabled</td><td>If enabled</td><td>If enabled</td></tr>
        </tbody>
      </table>

      <h3>Three-week implementation phases</h3>
      <table>
        <thead><tr><th>Week</th><th>Focus</th><th>Deliverables</th></tr></thead>
        <tbody>
          <tr><td><strong>Week 1 — Foundation</strong></td><td>Organization setup, Settings (leave types, allowances), Firebase project, SMTP, role assignments</td><td>BU/department master, policy catalog, CEO + HR admin accounts, training manual shared</td></tr>
          <tr><td><strong>Week 2 — People</strong></td><td>Top-down onboarding, manager linkages, leave entitlements, document library, policy publish</td><td>Active roster live, org chart verified, employees logging in</td></tr>
          <tr><td><strong>Week 3 — Operations</strong></td><td>Recruiting live, PMDF cycle prep, training assignments, executive dashboard review, hypercare</td><td>First leave approvals end-to-end, hire-from-apply tested, go-live sign-off</td></tr>
        </tbody>
      </table>

      <h3>15-minute demo script</h3>
      <ol>
        <li><strong>0:00–1:30 — Hook:</strong> CEO dashboard — headcount, pending leave, open jobs (screenshot: dashboard-ceo).</li>
        <li><strong>1:30–3:30 — Employee story:</strong> Login → employee dashboard → submit leave (login, dashboard-employee, leave).</li>
        <li><strong>3:30–5:30 — Manager + HR approval:</strong> Explain reporting-line manager approval → HR final on leave-hr-entitlements.</li>
        <li><strong>5:30–8:00 — Hire flow:</strong> Public apply → recruiting approve → onboard prefill (apply-portal, recruiting, onboarding).</li>
        <li><strong>8:00–10:30 — People &amp; compliance:</strong> Profile, appointment letter, documents/CoI (employees, letters, documents).</li>
        <li><strong>10:30–12:30 — Develop:</strong> PMDF 80/20 and phase windows (performance); assign training (training).</li>
        <li><strong>12:30–14:00 — Trust:</strong> Audit log, roles, notifications (security, user-roles, notifications).</li>
        <li><strong>14:00–15:00 — Close:</strong> Training manual link, 3-week rollout, roadmap honesty, next steps.</li>
      </ol>

      <h3>Next steps</h3>
      <div class="box">
        <p><strong>[Prospect name]</strong> — proposed actions following this briefing:</p>
        <ul>
          <li>Schedule live demo with prospect’s org structure (optional: import sample BU/dept list).</li>
          <li>Confirm user count and locations for commercial proposal.</li>
          <li>Identify integration requirements (SSO, payroll vendor, expense policy).</li>
          <li>Agree implementation start date and executive sponsor.</li>
          <li>Provide demonstration environment credentials or dedicated trial tenant.</li>
        </ul>
        <p style="margin-top:12px;"><em>Contact: _________________________ · Date: _________________________</em></p>
      </div>
    </section>
`;

let html = fs.readFileSync(htmlPath, "utf8");
html = html.replace("<!-- CONTENT_PLACEHOLDER -->", content);
fs.writeFileSync(htmlPath, html, "utf8");
console.log("Injected content into", htmlPath);
console.log("Approx modules:", modules.length);
