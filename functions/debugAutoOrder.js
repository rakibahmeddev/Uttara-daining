require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountKey) {
  console.error("FATAL: FIREBASE_SERVICE_ACCOUNT not set.");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error("FATAL: Could not parse service account JSON.", e);
  process.exit(1);
}

const db = admin.firestore();

async function checkStatus() {
  const bdOffset = 6 * 60 * 60 * 1000;
  const bdNow = new Date(Date.now() + bdOffset);
  const bdDateStr = bdNow.toISOString().slice(0, 10);
  console.log(`Current BD Date: ${bdDateStr}`);

  const mealsSnapshot = await db.collection("meals").where("available", "==", true).get();
  console.log(`Available meals: ${mealsSnapshot.size}`);

  const usersSnapshot = await db.collection("users").where("autoOrderEnabled", "==", true).get();
  console.log(`Users with autoOrderEnabled=true: ${usersSnapshot.size}`);

  for (const doc of usersSnapshot.docs) {
    const u = doc.data();
    console.log(`User: ${u.name} (ID: ${u.userId})`);
    console.log(`  lastAutoOrderDate: ${u.lastAutoOrderDate} (matches today? ${u.lastAutoOrderDate === bdDateStr})`);
    console.log(`  balance: ${u.balance}`);
    console.log(`  autoOrderMealIds:`, u.autoOrderMealIds);
  }
}

checkStatus().then(() => process.exit(0)).catch(console.error);
