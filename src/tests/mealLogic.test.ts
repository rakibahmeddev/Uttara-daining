/**
 * mealLogic.test.ts — Meal Ordering Business Logic Unit Tests
 *
 * মিল অর্ডারিং-এর সব Pure Function গুলো টেস্ট করে।
 * কোনো Firebase বা React dependency নেই — শুধু pure logic।
 *
 * Test Coverage:
 *  - checkOrderWindow()   → 9 PM–11 PM window এবং boundary cases
 *  - getMealTargetDate()  → 1 PM cutoff এবং date calculation
 *  - hasEnoughBalance()   → balance comparison
 *  - calculateTotal()     → price × quantity
 *  - clampQuantity()      → min-1 clamping
 */

import { describe, it, expect } from "vitest";
import {
  checkOrderWindow,
  getMealTargetDate,
  hasEnoughBalance,
  calculateTotal,
  clampQuantity,
  ORDER_WINDOW_START_HOUR,
  ORDER_WINDOW_END_HOUR,
  MEAL_DATE_CUTOFF_HOUR,
} from "../utils/mealLogic";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: নির্দিষ্ট ঘণ্টা ও মিনিটে Date তৈরি করার utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * আজকের তারিখে নির্দিষ্ট সময়ের Date object তৈরি করে।
 * Time-based logic টেস্ট করার জন্য ব্যবহার করা হয়।
 */
function makeDate(hour: number, minute: number = 0, second: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, second, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. checkOrderWindow — Order Window (9 PM – 11 PM) Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("checkOrderWindow()", () => {
  // ── Constants sanity check ────────────────────────────────────────────────
  it("constants should match expected business rules", () => {
    expect(ORDER_WINDOW_START_HOUR).toBe(21); // 9:00 PM
    expect(ORDER_WINDOW_END_HOUR).toBe(23);   // 11:00 PM (exclusive)
  });

  // ── Window খোলা থাকার সময় ────────────────────────────────────────────────
  describe("✅ order window OPEN cases", () => {
    it("9:00 PM exactly — window just opened", () => {
      const result = checkOrderWindow(makeDate(21, 0));
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe("open");
    });

    it("9:30 PM — mid window", () => {
      const result = checkOrderWindow(makeDate(21, 30));
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe("open");
    });

    it("10:00 PM — inside window", () => {
      const result = checkOrderWindow(makeDate(22, 0));
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe("open");
    });

    it("10:59 PM — last minute inside window", () => {
      const result = checkOrderWindow(makeDate(22, 59, 59));
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe("open");
    });

    it("11:00 PM exactly — boundary (original code allows this)", () => {
      // StudentHome.tsx line 45: `|| (currentHour === 23 && currentMinute === 0)`
      const result = checkOrderWindow(makeDate(23, 0));
      expect(result.isOpen).toBe(true);
      expect(result.reason).toBe("open");
    });
  });

  // ── Window বন্ধ থাকার সময় (too-early) ────────────────────────────────────
  describe("❌ too-early cases", () => {
    it("12:00 AM midnight — way too early", () => {
      const result = checkOrderWindow(makeDate(0, 0));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-early");
    });

    it("6:00 AM morning", () => {
      const result = checkOrderWindow(makeDate(6, 0));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-early");
    });

    it("1:00 PM (cutoff hour) — still too early for ordering", () => {
      const result = checkOrderWindow(makeDate(13, 0));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-early");
    });

    it("8:59 PM — one minute before window opens", () => {
      const result = checkOrderWindow(makeDate(20, 59));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-early");
    });

    it("8:00 PM — one hour before window", () => {
      const result = checkOrderWindow(makeDate(20, 0));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-early");
    });
  });

  // ── Window বন্ধ থাকার সময় (too-late) ────────────────────────────────────
  describe("❌ too-late cases", () => {
    it("11:01 PM — just missed the window", () => {
      const result = checkOrderWindow(makeDate(23, 1));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-late");
    });

    it("11:30 PM — late night", () => {
      const result = checkOrderWindow(makeDate(23, 30));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-late");
    });

    it("11:59 PM — almost midnight", () => {
      const result = checkOrderWindow(makeDate(23, 59));
      expect(result.isOpen).toBe(false);
      expect(result.reason).toBe("too-late");
    });
  });

  // ── Return type shape ─────────────────────────────────────────────────────
  it("always returns { isOpen: boolean, reason: string }", () => {
    const result = checkOrderWindow(makeDate(10, 0));
    expect(result).toHaveProperty("isOpen");
    expect(result).toHaveProperty("reason");
    expect(typeof result.isOpen).toBe("boolean");
    expect(typeof result.reason).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getMealTargetDate — 1 PM Cutoff & Target Date Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("getMealTargetDate()", () => {
  // ── Constants sanity check ────────────────────────────────────────────────
  it("cutoff hour constant should be 13 (1:00 PM)", () => {
    expect(MEAL_DATE_CUTOFF_HOUR).toBe(13);
  });

  // ── আজকের মিল দেখাবে (cutoff-এর আগে) ───────────────────────────────────
  describe("✅ shows TODAY's meals (before 1 PM)", () => {
    it("12:00 AM — shows today", () => {
      const now = new Date("2024-03-15T00:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-15");
      expect(result.isToday).toBe(true);
    });

    it("8:00 AM morning — shows today", () => {
      const now = new Date("2024-03-15T08:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-15");
      expect(result.isToday).toBe(true);
    });

    it("12:59 PM — last minute before cutoff, shows today", () => {
      const now = new Date("2024-03-15T12:59:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-15");
      expect(result.isToday).toBe(true);
    });
  });

  // ── পরের দিনের মিল দেখাবে (cutoff-এ বা পরে) ─────────────────────────────
  describe("✅ shows TOMORROW's meals (at or after 1 PM)", () => {
    it("1:00 PM exactly — shows tomorrow", () => {
      const now = new Date("2024-03-15T13:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-16");
      expect(result.isToday).toBe(false);
    });

    it("6:00 PM — shows tomorrow", () => {
      const now = new Date("2024-03-15T18:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-16");
      expect(result.isToday).toBe(false);
    });

    it("9:30 PM (order window) — shows tomorrow's date", () => {
      const now = new Date("2024-03-15T21:30:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-16");
      expect(result.isToday).toBe(false);
    });

    it("11:59 PM — shows tomorrow", () => {
      const now = new Date("2024-03-15T23:59:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-03-16");
      expect(result.isToday).toBe(false);
    });
  });

  // ── Month-end rollover ────────────────────────────────────────────────────
  describe("📅 month-end & year-end date rollover", () => {
    it("March 31 at 9 PM — should rollover to April 1", () => {
      const now = new Date("2024-03-31T21:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-04-01");
    });

    it("December 31 at 9 PM — should rollover to January 1 next year", () => {
      const now = new Date("2024-12-31T21:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2025-01-01");
    });

    it("Feb 28 at 9 PM (non-leap year) — should rollover to March 1", () => {
      const now = new Date("2023-02-28T21:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2023-03-01");
    });

    it("Feb 28 at 9 PM (leap year 2024) — should rollover to Feb 29", () => {
      const now = new Date("2024-02-28T21:00:00");
      const result = getMealTargetDate(now);
      expect(result.dateString).toBe("2024-02-29");
    });
  });

  // ── Return type ───────────────────────────────────────────────────────────
  it("dateString is always YYYY-MM-DD format", () => {
    const result = getMealTargetDate(new Date("2024-06-05T10:00:00"));
    // Regex: 4 digit year - 2 digit month - 2 digit day
    expect(result.dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. hasEnoughBalance — Balance Check Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("hasEnoughBalance()", () => {
  it("balance > total — can order", () => {
    expect(hasEnoughBalance(200, 150)).toBe(true);
  });

  it("balance === total — exact match, can order", () => {
    expect(hasEnoughBalance(150, 150)).toBe(true);
  });

  it("balance < total — cannot order", () => {
    expect(hasEnoughBalance(100, 150)).toBe(false);
  });

  it("zero balance — cannot order", () => {
    expect(hasEnoughBalance(0, 50)).toBe(false);
  });

  it("zero total — always can order (free meal)", () => {
    expect(hasEnoughBalance(0, 0)).toBe(true);
  });

  it("large balance, small order — can order", () => {
    expect(hasEnoughBalance(10000, 50)).toBe(true);
  });

  it("handles fractional amounts", () => {
    expect(hasEnoughBalance(99.99, 100)).toBe(false);
    expect(hasEnoughBalance(100.01, 100)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. calculateTotal — Price × Quantity Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateTotal()", () => {
  it("basic calculation: 50 × 2 = 100", () => {
    expect(calculateTotal(50, 2)).toBe(100);
  });

  it("single quantity: price × 1 = price", () => {
    expect(calculateTotal(80, 1)).toBe(80);
  });

  it("zero price: 0 × any = 0", () => {
    expect(calculateTotal(0, 5)).toBe(0);
  });

  it("zero quantity: price × 0 = 0", () => {
    expect(calculateTotal(100, 0)).toBe(0);
  });

  it("typical meal order: ৳75 × 3 = ৳225", () => {
    expect(calculateTotal(75, 3)).toBe(225);
  });

  it("handles decimal prices (e.g., ৳49.50 × 2 = ৳99)", () => {
    expect(calculateTotal(49.5, 2)).toBeCloseTo(99);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. clampQuantity — Min-1 Quantity Clamping Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("clampQuantity()", () => {
  it("decreasing from 3 → 2", () => {
    expect(clampQuantity(3, -1)).toBe(2);
  });

  it("increasing from 3 → 4", () => {
    expect(clampQuantity(3, +1)).toBe(4);
  });

  it("decreasing from 1 → stays at 1 (minimum)", () => {
    expect(clampQuantity(1, -1)).toBe(1);
  });

  it("decreasing from 2 → 1 (minimum boundary)", () => {
    expect(clampQuantity(2, -1)).toBe(1);
  });

  it("large decrease from 1 → stays at 1", () => {
    expect(clampQuantity(1, -100)).toBe(1);
  });

  it("increasing from 1 → 2", () => {
    expect(clampQuantity(1, +1)).toBe(2);
  });

  it("no change (+0) keeps same value", () => {
    expect(clampQuantity(5, 0)).toBe(5);
  });
});
