/**
 * One-time fresh start for hosted (Vercel) deployments:
 * - Clears Firestore HR store + Firebase Storage uploads
 * - Optionally deletes all Firebase Auth users (--purge-auth)
 * - Creates one Firebase Auth user with role custom claim + matching employee row
 *
 * Usage (from repo root, with .env.local loaded):
 *   node scripts/bootstrap-fresh.js --email admin@yourcompany.com --password "YourSecurePass123!" --name "HR Admin" --role hr_admin
 *
 * Roles: employee | hr_admin | ceo
 */
const admin = require("firebase-admin");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

function parseArgs(argv) {
  const out = { purgeAuth: false, clearOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--purge-auth") out.purgeAuth = true;
    else if (a === "--clear-only") out.clearOnly = true;
    else if (a === "--email") out.email = argv[++i];
    else if (a === "--password") out.password = argv[++i];
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--role") out.role = argv[++i];
  }
  return out;
}

const DEFAULT_LEAVE_CATEGORIES = [
  { id: "lv-cat-annual", name: "Annual leave", defaultDaysPerYear: 14, isActive: true, sortOrder: 1 },
  { id: "lv-cat-sick", name: "Sick leave", defaultDaysPerYear: 10, isActive: true, sortOrder: 2 },
  { id: "lv-cat-casual", name: "Casual leave", defaultDaysPerYear: 8, isActive: true, sortOrder: 3 },
  { id: "lv-cat-unpaid", name: "Unpaid leave", defaultDaysPerYear: 0, isActive: true, sortOrder: 4 },
];

const DEFAULT_BUSINESS_UNITS = [
  { id: "bu-uae", name: "UAE", notes: null },
  { id: "bu-karachi", name: "Karachi", notes: null },
  { id: "bu-multan", name: "Multan", notes: null },
];

const DEFAULT_POLICIES = [
  { id: "pol-1", title: "HR Manual", version: "v2026.1", printableUrl: "/policies/hr-manual-v2026.1.pdf" },
  { id: "pol-2", title: "Code of Conduct", version: "v2026.2", printableUrl: "/policies/code-of-conduct-v2026.2.pdf" },
];

const DEFAULT_SALARY_ALLOWANCE_TYPES = [
  { id: "sal-allow-fuel", name: "Fuel allowance", unit: "liters", isActive: true, sortOrder: 1 },
  { id: "sal-allow-mobile", name: "Cell phone allowance", unit: "money", isActive: true, sortOrder: 2 },
  { id: "sal-allow-transport", name: "Transport allowance", unit: "money", isActive: true, sortOrder: 3 },
  { id: "sal-allow-house", name: "House rent allowance", unit: "money", isActive: true, sortOrder: 4 },
  { id: "sal-allow-medical", name: "Medical allowance", unit: "money", isActive: true, sortOrder: 5 },
  { id: "sal-allow-special", name: "Special allowance", unit: "money", isActive: true, sortOrder: 6 },
];

function createEmptyStore() {
  return {
    employees: [],
    salaryAllowanceTypes: DEFAULT_SALARY_ALLOWANCE_TYPES,
    leaveCategories: DEFAULT_LEAVE_CATEGORIES,
    employeeLeaveAllocations: [],
    leaveRequests: [],
    jobs: [],
    jobApplications: [],
    training: [],
    academics: [],
    documents: [],
    policies: DEFAULT_POLICIES,
    policyAcknowledgements: [],
    cases: [],
    goals: [],
    reviews: [],
    payroll: {
      month: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" }),
      employeesPaid: 0,
      exceptions: 0,
      note: "Gross = base + (hours × rate) + overtime + allowances + bonus. Net = Gross − deductions.",
    },
    payrollEntries: [],
    audit: [],
    businessUnits: DEFAULT_BUSINESS_UNITS,
    departments: [],
    subDepartments: [],
    jobDescriptions: [],
    bonuses: [],
    overtime: [],
    expenses: [],
    statutory: [],
    transfers: [],
    letters: [],
    coiDocs: [],
    coiSubmissions: [],
  };
}

function probationCompletionDate(joiningDate, months) {
  const d = new Date(joiningDate);
  if (Number.isNaN(d.getTime())) return joiningDate;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function buildEmployee({ email, name, role, firebaseUid }) {
  const joiningDate = new Date().toISOString().slice(0, 10);
  const probationMonths = 3;
  return {
    id: `emp-${crypto.randomUUID()}`,
    employeeIdDisplay: "KST-1001",
    salutation: null,
    name,
    fatherName: "—",
    email,
    gender: null,
    dateOfBirth: null,
    nationality: null,
    secondNationality: null,
    maritalStatus: null,
    religion: null,
    cnic: null,
    cnicExpiry: null,
    address: null,
    title: role === "ceo" ? "Chief Executive Officer" : role === "hr_admin" ? "HR Administrator" : "Team Member",
    designationNumber: null,
    officialNumber: null,
    location: "Head Office",
    businessUnit: "UAE",
    status: "Active",
    department: role === "ceo" ? "Executive" : "Human Resources",
    subDepartment: null,
    employmentType: "Permanent",
    joiningDate,
    probationMonths,
    probationCompletionDate: probationCompletionDate(joiningDate, probationMonths),
    dutyHours: null,
    dutyDays: null,
    companyPhone: "",
    personalPhone: "",
    emergencyContacts: [],
    familyRelations: [],
    reportsToEmail: null,
    hasCompanyVehicle: false,
    vehicleNumber: null,
    drivingLicenceNumber: null,
    drivingLicenceExpiry: null,
    licences: [],
    education: [],
    hasGratuity: false,
    hasEobi: false,
    hasProvidentFund: false,
    firebaseUid,
    photoStoredRef: null,
    compensation: null,
  };
}

function initAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env.local");
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
    auth: admin.auth(),
  };
}

async function clearFirestore(db) {
  await db.collection("kastros-hr").doc("store").delete().catch(() => {});
  console.log("✅ Firestore store cleared (kastros-hr/store)");
}

async function clearStorage(bucket) {
  await bucket.deleteFiles({ force: true }).catch(() => {});
  console.log("✅ Firebase Storage cleared");
}

async function purgeAuthUsers(auth) {
  let pageToken;
  let total = 0;
  do {
    const list = await auth.listUsers(1000, pageToken);
    for (const user of list.users) {
      await auth.deleteUser(user.uid);
      total++;
    }
    pageToken = list.pageToken;
  } while (pageToken);
  console.log(`✅ Deleted ${total} Firebase Auth user(s)`);
}

async function writeStore(db, store) {
  await db.collection("kastros-hr").doc("store").set({ store });
  console.log("✅ Firestore store written");
}

async function createBootstrapUser(auth, { email, password, name, role }) {
  const user = await auth.createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
  });
  await auth.setCustomUserClaims(user.uid, { role, name });
  console.log(`✅ Firebase Auth user created: ${email} (role: ${role})`);
  return user.uid;
}

async function main() {
  const args = parseArgs(process.argv);
  const { db, bucket, auth } = initAdmin();

  const validRoles = ["employee", "hr_admin", "ceo"];
  if (!args.clearOnly) {
    if (!args.email || !args.password || !args.name || !args.role) {
      console.error(`
Usage:
  Clear data only:
    node scripts/bootstrap-fresh.js --clear-only [--purge-auth]

  Fresh start + first admin (recommended once before Vercel go-live):
    node scripts/bootstrap-fresh.js --purge-auth \\
      --email admin@yourcompany.com \\
      --password "YourSecurePass123!" \\
      --name "HR Admin" \\
      --role hr_admin

  Roles: employee | hr_admin | ceo
`);
      process.exit(1);
    }
    if (!validRoles.includes(args.role)) {
      throw new Error(`Invalid --role. Use one of: ${validRoles.join(", ")}`);
    }
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
  }

  if (args.purgeAuth) {
    await purgeAuthUsers(auth);
  }

  await clearFirestore(db);
  await clearStorage(bucket);

  if (args.clearOnly) {
    const empty = createEmptyStore();
    await writeStore(db, empty);
    console.log("✅ Empty HR store seeded (no users). Run again with --email/--password to create an admin.");
    return;
  }

  const email = args.email.trim().toLowerCase();
  const uid = await createBootstrapUser(auth, {
    email,
    password: args.password,
    name: args.name.trim(),
    role: args.role,
  });

  const store = createEmptyStore();
  store.employees = [buildEmployee({ email, name: args.name.trim(), role: args.role, firebaseUid: uid })];
  store.audit = [
    {
      id: `audit-${Date.now()}`,
      at: new Date().toISOString(),
      actorEmail: email,
      action: `Bootstrap fresh install; created ${args.role} account`,
    },
  ];
  await writeStore(db, store);

  console.log(`
✅ Fresh environment ready.

Sign in at /login with:
  Email:    ${email}
  Password: (the password you passed to --password)

After login:
  • Add employees in People — each gets a Firebase account (employee role) + optional password-reset email flow.
  • To create a CEO or second admin, run this script again with --role ceo (after --purge-auth) OR promote via Settings (CEO only).
  • Users must sign out/in after role changes (custom claims).

Firebase Console checklist:
  • Authentication → Sign-in method → Email/Password: ENABLED
  • Authentication → Settings → Authorized domains: add your *.vercel.app host
`);
}

main().catch((e) => {
  console.error("❌ bootstrap-fresh failed:", e.message || e);
  process.exit(1);
});
