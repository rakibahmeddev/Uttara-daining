import { ChefHat } from "lucide-react";

export default function Footer() {
    return (
        <footer
            className="mt-auto mx-auto w-full mt-20 sm:mt-32 mb-16 sm:mb-24"
            style={{ maxWidth: "1200px", paddingLeft: "20px", paddingRight: "20px" }}
        >
            <div
                className="px-5 sm:px-10 flex items-center justify-center w-full"
                style={{
                    paddingTop: "20px",
                    paddingBottom: "20px",
                    borderTop: "1px solid var(--border-color)",
                }}
            >
                {/* Copyright */}
                <p className="text-center" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    © {new Date().getFullYear()} Uttara Dining. All rights reserved. Design by{" "}
                    <a
                        href="https://rakibmiah.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold transition-colors hover:text-orange-400"
                        style={{ color: "" }}
                    >
                        Md Rakib Miah
                    </a>
                </p>
            </div>
        </footer>
    );
}
