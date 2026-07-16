/**
 * Update a Firebase Auth user's role custom claim without touching Firestore or other users.
 *
 * Usage (from repo root, with .env.local loaded):
 *   node scripts/set-user-role.js --email user@company.com --role hr_admin
 *
 * Roles: employee | hr_admin | ceo
 */
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--role") out.role = argv[++i];
  }
  return out;
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
    });
  }
  return admin.auth();
}

async function main() {
  const args = parseArgs(process.argv);
  const validRoles = ["employee", "hr_admin", "ceo"];

  if (!args.email || !args.role) {
    console.error(`
Usage:
  node scripts/set-user-role.js --email user@company.com --role hr_admin

Roles: ${validRoles.join(" | ")}
`);
    process.exit(1);
  }

  if (!validRoles.includes(args.role)) {
    throw new Error(`Invalid --role. Use one of: ${validRoles.join(", ")}`);
  }

  const email = args.email.trim().toLowerCase();
  const auth = initAdmin();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (e) {
    const code = e?.code ?? "";
    if (code === "auth/user-not-found") {
      console.error(`No Firebase Auth account found for ${email}.`);
      console.error("The user must be added under People (or log in once) before their role can be set.");
      process.exit(1);
    }
    throw e;
  }

  const existingClaims = user.customClaims ?? {};
  const name = typeof existingClaims.name === "string" ? existingClaims.name : user.displayName ?? email;
  await auth.setCustomUserClaims(user.uid, { ...existingClaims, role: args.role, name });

  const updated = await auth.getUser(user.uid);
  console.log(`Role updated for ${email}:`);
  console.log(`  uid:    ${user.uid}`);
  console.log(`  role:   ${args.role}`);
  console.log(`  claims: ${JSON.stringify(updated.customClaims ?? {})}`);
  console.log("\nAccess updates automatically on the user’s next page load (session syncs from Firebase).");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
