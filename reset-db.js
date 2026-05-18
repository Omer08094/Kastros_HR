const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function clearFirestore() {
  // Delete the entire "kastros-hr" database document (store)
  const docRef = db.collection('kastros-hr').doc('store');
  await docRef.delete().catch(() => {});
  console.log('✅ Firestore store document cleared');
}

async function createAdmin() {
  // Minimal HR admin data – adjust fields as needed by the app
  const adminUser = {
    id: 'hr-admin',
    name: 'HR Admin',
    email: process.env.KASTROS_HR_EMAIL || 'admin@kastros.demo',
    role: 'hr_admin',
    title: 'HR Administrator',
    department: 'Human Resources',
    status: 'Active',
    employmentType: 'Permanent',
    joiningDate: new Date().toISOString().split('T')[0],
    // other fields can be left undefined – they will be ignored by the UI
  };
  const store = {
    employees: [adminUser],
    documents: [],
    academics: [],
    training: [],
    jobApplications: [],
    cases: [],
    // any other collections the app expects – keep them empty
  };
  await db.collection('kastros-hr').doc('store').set({ store });
  console.log('✅ HR admin record written to Firestore');
}

async function clearStorage() {
  // Delete everything in the bucket (files and their metadata)
  await bucket.deleteFiles({ force: true }).catch(() => {});
  console.log('✅ Firebase Storage bucket cleared');
}

async function main() {
  await clearFirestore();
  await createAdmin();
  await clearStorage();
  console.log('✅ All done – clean slate ready');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Error during reset:', e);
  process.exit(1);
});
