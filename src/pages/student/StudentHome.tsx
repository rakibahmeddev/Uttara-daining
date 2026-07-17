import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { placeOrder } from '../../services/db';
import { Button } from '../../components/ui/Button';
import {
  ShoppingBag,
  Plus,
  Minus,
  ChefHat,
  Clock,
  DollarSign,
  Calendar,
  Wallet,
  X,
} from 'lucide-react';
import type { Meal } from '../../types';

const TIME_SLOT_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
const TIME_SLOT_COLORS = {
  breakfast: 'from-amber-500 to-orange-400',
  lunch: 'from-orange-500 to-red-400',
  dinner: 'from-indigo-600 to-purple-500',
};

export default function StudentHome() {
  const { currentUser } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderLoading, setOrderLoading] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    meal: Meal | null;
    quantity: number;
    total: number;
  }>({ show: false, meal: null, quantity: 0, total: 0 });

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const q = query(collection(db, 'meals'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const mealsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Meal[];
      const availableMeals = mealsData.filter((meal) => meal.available);
      setMeals(availableMeals);
      const initialQuantities = {};
      availableMeals.forEach((meal) => {
        initialQuantities[meal.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (mealId, change) => {
    setQuantities((prev) => ({
      ...prev,
      [mealId]: Math.max(1, (prev[mealId] || 1) + change),
    }));
  };

  const handleOrder = (meal) => {
    if (!currentUser) {
      alert('Please log in to place an order');
      return;
    }
    const quantity = quantities[meal.id] || 1;
    const totalAmount = meal.price * quantity;
    if ((currentUser.balance || 0) < totalAmount) {
      alert(
        `Insufficient balance! You need ৳${totalAmount} but have ৳${currentUser.balance || 0}`,
      );
      return;
    }
    setConfirmModal({ show: true, meal, quantity, total: totalAmount });
  };

  const confirmOrder = async () => {
    const { meal, quantity, total } = confirmModal;
    setConfirmModal({ show: false, meal: null, quantity: 0, total: 0 });
    setOrderLoading((prev) => ({ ...prev, [meal.id]: true }));
    try {
      await placeOrder(
        currentUser.uid,
        [{ id: meal.id, name: meal.name, price: meal.price, quantity }],
        total,
      );
      alert(
        `✅ Order placed successfully!\n৳${total} deducted from your balance.`,
      );
      setQuantities((prev) => ({ ...prev, [meal.id]: 1 }));
    } catch (error) {
      console.error('Error placing order:', error);
      alert(
        '❌ ' + (error.message || 'Failed to place order. Please try again.'),
      );
    } finally {
      setOrderLoading((prev) => ({ ...prev, [meal.id]: false }));
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
          style={{
            borderColor: 'rgba(249,115,22,0.2)',
            borderTopColor: '#f97316',
          }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading today's menu...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ width: '100%', margin: '0 auto', padding: '0 20px' }}>
      {/* ── Section Header ── */}
      <div className="flex flex-col items-center justify-center text-center w-full py-12 md:py-16" style={{marginBottom: '50px', marginTop:'50px'}}>
        <h2
          className="text-4xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Today's Menu
        </h2>
        
      </div>

      {/* ── Meals Grid ── */}
      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl">🍽️</span>
          <p
            className="text-base font-bold"
            style={{ color: 'var(--text-secondary)' }}
          >
            No Meals Available
          </p>
          <p
            className="text-sm text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Check back later for delicious options!
          </p>
        </div>
      ) : (
        /* 2-column grid on mobile, 3 on large screens */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full" style={{padding: '20px'}}> 
          {meals.map((meal) => {
            const quantity = quantities[meal.id] || 1;
            const totalPrice = meal.price * quantity;
            const isLoading = orderLoading[meal.id];
            const canAfford = (currentUser?.balance || 0) >= totalPrice;
            const timeKey = (meal.timeSlot || '').toLowerCase();
            const emoji = TIME_SLOT_EMOJIS[timeKey] || '🍽️';
            const gradient =
              TIME_SLOT_COLORS[timeKey] || 'from-orange-500 to-amber-400';

            return (
              <div key={meal.id} className="meal-card w-full flex flex-col">
                {/* ── Image ── */}
                <div
                  className="relative overflow-hidden"
                  style={{ height: '160px', background: 'var(--bg-elevated)' }}
                >
                  {meal.image ? (
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {emoji}
                    </div>
                  )}

                  {/* Time slot badge */}
                  <div
                    className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full font-bold text-white text-[13px] px-2.5 py-1 bg-gradient-to-r ${gradient} shadow-lg`}
                  >
                    {emoji}{' '}
                    <span className="capitalize">
                      {meal.timeSlot || 'Meal'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="custom-price-badge">৳{totalPrice}</div>
                </div>

                {/* ── Content ── */}
                <div
                  className="meal-card-body flex flex-col flex-1 gap-2"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '16px',
                  }}
                >
                  <div>
                    <h3 className="meal-card-title truncate">{meal.name}</h3>
                    {meal.description && (
                      <p className="meal-card-desc line-clamp-2">
                        {meal.description}
                      </p>
                    )}
                  </div>

                  {/* Date badge */}
                  {meal.date && (
                    <div
                      className="flex items-center gap-1 text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Calendar size={10} />
                      <span>{meal.date}</span>
                    </div>
                  )}

                  {/* Qty selector */}
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => updateQuantity(meal.id, -1)}
                      disabled={isLoading}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 transition-all active:scale-90 hover:bg-slate-200/60"
                      style={{ background: 'rgba(15,23,42,0.05)' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span
                      className="flex-1 text-center text-sm font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(meal.id, 1)}
                      disabled={isLoading}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 transition-all active:scale-90 hover:bg-slate-200/60"
                      style={{ background: 'rgba(15,23,42,0.05)' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Insufficient balance warning */}
                  {!canAfford && (
                    <p className="text-[10px] text-red-400 text-center">
                      ⚠️ Insufficient balance
                    </p>
                  )}

                  {/* Order button */}
                  <button
                    onClick={() => handleOrder(meal)}
                    disabled={isLoading || !canAfford}
                    className="w-full py-[13px] rounded-xl text-[16px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 hover:-translate-y-0.5"
                    style={
                      isLoading || !canAfford
                        ? {
                            background: 'rgba(255,255,255,0.08)',
                            opacity: 0.5,
                            cursor: 'not-allowed',
                          }
                        : {
                            background:
                              'linear-gradient(135deg, #f97316, #fbbf24)',
                            boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
                          }
                    }
                  >
                    {isLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Ordering...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={13} />
                        Order Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal.show && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',  }}
        >
          <div 
            className="w-full max-w-md animate-fade-in-up  overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between "
              style={{
                background: 'linear-gradient(135deg, #f97316, #fbbf24)', padding:'20px',
              }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-white" />
                <h3 className="text-[17px] font-black text-white">
                  Confirm Order
                </h3>
              </div>
              <button
                onClick={() =>
                  setConfirmModal({
                    show: false,
                    meal: null,
                    quantity: 0,
                    total: 0,
                  })
                }
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4" style={{ padding: '20px' }}>
              {/* Meal info */}
              <div
                className="flex items-center space-x-4 p-4 rounded-xl"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                {confirmModal.meal?.image ? (
                  <img
                    src={confirmModal.meal.image}
                    alt={confirmModal.meal.name}
                    className="w-16 h-16 rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm">
                    🍽️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-[15px] truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {confirmModal.meal?.name}
                  </p>
                  <p className="text-[13px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {confirmModal.meal?.description}
                  </p>
                </div>
              </div>

              {/* Order summary */}
              <div className="space-y-3 px-1">
                <div className="flex justify-between items-center text-[15px]">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Quantity
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {confirmModal.quantity}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[15px]">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Price per item
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    ৳{confirmModal.meal?.price}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center pt-3 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <span
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Total Amount
                  </span>
                  <span className="text-[20px] font-black gradient-text">
                    ৳{confirmModal.total}
                  </span>
                </div>
              </div>

              {/* Balance summary */}
              <div
                className="rounded-xl p-4 space-y-3 bg-slate-50 border border-slate-100"
              >
                <div className="flex justify-between items-center text-[14px]">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Current Balance
                  </span>
                  <span className="font-bold text-teal-600">
                    ৳{currentUser?.balance || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Balance After Order
                  </span>
                  <span className="font-bold text-teal-600">
                    ৳{(currentUser?.balance || 0) - confirmModal.total}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2  gap-4 pt-4"
              style={{ "paddingTop": '20px', }}
              >
                <button
                  onClick={() =>
                    setConfirmModal({
                      show: false,
                      meal: null,
                      quantity: 0,
                      total: 0,
                    })
                  }
                  className="w-full py-[12px] rounded-xl text-[15px] font-bold transition-all hover:bg-slate-200 active:scale-95"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOrder}
                  className="w-full py-[12px] rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                    boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
                  }}
                >
                  Confirm Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
