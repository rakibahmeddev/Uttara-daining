import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, onSnapshot, query, doc, updateDoc, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { placeOrder } from '../../services/db';
import type { Order } from '../../types';

interface GuestOrderModal {
  room: string;
  isOpen: boolean;
}

export default function RiderDeliveryScreen() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered'>('pending');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [guestModal, setGuestModal] = useState<GuestOrderModal>({ room: '', isOpen: false });

  // Modal state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [mealQty, setMealQty] = useState('1');
  const [userSearch, setUserSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'cash'>('balance');
  const [addingOrder, setAddingOrder] = useState(false);

  const getLocalTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now.getTime() - offset)).toISOString().slice(0, 10);
  };

  const isAuthorizedRider = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') return true;
    if (currentUser?.assignedDeliveryDate === getLocalTodayString()) return true;
    return false;
  }, [currentUser]);

  const formatOrderTime = (createdAt: any): string => {
    if (!createdAt) return '—';
    try {
      const date = typeof createdAt === 'object' && 'seconds' in createdAt
        ? new Date(createdAt.seconds * 1000)
        : new Date(createdAt);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
  };

  const formatOrderDate = (createdAt: any): string => {
    if (!createdAt) return '—';
    try {
      const date = typeof createdAt === 'object' && 'seconds' in createdAt
        ? new Date(createdAt.seconds * 1000)
        : new Date(createdAt);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch { return '—'; }
  };

  // Active orders listener
  useEffect(() => {
    const q = query(collection(db, 'orders'), where("status", "in", ["pending", "active", "processing", "delivered"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      const todayStr = getLocalTodayString();
      
      const pending: Order[] = [];
      const delivered: Order[] = [];

      ordersData.forEach(order => {
        let isToday = false;
        if (order.createdAt && typeof order.createdAt === 'object' && 'seconds' in order.createdAt) {
          const d = new Date(order.createdAt.seconds * 1000);
          const offset = d.getTimezoneOffset() * 60000;
          isToday = (new Date(d.getTime() - offset)).toISOString().slice(0, 10) === todayStr;
        } else if (order.date === todayStr) {
          isToday = true;
        } else {
          isToday = true;
        }

        if (isToday && order.status !== "cancelled") {
          if (order.status === "delivered") {
            // Only show meals delivered by THIS rider
            if (order.deliveredBy === currentUser?.uid) {
              delivered.push(order);
            }
          } else {
            pending.push(order);
          }
        }
      });
      
      // Sort delivered orders by time descending
      delivered.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setOrders(pending);
      setDeliveredOrders(delivered);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch users and meals when modal opens
  const openGuestModal = async (room: string) => {
    setGuestModal({ room, isOpen: true });
    setSelectedUserId('');
    setSelectedMealId('');
    setMealQty('1');
    setUserSearch('');
    setPaymentMethod('balance');

    try {
      const [usersSnap, mealsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('userId', 'asc'))),
        getDocs(query(collection(db, 'meals'))),
      ]);
      setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTodayMeals(mealsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load users/meals', err);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    if (!isAuthorizedRider) {
      alert("You are not authorized to deliver meals. Only the assigned rider, admin, or manager can do this.");
      return;
    }
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'delivered', 
        deliveredAt: new Date(),
        deliveredBy: currentUser?.uid || null 
      });
    } catch {
      alert("Failed to update status. Please try again.");
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!isAuthorizedRider) {
      alert("You are not authorized to cancel orders. Only the assigned rider, admin, or manager can do this.");
      return;
    }
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', cancelledAt: new Date() });
    } catch {
      alert("Failed to cancel order.");
    } finally {
      setCancellingId(null);
    }
  };

  const handlePlaceQuickOrder = async () => {
    if (!selectedUserId) { alert("Please select a user."); return; }
    if (!selectedMealId) { alert("Please select a meal."); return; }

    const user = allUsers.find(u => u.id === selectedUserId);
    const meal = todayMeals.find(m => m.id === selectedMealId);
    if (!user || !meal) return;

    const qty = Math.max(1, Number(mealQty) || 1);
    const totalAmount = (meal.price || 0) * qty;

    if (paymentMethod === 'balance' && (user.balance || 0) < totalAmount) {
      alert(`Insufficient balance! ${user.name}'s balance is ৳${user.balance || 0}, required ৳${totalAmount}.`);
      return;
    }

    setAddingOrder(true);
    try {
      if (paymentMethod === 'balance') {
        // Deduct from balance via transaction
        await placeOrder(user.id, [{ name: meal.name, price: meal.price, quantity: qty }], totalAmount);
        alert(`✅ Order placed for ${user.name}! ৳${totalAmount} deducted from balance.`);
      } else {
        // Cash payment — just record the order, no deduction
        const { addDoc, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'orders'), {
          userId: user.id,
          userName: user.name || '',
          userEmail: user.email || '',
          userNumericId: user.userId || null,
          roomNumber: user.roomNumber || guestModal.room,
          items: [{ name: meal.name, price: meal.price, quantity: qty }],
          totalAmount,
          paymentMethod: 'cash',
          status: 'pending',
          createdAt: serverTimestamp(),
        });
        alert(`✅ Cash order placed for ${user.name}! ৳${totalAmount} to be collected manually.`);
      }
      setGuestModal({ room: '', isOpen: false });
    } catch (err: any) {
      alert(`Failed to place order: ${err?.message || err}`);
    } finally {
      setAddingOrder(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      String(u.userId || '').includes(q) ||
      u.roomNumber?.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const selectedUser = allUsers.find(u => u.id === selectedUserId);
  const selectedMeal = todayMeals.find(m => m.id === selectedMealId);
  const qty = Math.max(1, Number(mealQty) || 1);
  const orderTotal = (selectedMeal?.price || 0) * qty;
  const hasEnoughBalance = (selectedUser?.balance || 0) >= orderTotal;

  const ordersByRoom = useMemo(() => {
    return orders.reduce((acc, order) => {
      const room = order.roomNumber || "Unknown Room";
      if (!acc[room]) acc[room] = [];
      acc[room].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500 font-medium">Loading active deliveries...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-fade-in-up mb-10">

      {/* Header Tabs */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px 16px 8px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => setActiveTab('pending')}
          className={`font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}
        >
          Active Deliveries
          <span className={`${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'} rounded-full px-2 py-0.5 text-xs`}>
            {orders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'delivered' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}
        >
          All Meals
          <span className={`${activeTab === 'delivered' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'} rounded-full px-2 py-0.5 text-xs`}>
            {deliveredOrders.length}
          </span>
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
          {/* Header Info — always shown, regardless of whether there are pending orders */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ padding: '8px 16px 16px 16px' }}>
            <div>
              <h1 className="font-bold tracking-tight" style={{ color: '#0f172a', fontSize: '20px' }}>To Deliver</h1>
              <p className="font-medium" style={{ color: '#475569', fontSize: '13px', marginTop: '2px' }}>Today's non-delivered orders grouped by room.</p>
            </div>
          </div>

          {orders.length === 0 ? (
            /* Empty state — same card style as a room card, just no orders, with Add New still available */
            <div style={{ padding: '0 12px 12px 12px' }}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-200 flex items-center justify-between" style={{ padding: '10px 16px' }}>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2" style={{ fontSize: '16px' }}>
                    <svg style={{ width: '16px', height: '16px' }} className="text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    No pending orders
                  </h2>
                  <button
                    onClick={() => openGuestModal('')}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"
                    style={{ padding: '5px 10px', fontSize: '11px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add New
                  </button>
                </div>
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p className="text-slate-500 font-medium" style={{ fontSize: '13px' }}>All orders have been delivered for today.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Orders Grouped by Room */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 12px 12px 12px' }}>
              {Object.entries(ordersByRoom).map(([room, roomOrders]) => (
                <div key={room} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                  {/* Room Header */}
                  <div className="bg-slate-50 border-b border-gray-200 flex items-center justify-between" style={{ padding: '10px 16px' }}>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2" style={{ fontSize: '16px' }}>
                      <svg style={{ width: '16px', height: '16px' }} className="text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                      Room {room}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-bold text-slate-600 bg-white rounded-full border border-gray-200 shadow-sm" style={{ padding: '3px 10px', fontSize: '11px' }}>
                        {roomOrders.length} {roomOrders.length === 1 ? 'Order' : 'Orders'}
                      </span>
                      <button
                        onClick={() => openGuestModal(room)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"
                        style={{ padding: '5px 10px', fontSize: '11px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Add New
                      </button>
                    </div>
                  </div>

                  {/* Room Orders Table */}
                  <div className="overflow-x-auto" style={{ padding: '0 16px 8px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-slate-400" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          <th style={{ padding: '10px 6px 8px 0' }}>User ID</th>
                          <th style={{ padding: '10px 6px 8px 6px' }}>Order Details</th>
                          <th style={{ padding: '10px 6px 8px 6px' }}>Order Time</th>
                          <th style={{ padding: '10px 0 8px 6px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomOrders.map((order) => (
                          <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td style={{ padding: '12px 6px 12px 0', verticalAlign: 'middle', minWidth: '90px' }}>
                              <div className="font-bold text-slate-800" style={{ fontSize: '13px', marginBottom: '2px' }}>
                                {order.userName || "Unknown"}
                                {(order as any).isGuestOrder && (
                                  <span className="ml-1 text-orange-600 bg-orange-50 rounded" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>Guest</span>
                                )}
                              </div>
                              <div className="font-semibold" style={{ fontSize: '11px', color: '#6366f1', background: '#eef2ff', borderRadius: '4px', padding: '1px 6px', display: 'inline-block', marginTop: '2px' }}>
                                #{order.userNumericId || "—"}
                              </div>
                            </td>
                            <td style={{ padding: '12px 6px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {order.items?.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <div className="bg-indigo-50 rounded" style={{ padding: '3px' }}>
                                      <svg style={{ width: '12px', height: '12px' }} className="text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"></path>
                                      </svg>
                                    </div>
                                    <p className="font-bold text-slate-700" style={{ fontSize: '12px' }}>{item.quantity}x {item.name}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 6px', verticalAlign: 'middle', minWidth: '70px' }}>
                              <div className="font-bold text-slate-700" style={{ fontSize: '12px' }}>{formatOrderTime(order.createdAt)}</div>
                              <div className="text-slate-400 font-medium" style={{ fontSize: '11px' }}>{formatOrderDate(order.createdAt)}</div>
                            </td>
                            <td style={{ padding: '12px 0 12px 6px', verticalAlign: 'middle', textAlign: 'right' }}>
                                {isAuthorizedRider && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                    <button
                                      onClick={() => handleMarkDelivered(order.id)}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                      style={{ padding: '5px 10px', fontSize: '11px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                      <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                      Delivered
                                    </button>
                                    <button
                                      onClick={() => handleCancel(order.id)}
                                      disabled={cancellingId === order.id}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
                                      style={{ padding: '5px 10px', fontSize: '11px', border: '1px solid #fecaca', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                      <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                      {cancellingId === order.id ? '...' : 'Cancel'}
                                    </button>
                                  </div>
                                )}
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'delivered' && (
        <>
          {deliveredOrders.length === 0 ? (
            <div className="max-w-2xl mx-auto p-12 text-center bg-white rounded-3xl shadow-sm border border-gray-100 m-6 mt-8 animate-fade-in-up">
              <div className="text-6xl mb-6">📭</div>
              <h2 className="text-2xl font-bold text-gray-900">No deliveries yet</h2>
              <p className="text-gray-500 mt-2">Meals you deliver today will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-4" style={{ margin: '0 12px' }}>
              <div className="bg-emerald-50 border-b border-emerald-100 flex items-center justify-between" style={{ padding: '14px 16px' }}>
                <h2 className="font-bold text-emerald-800 flex items-center gap-2" style={{ fontSize: '16px' }}>
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  Meals Delivered By You Today
                </h2>
              </div>
              <div className="overflow-x-auto" style={{ padding: '0 16px 8px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-400" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <th style={{ padding: '12px 6px 10px 0' }}>User & Room</th>
                      <th style={{ padding: '12px 6px 10px 6px' }}>Meal Items</th>
                      <th style={{ padding: '12px 6px 10px 6px' }}>Order Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td style={{ padding: '14px 6px 14px 0', verticalAlign: 'middle', minWidth: '100px' }}>
                          <div className="font-bold text-slate-800" style={{ fontSize: '13px', marginBottom: '3px' }}>
                            {order.userName || "Unknown"}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span className="font-semibold" style={{ fontSize: '10px', color: '#6366f1', background: '#eef2ff', borderRadius: '4px', padding: '2px 6px' }}>
                              #{order.userNumericId || "—"}
                            </span>
                            <span className="font-bold text-slate-600 bg-slate-100 rounded" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              Rm {order.roomNumber || "—"}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 6px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {order.items?.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div className="bg-emerald-50 rounded" style={{ padding: '3px' }}>
                                  <svg style={{ width: '12px', height: '12px' }} className="text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                </div>
                                <p className="font-bold text-slate-700" style={{ fontSize: '12px' }}>{item.quantity}x {item.name}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 6px', verticalAlign: 'middle', minWidth: '70px' }}>
                          <div className="font-bold text-slate-700" style={{ fontSize: '12px' }}>{formatOrderTime(order.createdAt)}</div>
                          <div className="text-slate-400 font-medium" style={{ fontSize: '11px' }}>{formatOrderDate(order.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Order Modal */}
      {guestModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setGuestModal({ room: '', isOpen: false })}
        >
          <div
            className="bg-white animate-fade-in"
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: '420px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '20px 20px 28px 20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ marginBottom: '16px' }}>
              <h3 className="font-bold text-slate-800" style={{ fontSize: '17px' }}>➕ Quick Order</h3>
              <p className="text-slate-500" style={{ fontSize: '12px', marginTop: '2px' }}>
                {guestModal.room ? `Room ${guestModal.room} · ` : ''}Select user and meal below
              </p>
            </div>

            {/* User Dropdown */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                Select User <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Search by name, ID or room..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-orange-400 bg-white"
                style={{ padding: '8px 12px', fontSize: '13px', marginBottom: '8px' }}
              />
              <select
                className="w-full border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-orange-400 bg-white"
                style={{ padding: '10px 12px', fontSize: '13px', appearance: 'auto' }}
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPaymentMethod('balance'); // reset payment on user change
                }}
              >
                <option value="">— Choose a user —</option>
                {allUsers.filter(u => 
                  !userSearch || 
                  u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                  u.userId?.toString().includes(userSearch) || 
                  u.roomNumber?.toString().toLowerCase().includes(userSearch.toLowerCase())
                ).map((user) => (
                  <option key={user.id} value={user.id}>
                    #{user.userId || '—'} · {user.name} {user.roomNumber ? `(Room ${user.roomNumber}) ` : ''}(৳{user.balance || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Meal Dropdown */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
                Select Meal <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-orange-400 bg-white"
                style={{ padding: '10px 12px', fontSize: '13px', appearance: 'auto' }}
                value={selectedMealId}
                onChange={(e) => setSelectedMealId(e.target.value)}
              >
                <option value="">— Choose a meal —</option>
                {todayMeals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name} — ৳{meal.price} {meal.date ? `(${new Date(meal.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})` : ''} {meal.timeSlot ? `[${meal.timeSlot}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-orange-400"
                style={{ padding: '9px 12px', fontSize: '13px' }}
                value={mealQty}
                onChange={(e) => setMealQty(e.target.value)}
              />
            </div>

            {/* Payment Method — shown only after user & meal selected */}
            {selectedUser && selectedMeal && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Balance option */}
                  <button
                    type="button"
                    onClick={() => hasEnoughBalance && setPaymentMethod('balance')}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: paymentMethod === 'balance' ? '2px solid #f97316' : '1.5px solid #e2e8f0',
                      background: paymentMethod === 'balance' ? '#fff7ed' : (hasEnoughBalance ? 'white' : '#f8fafc'),
                      color: hasEnoughBalance ? (paymentMethod === 'balance' ? '#ea580c' : '#64748b') : '#cbd5e1',
                      cursor: hasEnoughBalance ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>💳 Balance</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: hasEnoughBalance ? '#16a34a' : '#ef4444' }}>
                      ৳{selectedUser.balance || 0} {hasEnoughBalance ? 'available' : '(insufficient)'}
                    </span>
                  </button>

                  {/* Cash option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: paymentMethod === 'cash' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                      background: paymentMethod === 'cash' ? '#f0fdf4' : 'white',
                      color: paymentMethod === 'cash' ? '#15803d' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>💵 Cash</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Collect manually</span>
                  </button>
                </div>

                {/* Insufficient balance warning */}
                {!hasEnoughBalance && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ Not enough balance (৳{selectedUser.balance || 0}). Required ৳{orderTotal}. Please select Cash.
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            {selectedUser && selectedMeal && (
              <div style={{ background: paymentMethod === 'cash' ? '#f0fdf4' : '#fff7ed', border: `1px solid ${paymentMethod === 'cash' ? '#bbf7d0' : '#fed7aa'}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: paymentMethod === 'cash' ? '#166534' : '#92400e', marginBottom: '4px' }}>Order Summary</div>
                <div style={{ fontSize: '13px', color: paymentMethod === 'cash' ? '#15803d' : '#b45309' }}>
                  {selectedUser.name} · {qty}x {selectedMeal.name} = <strong>৳{orderTotal}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  {paymentMethod === 'balance'
                    ? `Balance: ৳${selectedUser.balance || 0} → After: ৳${(selectedUser.balance || 0) - orderTotal}`
                    : '💵 Cash payment — balance will NOT be deducted'}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setGuestModal({ room: '', isOpen: false })}
                className="flex-1 font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                style={{ padding: '11px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceQuickOrder}
                disabled={addingOrder || !selectedUserId || !selectedMealId || (paymentMethod === 'balance' && !hasEnoughBalance)}
                className="flex-1 font-bold rounded-xl text-white transition-all"
                style={{
                  padding: '11px',
                  fontSize: '13px',
                  cursor: (addingOrder || !selectedUserId || !selectedMealId || (paymentMethod === 'balance' && !hasEnoughBalance)) ? 'not-allowed' : 'pointer',
                  background: (addingOrder || !selectedUserId || !selectedMealId || (paymentMethod === 'balance' && !hasEnoughBalance))
                    ? '#94a3b8'
                    : paymentMethod === 'cash' ? '#16a34a' : '#f97316',
                }}
              >
                {addingOrder ? 'Placing...' : `${paymentMethod === 'cash' ? '💵 Cash' : '💳 Balance'} · ৳${orderTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
