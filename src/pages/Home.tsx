import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getMeals } from '../services/db';
import type { Meal } from '../types';
import {
  ArrowRight,
  ShoppingCart,
  ChefHat,
  Clock,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  UserPlus,
  LogIn,
  Home as HomeIcon,
  Hash,
  Building2,
  Phone,
} from 'lucide-react';
import { loginUser, registerUser, logoutUser } from '../services/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';

const TIME_SLOT_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
const TIME_SLOT_COLORS = {
  breakfast: 'from-amber-500 to-orange-400',
  lunch: 'from-orange-500 to-red-400',
  dinner: 'from-indigo-600 to-purple-500',
};

/* ─────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────── */
function AuthModal({ mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode); // "login" | "register"
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // register fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('');
  const [hall, setHall] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await loginUser(email, password);
      const snap = await getDoc(doc(db, 'users', user.uid));
      const role = snap.exists() ? snap.data().role : 'student';
      onSuccess(role);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerUser(regEmail, regPassword, {
        name,
        roomNumber,
        registrationNumber: regNo,
        departmentName: department,
        hallName: hall,
        phone,
      });
      onSuccess('student');
    } catch (err) {
      setError('Registration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input style objects (guarantees specificity over Tailwind resets) ── */
  const inputBase: React.CSSProperties = {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 40 /* proper padding, equivalent to pl-10 */,
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
    paddingRight: 44 /* room for eye toggle */,
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

  const labelClass = 'block text-xs font-semibold uppercase tracking-wider';
  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    marginBottom: 8,
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
    /* ── Overlay ── */
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fade-in"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        padding: '0 0 0 0',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── Modal Container ── */}
      <div
        className="auth-modal-container animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '94vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1.3,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {mode === 'login' ? 'Welcome back 👋' : 'Create account ✨'}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 4,
                margin: '4px 0 0 0',
              }}
            >
              {mode === 'login'
                ? 'Sign in to Uttara Dining'
                : 'Join Uttara Dining today'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 16,
              transition: 'background 0.2s',
            }}
          >
            <X size={16} />
          </button>
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
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s',
                fontFamily: 'inherit',
                ...(mode === m
                  ? {
                      background: 'linear-gradient(135deg,#f97316,#fbbf24)',
                      color: '#fff',
                    }
                  : { background: 'transparent', color: 'var(--text-muted)' }),
              }}
            >
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
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

        {/* ═══════════════════ LOGIN FORM ═══════════════════ */}
        {mode === 'login' && (
          <form
            onSubmit={handleLogin}
            style={{ padding: '24px 24px 28px 24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label className={labelClass} style={labelStyle}>
                  Email or Mobile Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={iconStyle} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com or 017XXXXXXXX"
                    style={inputBase}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelClass} style={labelStyle}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={iconStyle} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={inputPassBase}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════ REGISTER FORM ═══════════════════ */}
        {mode === 'register' && (
          <form
            onSubmit={handleRegister}
            style={{ padding: '24px 24px 28px 24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name / Email / Password */}
              {[
                {
                  label: 'Full Name',
                  icon: User,
                  val: name,
                  set: setName,
                  type: 'text',
                  ph: 'Your full name',
                },
                {
                  label: 'Email',
                  icon: Mail,
                  val: regEmail,
                  set: setRegEmail,
                  type: 'email',
                  ph: 'your@email.com',
                },
                {
                  label: 'Mobile Number',
                  icon: Phone,
                  val: phone,
                  set: setPhone,
                  type: 'tel',
                  ph: '017XXXXXXXX',
                },
                {
                  label: 'Password',
                  icon: Lock,
                  val: regPassword,
                  set: setRegPassword,
                  type: 'password',
                  ph: 'Min. 6 characters',
                },
              ].map(({ label, icon: Icon, val, set, type, ph }) => (
                <div key={label}>
                  <label className={labelClass} style={labelStyle}>
                    {label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Icon size={16} style={iconStyle} />
                    <input
                      type={type}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      required
                      placeholder={ph}
                      minLength={type === 'password' ? 6 : undefined}
                      style={inputBase}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              ))}

              {/* Room No. + Reg. No. (2-col grid) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                {[
                  {
                    label: 'Room No.',
                    icon: HomeIcon,
                    val: roomNumber,
                    set: setRoomNumber,
                    ph: 'e.g. 301',
                  },
                  {
                    label: 'Reg. No.',
                    icon: Hash,
                    val: regNo,
                    set: setRegNo,
                    ph: '2023001',
                  },
                ].map(({ label, icon: Icon, val, set, ph }) => (
                  <div key={label}>
                    <label className={labelClass} style={labelStyle}>
                      {label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={14} style={iconSmallStyle} />
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        required
                        placeholder={ph}
                        style={inputSmall}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Department + Hall */}
              {[
                {
                  label: 'Department',
                  icon: Building2,
                  val: department,
                  set: setDepartment,
                  ph: 'Management',
                },
                {
                  label: 'Hall Name',
                  icon: Building2,
                  val: hall,
                  set: setHall,
                  ph: 'Uttara Hall',
                },
              ].map(({ label, icon: Icon, val, set, ph }) => (
                <div key={label}>
                  <label className={labelClass} style={labelStyle}>
                    {label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Icon size={16} style={iconStyle} />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      required
                      placeholder={ph}
                      style={inputBase}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              ))}

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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────── */
export default function Home() {
  const { currentUser, userRole } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState<string | null>(null); // "login" | "register" | null
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const data = await getMeals();
      setMeals(data.filter((m) => m.available));
    } catch (e) {
      console.error('Error fetching meals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (role: string) => {
    setAuthModal(null);
    if (role === 'admin') navigate('/admin');
    else if (role === 'manager') navigate('/manager');
    else navigate('/student');
  };

  const dashboardPath =
    userRole === 'admin'
      ? '/admin'
      : userRole === 'manager'
        ? '/manager'
        : '/student';

  return (
    <div
      className="min-h-screen flex flex-col items-center w-full"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ════ NAVBAR ════ */}
      <Header variant="public" onLoginRequest={() => setAuthModal('login')} onRegisterRequest={() => setAuthModal('register')} />

      {/* ════ MENU SECTION ════ */}
      <main
        className="flex-1 mx-auto  w-full px-4 sm:px-6 lg:px-8 py-0"
        style={{ maxWidth: '1200px', marginTop: '40px', marginBottom: '40px', paddingLeft: '20px', paddingRight: '20px' }}
      >
        {/* Section header */}
        <div className="flex justify-center my-20">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <h2
              className="text-2xl sm:text-3xl text-center font-black"
              style={{ color: 'var(--text-primary)', textAlign: 'center' }}
            >
              Today's Menu
            </h2>
            <p
              className="text-md mt-0.5"
              style={{ color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}
            >
              Fresh options updated every day
            </p>
          </div>
        </div>

        {/* Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="skeleton h-44 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-11 w-full rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 mx-auto">
            <span className="text-6xl">🍽️</span>
            <p
              className="text-lg font-bold"
              style={{ color: 'var(--text-secondary)' }}
            >
              No meals available right now
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Check back later for fresh additions
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
            {meals.map((meal, i) => (
              <MealCard
                key={meal.id}
                meal={meal}
                index={i}
                currentUser={currentUser}
                userRole={userRole}
                addToCart={addToCart}
                onLoginRequest={() => setAuthModal('login')}
              />
            ))}
          </div>
        )}
      </main>

      {/* ════ FOOTER ════ */}
      <Footer />

      {/* ════ AUTH MODAL ════ */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MEAL CARD
───────────────────────────────────────── */
function MealCard({
  meal,
  index,
  currentUser,
  userRole,
  addToCart,
  onLoginRequest,
}) {
  const timeKey = (meal.timeSlot || '').toLowerCase();
  const emoji = TIME_SLOT_ICONS[timeKey] || '🍽️';
  const gradient = TIME_SLOT_COLORS[timeKey] || 'from-orange-500 to-amber-400';

  return (
    <div
      className="meal-card flex flex-col animate-fade-in-up"
      style={{
        animationDelay: `${index * 0.06}s`,
        animationFillMode: 'both',
        opacity: 0,
      }}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden"
        style={{ height: '160px', background: 'var(--bg-elevated)' }}
      >
        {meal.image ? (
          <img
            src={meal.image}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{
              background:
                'linear-gradient(135deg,var(--bg-elevated),var(--bg-surface))',
            }}
          >
            {emoji}
          </div>
        )}
        {/* Time badge */}
        <div
          className={`absolute top-3 left-3 inline-flex items-center gap-2 rounded-full font-bold text-white bg-gradient-to-r ${gradient} shadow-lg`}
          style={{ padding: '3px 14px', fontSize: '13px' }}
        >
          {emoji} <span className="capitalize">{meal.timeSlot || 'Meal'}</span>
        </div>
        {/* Price */}
        <div className="custom-price-badge">৳{meal.price}</div>
      </div>

      {/* Content */}
      <div className="meal-card-body">
        <div className="flex-1">
          <h3 className="meal-card-title truncate">{meal.name}</h3>
          <p className="meal-card-desc line-clamp-2">
            {meal.description || 'Freshly prepared for you'}
          </p>
        </div>

        {/* CTA — full width, comfortable height */}
        {currentUser && userRole === 'student' ? (
          <button
            onClick={() => addToCart(meal)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base md:text-lg font-bold text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#f97316,#fbbf24)',
              boxShadow: '0 4px 14px rgba(249,115,22,0.28)',
              padding: '10px 0',
            }}
          >
            <ShoppingCart size={18} /> Order Now
          </button>
        ) : currentUser && (userRole === 'admin' || userRole === 'manager') ? (
          <button
            onClick={() => {
              if ((currentUser.balance ?? 0) >= meal.price) {
                addToCart(meal);
              } else {
                alert(
                  `⚠️ Insufficient balance!\nYour balance: ৳${currentUser.balance ?? 0}\nMeal price: ৳${meal.price}\nPlease top up your balance to proceed.`,
                );
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#f97316,#fbbf24)',
              boxShadow: '0 4px 14px rgba(249,115,22,0.28)',
            }}
          >
            <ShoppingCart size={14} /> Order Now
          </button>
        ) : (
          <button
            onClick={onLoginRequest}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white transition-all active:scale-95 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg,#f97316,#fbbf24)',
              boxShadow: '0 4px 14px rgba(249,115,22,0.28)',
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '16px',
            }}
          >
            <LogIn size={15} /> Login to Order
          </button>
        )}
      </div>
    </div>
  );
}
