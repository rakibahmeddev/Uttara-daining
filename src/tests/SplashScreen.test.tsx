/**
 * SplashScreen.test.tsx — AuthProvider Splash Screen & Loading Tests
 *
 * AuthProvider-এর loading state, timeout fallback, এবং offline detection
 * সব কিছু টেস্ট করা হয়েছে। Firebase এবং নেটওয়ার্ককে mock করা হয়েছে
 * যাতে test গুলো fast এবং deterministic হয়।
 *
 * Test Coverage:
 *  - Splash screen render during loading
 *  - 5-second timeout → loading stops, error shown
 *  - Firebase auth error → loading stops immediately
 *  - Successful auth → children render
 *  - Offline banner → shown when navigator.onLine = false
 *  - Online → no offline banner
 *
 * Note on vi.mock hoisting:
 *  Vitest hoists vi.mock() calls to the top of the file automatically.
 *  তাই factory function-এর ভেতরে top-level variable reference করা যায় না।
 *  `vi.fn()` দিয়ে mock তৈরি করে `vi.mocked()` দিয়ে access করতে হয়।
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Mocks — vi.mock হয় hoisted, তাই factory-র বাইরের variable
// reference করা নিরাপদ নয়। vi.fn() দিয়ে stub তৈরি করা হচ্ছে।
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("../services/firebase", () => ({
  auth: { signOut: vi.fn() },
  db: {},
}));

vi.mock("firebase/auth", () => ({
  // onAuthStateChanged একটি vi.fn() stub — প্রতিটি test-এ mockImplementation দিয়ে কাস্টমাইজ করা হবে
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(),
  initializeFirestore: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  // FirebaseError class mock — isinstance check কাজ করার জন্য
  FirebaseError: class FirebaseError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "FirebaseError";
    }
  },
}));

// useOnlineStatus hook mock — isOnline value dynamically পরিবর্তন করা যাবে
vi.mock("../hooks/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — mocks এর পরে import করতে হবে যাতে vi.mocked() কাজ করে
// ─────────────────────────────────────────────────────────────────────────────

import { onAuthStateChanged } from "firebase/auth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { AuthProvider } from "../context/AuthContext";

// vi.mocked() দিয়ে TypeScript-typed mock reference পাওয়া যাচ্ছে
const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);
const mockUseOnlineStatus = vi.mocked(useOnlineStatus);

// ─────────────────────────────────────────────────────────────────────────────
// Test Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuthProvider-কে test children সহ render করে।
 * children render হলে auth loading সফলভাবে শেষ হয়েছে বোঝা যায়।
 */
function renderAuthProvider() {
  return render(
    <AuthProvider>
      <div data-testid="app-content">App is loaded!</div>
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup & Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();           // setTimeout/clearTimeout control নেওয়া হচ্ছে
  mockUseOnlineStatus.mockReturnValue(true); // default: online
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 1: Splash Screen / Loading State
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — Splash Screen (Loading State)", () => {
  it("🔄 shows loading spinner while Firebase initializes", () => {
    // onAuthStateChanged কখনো resolve করবে না → loading চলতে থাকবে
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    // Spinner role="status" থাকা উচিত
    const loadingEl = screen.getByRole("status");
    expect(loadingEl).toBeInTheDocument();
    expect(loadingEl).toHaveAttribute("aria-label", "অ্যাপ লোড হচ্ছে");
  });

  it("🔄 loading text 'লোড হচ্ছে...' দেখা যাচ্ছে", () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});
    renderAuthProvider();
    expect(screen.getByText(/লোড হচ্ছে/i)).toBeInTheDocument();
  });

  it("🚫 app children loading-এর সময় render হয় না", () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});
    renderAuthProvider();
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 2: 5-Second Timeout Fallback
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — 5-Second Timeout Fallback", () => {
  it("⏱️ 5 সেকেন্ড পরে loading বন্ধ হয় (timeout fallback)", async () => {
    // Firebase কখনো respond করবে না
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    // Loading শুরু হয়েছে
    expect(screen.getByRole("status")).toBeInTheDocument();

    // 5 সেকেন্ড পার করা হচ্ছে
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Timeout হওয়ার পর loading spinner আর নেই
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("⏱️ 4.9 সেকেন্ডে এখনও loading চলছে (timeout হয়নি)", async () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    await act(async () => {
      vi.advanceTimersByTime(4900); // 100ms কম
    });

    // এখনও loading
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("⏱️ timeout হলে refresh button সহ error banner দেখায়", async () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // "রিফ্রেশ করুন" বাটন আছে কিনা চেক করছি
    const refreshBtn = screen.getByRole("button", { name: /রিফ্রেশ করুন/i });
    expect(refreshBtn).toBeInTheDocument();
  });

  it("⏱️ timeout হলে auth-error-banner DOM-এ আছে", async () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const errorBanner = document.getElementById("auth-error-banner");
    expect(errorBanner).toBeInTheDocument();
  });

  it("⏱️ Firebase 2s-এ respond করলে timeout cancel হয়", async () => {
    // Firebase 2 সেকেন্ড পরে respond করবে (null = guest)
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      setTimeout(() => callback(null), 2000);
      return () => {};
    });

    renderAuthProvider();

    // 2 সেকেন্ড পরে Firebase responds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Loading শেষ হওয়া উচিত (timeout আসার আগেই)
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // আরও 3 সেকেন্ড পার করা (total = 5s) — error banner আসা উচিত নয়
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Error banner নেই — কারণ Firebase সঠিকভাবে respond করেছে
    expect(document.getElementById("auth-error-banner")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 3: Successful Authentication Flow
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 3: Successful Authentication Flow
// Real timers ব্যবহার করা হচ্ছে কারণ synchronous callback-এর পরেও
// React-এর internal Promise scheduler fake timers-এ block হয়ে যায়।
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — Successful Auth Flow", () => {
  // এই suite-এ real timers দরকার
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers(); // পরের suite-এর জন্য ফিরিয়ে দেওয়া
  });

  it("✅ No user (guest) হলে children render হয়", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null); // null = no logged in user
      return () => {};
    });

    await act(async () => {
      renderAuthProvider();
    });

    expect(screen.getByTestId("app-content")).toBeInTheDocument();
  });

  it("✅ Guest state-এ loading spinner নেই", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      renderAuthProvider();
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("✅ Normal auth completion-এ error banner নেই", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      renderAuthProvider();
    });

    expect(document.getElementById("auth-error-banner")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 4: Offline Warning Banner
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 4: Offline Warning Banner
// Real timers ব্যবহার করা হচ্ছে — same reason as Suite 3
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — Offline Warning Banner", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("📴 অফলাইনে offline warning banner দেখায়", async () => {
    // অফলাইন করা হচ্ছে
    mockUseOnlineStatus.mockReturnValue(false);

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    // act() দিয়ে synchronous state update flush করা হচ্ছে
    await act(async () => {
      renderAuthProvider();
    });

    const offlineBanner = document.getElementById("offline-warning-banner");
    expect(offlineBanner).toBeInTheDocument();
  });

  it("📴 offline banner-এ বাংলা 'অফলাইনে' message আছে", async () => {
    mockUseOnlineStatus.mockReturnValue(false);

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      renderAuthProvider();
    });

    expect(screen.getByText(/অফলাইনে আছেন/i)).toBeInTheDocument();
  });

  it("📶 অনলাইনে offline banner দেখায় না", async () => {
    mockUseOnlineStatus.mockReturnValue(true); // online

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    await act(async () => {
      renderAuthProvider();
    });

    expect(document.getElementById("offline-warning-banner")).not.toBeInTheDocument();
  });

  it("📴 loading চলাকালীন offline banner visible নয়", () => {
    // offline কিন্তু auth loading চলছে
    mockUseOnlineStatus.mockReturnValue(false);
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    renderAuthProvider();

    // Loading screen দেখা যাচ্ছে
    expect(screen.getByRole("status")).toBeInTheDocument();
    // offline banner দেখা যাচ্ছে না (loading screen cover করে রেখেছে)
    expect(document.getElementById("offline-warning-banner")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite 5: Cleanup & Memory Safety
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — Cleanup & Memory Safety", () => {
  it("🧹 unmount হলে Firebase unsubscribe call হয়", () => {
    const unsubscribeMock = vi.fn();
    mockOnAuthStateChanged.mockImplementation(() => unsubscribeMock);

    const { unmount } = renderAuthProvider();
    unmount();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });

  it("🧹 unmount হলে timeout clear হয় (no memory leak)", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    mockOnAuthStateChanged.mockImplementation(() => () => {});

    const { unmount } = renderAuthProvider();
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
