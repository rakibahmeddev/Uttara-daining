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

async function resetTestUsers() {
  const targetIds = [1, 8, 31];
  
  const usersRef = db.collection("users");
  const snapshot = await usersRef.where("userId", "in", targetIds).get();
  
  if (snapshot.empty) {
    console.log("No users found to reset.");
    return;
  }
  
  let count = 0;
  for (const doc of snapshot.docs) {
    console.log(`Resetting lastAutoOrderDate for User ${doc.data().name} (ID: ${doc.data().userId})`);
    await doc.ref.update({
      lastAutoOrderDate: admin.firestore.FieldValue.delete()
    });
    count++;
  }
  
  console.log(`Reset complete for ${count} users.`);
}

resetTestUsers().then(() => process.exit(0)).catch(console.error);
