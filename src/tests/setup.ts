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
