/**
 * setup.ts — Global Test Setup File
 *
 * প্রতিটি test file রান হওয়ার আগে এই ফাইল execute হয়।
 *
 * @testing-library/jest-dom import করলে custom matchers পাওয়া যায়:
 *  - toBeInTheDocument()
 *  - toHaveTextContent()
 *  - toBeVisible()
 *  - toBeDisabled()
 *  - toHaveClass()
 *  ইত্যাদি
 */
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Globally mock Firebase to prevent tests from accidentally writing to live DB
vi.mock("../services/firebase", () => ({
  auth: { signOut: vi.fn(), onAuthStateChanged: vi.fn(), currentUser: null },
  db: {},
  storage: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn()
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(),
  initializeFirestore: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  runTransaction: vi.fn()
}));
