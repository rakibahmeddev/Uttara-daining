import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const loginUser = async (emailOrPhone: string, password: string) => {
    const finalPassword = password.padEnd(6, '_');
    
    let loginEmail = emailOrPhone;
    
    // Check if the input is a phone number (doesn't contain '@')
    if (!emailOrPhone.includes('@')) {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        const phoneQuery = query(usersRef, where("phone", "==", emailOrPhone));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (phoneSnapshot.empty) {
            throw new Error("No account found with this phone number.");
        }
        
        loginEmail = phoneSnapshot.docs[0].data().email;
    }

    return await signInWithEmailAndPassword(auth, loginEmail, finalPassword);
};

export const registerUser = async (email: string, password: string, userData: any) => {
    const finalPassword = password.padEnd(6, '_');
    
    // Check for existing phone number before auth creation
    if (userData.phone) {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        const phoneQuery = query(usersRef, where("phone", "==", userData.phone));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
            throw new Error("An account with this phone number already exists.");
        }
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
    const user = userCredential.user;

    // Create user document in Firestore
    try {
        const { runTransaction, serverTimestamp } = await import('firebase/firestore');

        await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "metadata", "users");
            const userRef = doc(db, "users", user.uid);

            const counterDoc = await transaction.get(counterRef);
            let nextUserId = 1;

            if (counterDoc.exists()) {
                nextUserId = (counterDoc.data().lastUserId || 0) + 1;
            }

            transaction.set(counterRef, { lastUserId: nextUserId }, { merge: true });

            transaction.set(userRef, {
                uid: user.uid,
                email: user.email!.toLowerCase(),
                phone: userData.phone || '',
                password: password,
                name: userData.name || '',
                userId: nextUserId,
                idNumber: `STU-${nextUserId}`,
                roomNumber: userData.roomNumber || '',
                registrationNumber: userData.registrationNumber || '',
                departmentName: userData.departmentName || '',
                hallName: userData.hallName || '',
                role: "student",
                balance: 0,
                createdAt: serverTimestamp()
            });
        });

        console.log("User document created successfully for:", user.uid);
    } catch (dbError: any) {
        console.error("Firestore error:", dbError);
        // Try to clean up the Auth user
        try { await user.delete(); } catch (_) {}
        throw new Error("Registration failed: " + dbError.message);
    }

    return user;
};

export const logoutUser = async () => {
    return await signOut(auth);
};
