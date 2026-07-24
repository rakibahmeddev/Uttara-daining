/**
 * vitest.config.ts — Vitest Test Runner Configuration
 *
 * Vite-এর উপরে Vitest চালানোর জন্য কনফিগারেশন।
 * jsdom environment ব্যবহার করা হয়েছে কারণ React component
 * test করতে DOM API দরকার।
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    /**
     * `jsdom` — ব্রাউজারের মতো DOM API simulate করে।
     * React Testing Library কাজ করতে এটা লাগে।
     */
    environment: "jsdom",

    /**
     * প্রতিটি test file চালানোর আগে এই setup file রান হবে।
     * @testing-library/jest-dom এর custom matchers যোগ করে।
     */
    setupFiles: ["./src/tests/setup.ts"],

    /**
     * TypeScript global types (describe, it, expect) কোনো
     * import ছাড়াই পাওয়া যাবে।
     */
    globals: true,

    /**
     * Coverage রিপোর্টের জন্য কনফিগ।
     * `npm run test:coverage` কমান্ডে রিপোর্ট পাওয়া যাবে।
     */
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/utils/**/*.ts", "src/context/**/*.tsx", "src/hooks/**/*.ts"],
      exclude: ["src/tests/**", "src/**/*.d.ts"],
    },

    /**
     * Test ফাইলের pattern — src/tests/ ফোল্ডারের সব .test.ts/tsx ফাইল।
     */
    include: ["src/tests/**/*.test.{ts,tsx}"],
  },
});
