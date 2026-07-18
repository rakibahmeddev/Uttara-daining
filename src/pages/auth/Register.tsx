import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/auth';
import {
  User,
  Mail,
  Lock,
  Home as HomeIcon,
  Hash,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  Phone,
} from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [hallName, setHallName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerUser(email, password, {
        name,
        roomNumber,
        registrationNumber,
        departmentName,
        hallName,
        phone,
      });
      navigate('/student');
    } catch (err: any) {
      setError('Registration failed: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input style objects ── */
  const inputBase: React.CSSProperties = {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 40,
    paddingRight: 16,
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 500,
    color: '#0f172a',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  };

  const inputSmall: React.CSSProperties = {
    ...inputBase,
    paddingLeft: 36,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
  };

  const inputPassBase: React.CSSProperties = {
    ...inputBase,
    paddingRight: 44,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: 'var(--text-muted)',
  };

  const iconSmallStyle: React.CSSProperties = {
    ...iconStyle,
    left: 10,
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    marginBottom: 8,
    display: 'block',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(249,115,22,0.6)';
    e.target.style.boxShadow = '0 0 0 2px rgba(249,115,22,0.15)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#cbd5e1';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-12"
      style={{
        background: 'var(--bg-base)',
        paddingLeft: '20px',
        paddingRight: '20px',
      }}
    >
      {/* Background blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-12 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #f97316, transparent 70%)',
          transform: 'translate(30%, -30%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #0f766e, transparent 70%)',
          transform: 'translate(-30%, 30%)',
        }}
      />

      {/* ── Modal Container (Page-style) ── */}
      <div
        className="auth-modal-container animate-fade-in-up fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] max-h-[94vh] overflow-y-auto rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[0_24px_60px_rgba(0,0,0,0.4)] z-50 p-1"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            Create account ✨
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: '4px 0 0 0',
            }}
          >
            Join Uttara Dining today
          </p>
        </div>

        {/* ── Tab Switcher ── */}
        <div
          style={{
            display: 'flex',
            margin: '20px 24px 0 24px',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)',
            padding: 4,
          }}
        >
          <button
            onClick={() => navigate('/login')}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--text-muted)')
            }
          >
            Login
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg,#f97316,#fbbf24)',
              color: '#fff',
            }}
          >
            Register
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '12px 16px',
              borderRadius: 14,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
            }}
            className="animate-fade-in"
          >
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Form ── */}
        <form
          onSubmit={handleRegister}
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={iconStyle} />
              <input
                type="text"
                placeholder="Your full name"
                style={inputBase}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={iconStyle} />
              <input
                type="email"
                placeholder="your@email.com"
                style={inputBase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label style={labelStyle}>Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={iconStyle} />
              <input
                type="tel"
                placeholder="017XXXXXXXX"
                style={inputBase}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                style={inputPassBase}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Room No. + Reg. No. (2-col grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Room No.</label>
              <div style={{ position: 'relative' }}>
                <HomeIcon size={14} style={iconSmallStyle} />
                <input
                  type="text"
                  placeholder="e.g. 301"
                  style={inputSmall}
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Reg. No.</label>
              <div style={{ position: 'relative' }}>
                <Hash size={14} style={iconSmallStyle} />
                <input
                  type="text"
                  placeholder="2023001"
                  style={inputSmall}
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                />
              </div>
            </div>
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>Department</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={iconStyle} />
              <input
                type="text"
                placeholder="e.g. Computer Science"
                style={inputBase}
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>
          </div>

          {/* Hall Name */}
          <div>
            <label style={labelStyle}>Hall Name</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={iconStyle} />
              <input
                type="text"
                placeholder="e.g. Shaheed Minar Hall"
                style={inputBase}
                value={hallName}
                onChange={(e) => setHallName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 0',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 14,
              color: '#fff',
              background: 'linear-gradient(135deg,#f97316,#fbbf24)',
              boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.55 : 1,
              transition: 'all 0.2s',
              marginTop: 4,
              fontFamily: 'inherit',
            }}
            onMouseDown={(e) =>
              !loading && (e.currentTarget.style.transform = 'scale(0.98)')
            }
            onMouseUp={(e) =>
              !loading && (e.currentTarget.style.transform = 'scale(1)')
            }
            onMouseLeave={(e) =>
              !loading && (e.currentTarget.style.transform = 'scale(1)')
            }
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div
          style={{
            padding: '0 24px 24px 24px',
            textAlign: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              textDecoration: 'none',
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
