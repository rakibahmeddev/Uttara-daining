const admin = require("firebase-admin");

// Initialize Firebase Admin
// This requires the FIREBASE_SERVICE_ACCOUNT environment variable to be set
// with the JSON content of a service account key.
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

  // Calculate today's date boundaries in Bangladesh time (UTC+6)
  const now = new Date();
  const bdOffset = 6 * 60 * 60 * 1000; // UTC+6 in ms
  const bdNow = new Date(now.getTime() + bdOffset);
  const bdDateStr = bdNow.toISOString().slice(0, 10); // e.g. "2025-07-25"
  const todayStartUTC = new Date(bdNow.toISOString().slice(0, 10) + 'T00:00:00+06:00');
  const todayEndUTC   = new Date(bdNow.toISOString().slice(0, 10) + 'T23:59:59+06:00');
  console.log(`[AutoOrder] Processing for BD date: ${bdDateStr}`);

  try {
    // 1. Get today's/tomorrow's meals
    // In our system, the auto order runs at 9 PM for the next day's meals.
    // Let's get all available meals to check against user selections.
    const mealsSnapshot = await db.collection("meals").where("available", "==", true).get();
    const availableMeals = new Map();
    mealsSnapshot.forEach((doc) => {
      availableMeals.set(doc.id, { id: doc.id, ...doc.data() });
    });

    if (availableMeals.size === 0) {
      console.log("[AutoOrder] No available meals found. Exiting.");
      return;
    }
    
    console.log(`[AutoOrder] Found ${availableMeals.size} available meals in the system.`);

    // 2. Get users with autoOrderEnabled
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

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // ── Duplicate guard: skip if already auto-ordered today ──
      const existingOrdersSnap = await db.collection("orders")
        .where("userId", "==", userId)
        .where("orderType", "==", "auto")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStartUTC))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(todayEndUTC))
        .limit(1)
        .get();
      
      if (!existingOrdersSnap.empty) {
        console.log(`[AutoOrder] User ${userId} (${userData.name}) already has an auto order today. Skipping.`);
        continue;
      }
      
      const mealIds = userData.autoOrderMealIds || [];
      if (mealIds.length === 0) {
        // Fallback for legacy users who only had autoOrderLunch or autoOrderDinner
        if (userData.autoOrderLunch) {
          const lunchMeal = Array.from(availableMeals.values()).find(m => normalizeSlot(m.timeSlot) === 'Lunch');
          if (lunchMeal) mealIds.push(lunchMeal.id);
        }
        if (userData.autoOrderDinner) {
          const dinnerMeal = Array.from(availableMeals.values()).find(m => normalizeSlot(m.timeSlot) === 'Dinner');
          if (dinnerMeal) mealIds.push(dinnerMeal.id);
        }
      }

      if (mealIds.length === 0) {
        console.log(`[AutoOrder] User ${userId} has auto-order enabled but no meals selected. Skipping.`);
        continue;
      }

      // Filter to only meals that are actually available
      const selectedMeals = [];
      for (const mId of mealIds) {
        if (availableMeals.has(mId)) {
          selectedMeals.push(availableMeals.get(mId));
        }
      }

      if (selectedMeals.length === 0) {
        console.log(`[AutoOrder] User ${userId}'s selected meals are not currently available. Skipping.`);
        continue;
      }

      // Calculate cost
      let totalCost = 0;
      const orderItems = [];
      for (const meal of selectedMeals) {
        totalCost += meal.price || 0;
        orderItems.push({
          id: meal.id,
          name: meal.name,
          price: meal.price,
          quantity: 1, // hardcoded to 1 for auto order
          date: meal.date,
          timeSlot: meal.timeSlot || ""
        });
      }

      const currentBalance = userData.balance || 0;

      if (currentBalance < totalCost) {
        console.log(`[AutoOrder] User ${userId} (${userData.name}) has insufficient balance. Cost: ৳${totalCost}, Balance: ৳${currentBalance}. Turning off auto-order.`);
        try {
          await userDoc.ref.update({ autoOrderEnabled: false });
          turnedOffCount++;
        } catch (err) {
          console.error(`[AutoOrder] Failed to turn off auto order for user ${userId}`, err);
        }
        continue;
      }

      // We have sufficient balance. Run a transaction to safely deduct and create order.
      try {
        await db.runTransaction(async (transaction) => {
          const freshUserSnap = await transaction.get(userDoc.ref);
          const freshUserData = freshUserSnap.data();
          const freshBalance = freshUserData.balance || 0;

          if (freshBalance < totalCost) {
            throw new Error(`Insufficient balance during transaction for ${userId}`);
          }

          // Deduct balance
          const newBalance = freshBalance - totalCost;
          
          // Update ordered meals count (max 3 portions rule)
          const orderedMealsCount = freshUserData.orderedMealsCount || {};
          for (const item of orderItems) {
            const mealKey = `${item.date}_${item.id}`;
            const alreadyOrdered = orderedMealsCount[mealKey] || 0;
            if (alreadyOrdered + item.quantity > 3) {
              throw new Error(`Meal portion limit exceeded for ${item.name}`);
            }
            orderedMealsCount[mealKey] = alreadyOrdered + item.quantity;
          }

          transaction.update(userDoc.ref, { 
            balance: newBalance,
            orderedMealsCount: orderedMealsCount
          });

          // Create Order
          const orderRef = db.collection("orders").doc();
          transaction.set(orderRef, {
            userId: userId,
            userName: freshUserData.name || freshUserData.displayName || "",
            userEmail: freshUserData.email || "",
            userNumericId: freshUserData.userId || null,
            roomNumber: freshUserData.roomNumber || "",
            items: orderItems,
            totalAmount: totalCost,
            status: "pending",
            orderType: "auto",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Create Transaction Record
          const transRef = db.collection("transactions").doc();
          transaction.set(transRef, {
            userId: userId,
            amount: totalCost,
            type: "debit",
            description: "Auto Order Payment",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        console.log(`[AutoOrder] Successfully processed order for user ${userId} (${userData.name}). Total cost: ৳${totalCost}.`);
        successCount++;
      } catch (err) {
        console.error(`[AutoOrder] Transaction failed for user ${userId}:`, err.message);
        failedCount++;
      }
    }

    console.log(`\n[AutoOrder] Execution Summary:`);
    console.log(`- Successfully processed: ${successCount}`);
    console.log(`- Failed: ${failedCount}`);
    console.log(`- Auto-order disabled (insufficient balance): ${turnedOffCount}`);

  } catch (error) {
    console.error("[AutoOrder] Unhandled execution error:", error);
    process.exit(1);
  }
}

// Run the script
processAutoOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
