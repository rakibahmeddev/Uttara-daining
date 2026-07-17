import { ChefHat } from "lucide-react";

export default function Footer() {
    return (
        <footer
            className="mt-auto mx-auto w-full mt-20 sm:mt-32 mb-16 sm:mb-24"
            style={{ maxWidth: "1200px", paddingLeft: "20px", paddingRight: "20px" }}
        >
            <div
                className="px-5 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 w-full"
                style={{
                    paddingTop: "20px",
                    paddingBottom: "20px",
                    borderTop: "1px solid var(--border-color)",
                }}
            >
                {/* Brand */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)" }}
                    >
                        <ChefHat size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold gradient-text">Uttara Dining</span>
                </div>

                {/* Copyright */}
                <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
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
