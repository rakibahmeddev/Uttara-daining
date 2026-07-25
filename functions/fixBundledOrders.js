/**
 * One-time fix script: Split bundled auto orders into separate per-meal orders.
 *
 * Finds all orders where orderType === "auto" AND items.length > 1,
 * then splits each into separate order documents (one per item),
 * setting totalAmount = item.price for each.
 *
 * User balances are NOT touched — the total deducted amount remains the same.
 */
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

async function fixBundledAutoOrders() {
  console.log("[Fix] Searching for bundled auto orders...");

  const snapshot = await db
    .collection("orders")
    .where("orderType", "==", "auto")
    .get();

  const bundled = snapshot.docs.filter(
    (d) => Array.isArray(d.data().items) && d.data().items.length > 1
  );

  if (bundled.length === 0) {
    console.log("[Fix] No bundled auto orders found. Nothing to do!");
    return;
  }

  console.log(`[Fix] Found ${bundled.length} bundled auto order(s) to split.`);

  let splitCount = 0;
  let errorCount = 0;

  for (const orderDoc of bundled) {
    const data = orderDoc.data();
    const items = data.items;

    console.log(
      `[Fix] Splitting order ${orderDoc.id} (${data.userName}) — ${items.length} items`
    );

    try {
      const batch = db.batch();

      // Create one order document per item
      for (const item of items) {
        const newRef = db.collection("orders").doc();
        batch.set(newRef, {
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userNumericId: data.userNumericId || null,
          roomNumber: data.roomNumber || "",
          items: [item],
          totalAmount: item.price || 0,
          status: data.status || "pending",
          orderType: "auto",
          createdAt: data.createdAt, // preserve original timestamp
        });
        console.log(
          `  → Created new order: ${item.name} @ ৳${item.price}`
        );
      }

      // Delete the original bundled order
      batch.delete(orderDoc.ref);

      await batch.commit();
      splitCount++;
    } catch (err) {
      console.error(`[Fix] Failed to split order ${orderDoc.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n[Fix] ── Done ──`);
  console.log(`✅ Split successfully: ${splitCount}`);
  console.log(`❌ Errors          : ${errorCount}`);
}

fixBundledAutoOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
