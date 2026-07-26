const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountKey) {
  console.error("FATAL ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("FATAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT. Ensure it is valid JSON.");
  console.error(error);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Normalizes time slot names to standard capitalization.
 */
function normalizeSlot(slot) {
  if (!slot) return "";
  const s = slot.toLowerCase();
  if (s.includes("break")) return "Breakfast";
  if (s.includes("lunch")) return "Lunch";
  if (s.includes("dinner")) return "Dinner";
  return slot;
}

/**
 * Main execution function
 */
async function processAutoOrders() {
  console.log(`[AutoOrder] Starting execution at ${new Date().toISOString()}`);

  // Calculate today's date string in Bangladesh time (UTC+6)
  const now = new Date();
  const bdOffset = 6 * 60 * 60 * 1000; // UTC+6 in ms
  const bdNow = new Date(now.getTime() + bdOffset);
  const bdDateStr = bdNow.toISOString().slice(0, 10); // e.g. "2025-07-25"
  console.log(`[AutoOrder] Processing for BD date: ${bdDateStr}`);

  try {
    // 1. Fetch all available meals
    const mealsSnapshot = await db.collection("meals").where("available", "==", true).get();
    const availableMeals = new Map();
    mealsSnapshot.forEach((doc) => {
      availableMeals.set(doc.id, { id: doc.id, ...doc.data() });
    });

    if (availableMeals.size === 0) {
      console.log("[AutoOrder] No available meals found. Exiting.");
      return;
    }
    console.log(`[AutoOrder] Found ${availableMeals.size} available meals.`);

    // 2. Get users with autoOrderEnabled == true
    const usersSnapshot = await db.collection("users").where("autoOrderEnabled", "==", true).get();

    if (usersSnapshot.empty) {
      console.log("[AutoOrder] No users have auto order enabled. Exiting.");
      return;
    }
    console.log(`[AutoOrder] Found ${usersSnapshot.size} users with auto order enabled.`);

    // 3. Process each user
    let successCount = 0;
    let failedCount = 0;
    let turnedOffCount = 0;
    let skippedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // ── Duplicate guard (no index needed) ──
      // We store lastAutoOrderDate on the user document after a successful order.
      // If it already equals today's date string, skip this user entirely.
      if (userData.lastAutoOrderDate === bdDateStr) {
        console.log(`[AutoOrder] User ${userId} (${userData.name}) already auto-ordered today. Skipping.`);
        skippedCount++;
        continue;
      }

      // Resolve which meal IDs to order
      const mealIds = [...(userData.autoOrderMealIds || [])];
      if (mealIds.length === 0) {
        // Legacy fallback: autoOrderLunch / autoOrderDinner booleans
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
        console.log(`[AutoOrder] User ${userId} has auto-order enabled but no meals selected. Skipping.`);
        skippedCount++;
        continue;
      }

      // Filter to meals that are actually available right now (match by ID)
      let selectedMeals = mealIds
        .filter(id => availableMeals.has(id))
        .map(id => availableMeals.get(id));

      // ── Slot-based fallback ──────────────────────────────────────────────────
      // If none of the stored IDs are in today's available meals (because meals
      // are recreated each day with new IDs), derive the desired slots from the
      // user's stored meal preferences and pick today's matching meals instead.
      if (selectedMeals.length === 0) {
        console.log(`[AutoOrder] User ${userId}: stored meal IDs not in today's meals. Falling back to slot matching.`);

        // Determine which slots the user wants
        const wantedSlots = new Set();

        // From autoOrderMealIds: look up the slot of each stored meal in Firestore
        // (they may exist in the DB even if not "available" today)
        for (const storedId of mealIds) {
          // We'll derive slot from the legacy flags as a best-effort
        }

        // Prefer the explicit boolean flags (always kept in sync by the UI)
        if (userData.autoOrderLunch)  wantedSlots.add("Lunch");
        if (userData.autoOrderDinner) wantedSlots.add("Dinner");
        if (userData.autoOrderBreakfast) wantedSlots.add("Breakfast");

        // If flags are absent, try to derive from stored meal IDs via timeSlot name
        if (wantedSlots.size === 0 && mealIds.length > 0) {
          // Check each available meal to see if any stored ID shares the same slot
          // We can't look up old meals cheaply, so just skip — user should re-save prefs
          console.log(`[AutoOrder] User ${userId}: no slot flags found. Skipping.`);
          skippedCount++;
          continue;
        }

        // Pick today's available meal for each wanted slot
        for (const slot of wantedSlots) {
          const match = Array.from(availableMeals.values()).find(
            m => normalizeSlot(m.timeSlot) === slot
          );
          if (match) selectedMeals.push(match);
        }

        if (selectedMeals.length === 0) {
          console.log(`[AutoOrder] User ${userId}: no available meals found for wanted slots [${[...wantedSlots].join(", ")}]. Skipping.`);
          skippedCount++;
          continue;
        }

        console.log(`[AutoOrder] User ${userId}: slot fallback matched ${selectedMeals.length} meal(s).`);
      }

      if (selectedMeals.length === 0) {
        console.log(`[AutoOrder] User ${userId}'s selected meals are not currently available. Skipping.`);
        skippedCount++;
        continue;
      }


      // Build order items and total cost (quantity always 1)
      let totalCost = 0;
      const orderItems = [];
      for (const meal of selectedMeals) {
        totalCost += meal.price || 0;
        orderItems.push({
          id: meal.id,
          name: meal.name,
          price: meal.price,
          quantity: 1,
          date: meal.date,
          timeSlot: meal.timeSlot || ""
        });
      }

      const currentBalance = userData.balance || 0;

      // ── Insufficient balance: turn off auto order ──
      if (currentBalance < totalCost) {
        console.log(`[AutoOrder] User ${userId} (${userData.name}) insufficient balance. Cost: ৳${totalCost}, Balance: ৳${currentBalance}. Turning off.`);
        try {
          await userDoc.ref.update({ autoOrderEnabled: false });
          turnedOffCount++;
        } catch (err) {
          console.error(`[AutoOrder] Failed to turn off auto order for ${userId}:`, err.message);
        }
        continue;
      }

      // ── Place ONE order per meal via Firestore transaction ──
      // Each meal gets its own order document so slot filters work correctly.
      try {
        await db.runTransaction(async (transaction) => {
          const freshUserSnap = await transaction.get(userDoc.ref);
          const freshUserData = freshUserSnap.data();
          const freshBalance = freshUserData.balance || 0;

          if (freshBalance < totalCost) {
            throw new Error(`Insufficient balance during transaction for ${userId}`);
          }

          const newBalance = freshBalance - totalCost;

          // Enforce per-meal 3-portion limit
          const orderedMealsCount = { ...(freshUserData.orderedMealsCount || {}) };
          for (const item of orderItems) {
            const key = `${item.date}_${item.id}`;
            const already = orderedMealsCount[key] || 0;
            if (already + 1 > 3) {
              throw new Error(`Portion limit exceeded for ${item.name}`);
            }
            orderedMealsCount[key] = already + 1;
          }

          // Update user: deduct balance, update meal counts, record lastAutoOrderDate
          transaction.update(userDoc.ref, {
            balance: newBalance,
            orderedMealsCount,
            lastAutoOrderDate: bdDateStr
          });

          // Create ONE order document PER MEAL (so slot filter is accurate)
          for (const item of orderItems) {
            const orderRef = db.collection("orders").doc();
            transaction.set(orderRef, {
              userId,
              userName: freshUserData.name || freshUserData.displayName || "",
              userEmail: freshUserData.email || "",
              userNumericId: freshUserData.userId || null,
              roomNumber: freshUserData.roomNumber || "",
              items: [item],                        // single item per order
              totalAmount: item.price || 0,
              status: "pending",
              orderType: "auto",
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }

          // Single transaction record for total deduction
          const transRef = db.collection("transactions").doc();
          transaction.set(transRef, {
            userId,
            amount: totalCost,
            type: "debit",
            description: `Auto Order Payment (${orderItems.length} meal${orderItems.length > 1 ? 's' : ''})`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        console.log(`[AutoOrder] ✅ Success for ${userId} (${userData.name}). ${orderItems.length} order(s) created. ৳${totalCost} deducted.`);
        successCount++;
      } catch (err) {
        console.error(`[AutoOrder] ❌ Transaction failed for ${userId}:`, err.message);
        failedCount++;
      }
    }

    console.log(`\n[AutoOrder] ── Summary ──`);
    console.log(`✅ Successfully ordered : ${successCount}`);
    console.log(`⏭️  Skipped (already done): ${skippedCount}`);
    console.log(`❌ Failed               : ${failedCount}`);
    console.log(`🔴 Auto-order turned off: ${turnedOffCount}`);

  } catch (error) {
    console.error("[AutoOrder] Unhandled execution error:", error);
    process.exit(1);
  }
}

// Run
processAutoOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
