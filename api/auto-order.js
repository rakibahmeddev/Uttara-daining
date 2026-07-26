import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ── Firebase Admin init (singleton safe for serverless) ──────────────────────
function getDb() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountKey) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
    const serviceAccount = JSON.parse(serviceAccountKey);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

function normalizeSlot(slot) {
  if (!slot) return "";
  const s = slot.toLowerCase();
  if (s.includes("break")) return "Breakfast";
  if (s.includes("lunch")) return "Lunch";
  if (s.includes("dinner")) return "Dinner";
  return slot;
}

async function processAutoOrders() {
  const db = getDb();

  const now = new Date();
  const bdOffset = 6 * 60 * 60 * 1000;
  const bdNow = new Date(now.getTime() + bdOffset);
  const bdDateStr = bdNow.toISOString().slice(0, 10);

  const logs = [];
  const log = (msg) => { console.log(msg); logs.push(msg); };

  log(`[AutoOrder] Starting at ${now.toISOString()} | BD date: ${bdDateStr}`);

  // 1. Fetch available meals
  const mealsSnapshot = await db.collection("meals").where("available", "==", true).get();
  const availableMeals = new Map();
  mealsSnapshot.forEach((doc) => availableMeals.set(doc.id, { id: doc.id, ...doc.data() }));

  if (availableMeals.size === 0) {
    log("[AutoOrder] No available meals found. Exiting.");
    return { success: true, logs };
  }
  log(`[AutoOrder] Found ${availableMeals.size} available meals.`);

  // 2. Fetch users with autoOrderEnabled = true
  const usersSnapshot = await db.collection("users").where("autoOrderEnabled", "==", true).get();
  if (usersSnapshot.empty) {
    log("[AutoOrder] No users with auto order enabled. Exiting.");
    return { success: true, logs };
  }
  log(`[AutoOrder] Found ${usersSnapshot.size} users with auto order enabled.`);

  let successCount = 0, failedCount = 0, turnedOffCount = 0, skippedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Duplicate guard
    if (userData.lastAutoOrderDate === bdDateStr) {
      log(`[AutoOrder] User ${userData.name} already ordered today. Skipping.`);
      skippedCount++;
      continue;
    }

    // Resolve meal IDs
    const mealIds = [...(userData.autoOrderMealIds || [])];
    if (mealIds.length === 0) {
      if (userData.autoOrderLunch) {
        const m = Array.from(availableMeals.values()).find(m => normalizeSlot(m.timeSlot) === "Lunch");
        if (m) mealIds.push(m.id);
      }
      if (userData.autoOrderDinner) {
        const m = Array.from(availableMeals.values()).find(m => normalizeSlot(m.timeSlot) === "Dinner");
        if (m) mealIds.push(m.id);
      }
    }

    if (mealIds.length === 0) {
      log(`[AutoOrder] User ${userData.name}: no meals selected. Skipping.`);
      skippedCount++;
      continue;
    }

    // Match by ID first
    let selectedMeals = mealIds.filter(id => availableMeals.has(id)).map(id => availableMeals.get(id));

    // Slot-based fallback if IDs don't match today's meals
    if (selectedMeals.length === 0) {
      log(`[AutoOrder] User ${userData.name}: ID match failed. Falling back to slot matching.`);
      const wantedSlots = new Set();
      if (userData.autoOrderLunch) wantedSlots.add("Lunch");
      if (userData.autoOrderDinner) wantedSlots.add("Dinner");
      if (userData.autoOrderBreakfast) wantedSlots.add("Breakfast");

      if (wantedSlots.size === 0) {
        log(`[AutoOrder] User ${userData.name}: no slot flags. Skipping.`);
        skippedCount++;
        continue;
      }

      for (const slot of wantedSlots) {
        const match = Array.from(availableMeals.values()).find(m => normalizeSlot(m.timeSlot) === slot);
        if (match) selectedMeals.push(match);
      }

      if (selectedMeals.length === 0) {
        log(`[AutoOrder] User ${userData.name}: no meals for wanted slots. Skipping.`);
        skippedCount++;
        continue;
      }
    }

    // Build order items
    let totalCost = 0;
    const orderItems = [];
    for (const meal of selectedMeals) {
      totalCost += meal.price || 0;
      orderItems.push({ id: meal.id, name: meal.name, price: meal.price, quantity: 1, date: meal.date, timeSlot: meal.timeSlot || "" });
    }

    const currentBalance = userData.balance || 0;
    if (currentBalance < totalCost) {
      log(`[AutoOrder] User ${userData.name}: insufficient balance (৳${currentBalance} < ৳${totalCost}). Turning off.`);
      await userDoc.ref.update({ autoOrderEnabled: false });
      turnedOffCount++;
      continue;
    }

    // Place orders in a transaction
    try {
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(userDoc.ref);
        const fresh = freshSnap.data();
        const freshBalance = fresh.balance || 0;
        if (freshBalance < totalCost) throw new Error("Insufficient balance");

        const orderedMealsCount = { ...(fresh.orderedMealsCount || {}) };
        for (const item of orderItems) {
          const key = `${item.date}_${item.id}`;
          const already = orderedMealsCount[key] || 0;
          if (already + 1 > 3) throw new Error(`Portion limit exceeded for ${item.name}`);
          orderedMealsCount[key] = already + 1;
        }

        transaction.update(userDoc.ref, {
          balance: freshBalance - totalCost,
          orderedMealsCount,
          lastAutoOrderDate: bdDateStr
        });

        for (const item of orderItems) {
          const orderRef = db.collection("orders").doc();
          transaction.set(orderRef, {
            userId,
            userName: fresh.name || fresh.displayName || "",
            userEmail: fresh.email || "",
            userNumericId: fresh.userId || null,
            roomNumber: fresh.roomNumber || "",
            items: [item],
            totalAmount: item.price || 0,
            status: "pending",
            orderType: "auto",
            createdAt: FieldValue.serverTimestamp()
          });
        }

        const transRef = db.collection("transactions").doc();
        transaction.set(transRef, {
          userId,
          amount: totalCost,
          type: "debit",
          description: `Auto Order Payment (${orderItems.length} meal${orderItems.length > 1 ? "s" : ""})`,
          createdAt: FieldValue.serverTimestamp()
        });
      });

      log(`[AutoOrder] ✅ ${userData.name}: ${orderItems.length} order(s), ৳${totalCost} deducted.`);
      successCount++;
    } catch (err) {
      log(`[AutoOrder] ❌ ${userData.name}: Transaction failed — ${err.message}`);
      failedCount++;
    }
  }

  log(`\n[AutoOrder] ── Summary ──`);
  log(`✅ Success  : ${successCount}`);
  log(`⏭️  Skipped  : ${skippedCount}`);
  log(`❌ Failed   : ${failedCount}`);
  log(`🔴 Turned off: ${turnedOffCount}`);

  return { success: true, successCount, skippedCount, failedCount, turnedOffCount, logs };
}

// ── Vercel Serverless Function handler ────────────────────────────────────────
export default async function handler(req, res) {
  // Security: only allow Vercel cron calls or requests with the correct secret
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await processAutoOrders();
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AutoOrder] Fatal error:", error);
    return res.status(500).json({ error: error.message });
  }
}
