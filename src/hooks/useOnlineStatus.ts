/**
 * useOnlineStatus — Custom Hook
 *
 * ইউজার অনলাইন আছে কিনা সেটা ট্র্যাক করে।
 * `navigator.onLine` এবং `online` / `offline` ইভেন্ট লিসেনার ব্যবহার করে
 * রিয়েল-টাইমে নেটওয়ার্ক স্ট্যাটাস আপডেট দেয়।
 *
 * @returns {boolean} isOnline — true হলে অনলাইন, false হলে অফলাইন
 */
import { useState, useEffect } from "react";

/**
 * নেটওয়ার্ক স্ট্যাটাস ট্র্যাকিং-এর জন্য কাস্টম হুক।
 * কম্পোনেন্ট মাউন্ট হওয়ার সময় `navigator.onLine` থেকে
 * প্রাথমিক স্ট্যাটাস নেয় এবং browser event-এর মাধ্যমে
 * পরিবর্তন হলে রি-রেন্ডার ট্রিগার করে।
 */
export function useOnlineStatus(): boolean {
  // navigator.onLine দিয়ে প্রাথমিক মান সেট করা হচ্ছে
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    // অনলাইন হলে state true করা হবে
    const handleOnline = (): void => {
      setIsOnline(true);
    };

    // অফলাইন হলে state false করা হবে
    const handleOffline = (): void => {
      setIsOnline(false);
    };

    // ব্রাউজার ইভেন্ট লিসেনার যোগ করা
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup: কম্পোনেন্ট আনমাউন্ট হলে লিসেনার সরিয়ে দেওয়া
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
