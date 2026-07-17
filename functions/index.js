const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Promote a user to admin (Callable from client by existing admin)
exports.promoteUserToAdmin = functions.https.onCall(async (data, context) => {
    // Check if request is made by an admin
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const callerUid = context.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();

    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Only admins can promote other users."
        );
    }

    const { targetUid } = data;
    if (!targetUid) {
        throw new functions.https.HttpsError("invalid-argument", "Target UID is required.");
    }

    await db.collection("users").doc(targetUid).update({ role: "admin" });
    return { message: "User promoted successfully" };
});

// Daily Report (Scheduled every day at midnight)
exports.dailyReport = functions.pubsub.schedule("0 0 * * *").onRun(async (context) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const ordersSnapshot = await db.collection("orders")
        .where("createdAt", ">=", yesterday)
        .get();

    let totalSales = 0;
    let totalOrders = 0;

    ordersSnapshot.forEach(doc => {
        totalSales += doc.data().totalAmount;
        totalOrders += 1;
    });

    console.log(`Daily Report: ${totalOrders} orders, Total Sales: $${totalSales}`);

    // You could save this to a 'reports' collection
    await db.collection("reports").add({
        date: admin.firestore.Timestamp.fromDate(yesterday),
        totalOrders,
        totalSales,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return null;
});
