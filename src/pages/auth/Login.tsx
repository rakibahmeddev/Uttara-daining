import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { user } = await loginUser(email, password);

            // Fetch user role to redirect correctly
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                if (role === "admin") navigate("/admin");
                else if (role === "manager") navigate("/manager");
                else navigate("/student");
            } else {
                navigate("/student");
            }
        } catch (err) {
            setError("Invalid email or password.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /* ── shared input style objects ── */
    const inputBase: React.CSSProperties = {
        width: "100%",
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 40,
        paddingRight: 16,
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 500,
        color: "#0f172a",
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        fontFamily: "inherit",
    };

    const inputPassBase: React.CSSProperties = {
        ...inputBase,
        paddingRight: 44,
    };

    const iconStyle: React.CSSProperties = {
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "var(--text-muted)",
    };

    const labelStyle: React.CSSProperties = {
        color: "var(--text-secondary)",
        marginBottom: 8,
        display: "block",
        fontSize: "0.75rem",
        lineHeight: "1rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "rgba(249,115,22,0.6)";
        e.target.style.boxShadow = "0 0 0 2px rgba(249,115,22,0.15)";
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "#cbd5e1";
        e.target.style.boxShadow = "none";
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{
                background: "var(--bg-base)",
                padding: "20px"
            }}
        >
            {/* Background blobs */}
            <div
                className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
                style={{ background: "radial-gradient(circle, #f97316, transparent 70%)", transform: "translate(-30%, -30%)" }}
            />
            <div
                className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: "radial-gradient(circle, #0f766e, transparent 70%)", transform: "translate(30%, 30%)" }}
            />

            {/* ── Modal Container (Page-style) ── */}
            <div
                className="auth-modal-container animate-fade-in-up relative z-10"
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "24px",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
                    overflow: "hidden"
                }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        padding: "24px 24px 16px 24px",
                        borderBottom: "1px solid var(--border-color)",
                    }}
                >
                    <h2
                        style={{
                            fontSize: 20,
                            fontWeight: 900,
                            color: "#0f172a",
                            lineHeight: 1.3,
                            margin: 0,
                        }}
                    >
                        Welcome back 👋
                    </h2>
                    <p
                        style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            margin: "4px 0 0 0",
                        }}
                    >
                        Sign in to Uttara Dining
                    </p>
                </div>

                {/* ── Tab Switcher ── */}
                <div
                    style={{
                        display: "flex",
                        margin: "20px 24px 0 24px",
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.05)",
                        padding: 4,
                    }}
                >
                    <button
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            fontSize: 14,
                            fontWeight: 600,
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            background: "linear-gradient(135deg,#f97316,#fbbf24)",
                            color: "#fff",
                        }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => navigate("/register")}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            fontSize: 14,
                            fontWeight: 600,
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            background: "transparent",
                            color: "var(--text-muted)",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                        Register
                    </button>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div
                        style={{
                            margin: "16px 24px 0 24px",
                            padding: "12px 16px",
                            borderRadius: 14,
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#f87171",
                        }}
                        className="animate-fade-in"
                    >
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* ── Form ── */}
                <form
                    onSubmit={handleLogin}
                    style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}
                >
                    <div>
                        <label style={labelStyle}>Email or Mobile Number</label>
                        <div style={{ position: "relative" }}>
                            <Mail size={16} style={iconStyle} />
                            <input
                                type="text"
                                placeholder="your@email.com or 017XXXXXXXX"
                                style={inputBase}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Password</label>
                        <div style={{ position: "relative" }}>
                            <Lock size={16} style={iconStyle} />
                            <input
                                type={showPass ? "text" : "password"}
                                placeholder="••••••••"
                                style={inputPassBase}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            marginTop: 12,
                            padding: "14px 0",
                            borderRadius: 14,
                            border: "none",
                            background: "linear-gradient(135deg,#f97316,#fbbf24)",
                            color: "#fff",
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.8 : 1,
                            boxShadow: "0 4px 14px rgba(249,115,22,0.25)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 8,
                            transition: "transform 0.1s",
                        }}
                        onMouseDown={(e) => !loading && (e.currentTarget.style.transform = "scale(0.98)")}
                        onMouseUp={(e) => !loading && (e.currentTarget.style.transform = "scale(1)")}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = "scale(1)")}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                {/* Back Link */}
                <div
                    style={{
                        padding: "0 24px 24px 24px",
                        textAlign: "center",
                    }}
                >
                    <Link
                        to="/"
                        style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            textDecoration: "none",
                            fontWeight: 500,
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
