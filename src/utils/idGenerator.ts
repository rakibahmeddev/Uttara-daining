import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Generate the next sequential ID for a collection
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} fieldName - Name of the numeric ID field (e.g., 'orderNumber', 'requestNumber')
 * @param {number} startFrom - Starting number (default: 1)
 * @returns {Promise<number>} - The next ID number
 */
export const generateNextId = async (collectionName, fieldName, startFrom = 1) => {
    try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, orderBy(fieldName, 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return startFrom;
        }

        const lastDoc = snapshot.docs[0];
        const lastId = lastDoc.data()[fieldName];
        return (lastId || 0) + 1;
    } catch (error) {
        console.error(`Error generating next ID for ${collectionName}:`, error);
        // Fallback to timestamp-based ID if query fails
        return Date.now() % 100000;
    }
};

/**
 * Generate order number (ORD-00001, ORD-00002, etc.)
 */
export const generateOrderNumber = async () => {
    const nextId = await generateNextId('orders', 'orderNumber', 1);
    return nextId;
};

/**
 * Generate request number for balance requests (REQ-00001, REQ-00002, etc.)
 */
export const generateRequestNumber = async () => {
    const nextId = await generateNextId('balanceRequests', 'requestNumber', 1);
    return nextId;
};

/**
 * Generate meal number (1, 2, 3, etc.)
 */
export const generateMealNumber = async () => {
    const nextId = await generateNextId('meals', 'mealNumber', 1);
    return nextId;
};

/**
 * Format number with leading zeros
 */
export const formatIdNumber = (num, length = 5) => {
    return String(num).padStart(length, '0');
};
