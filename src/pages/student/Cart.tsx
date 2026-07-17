import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { placeOrder } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { Trash2, Plus, Minus } from "lucide-react";

export default function Cart() {
    const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        if (currentUser.balance < cartTotal) {
            alert("Insufficient balance! Please contact admin to add funds.");
            return;
        }

        if (!confirm(`Confirm order for ৳${cartTotal}?`)) return;

        setLoading(true);
        try {
            await placeOrder(currentUser.uid, cart, cartTotal);
            clearCart();
            alert("Order placed successfully!");
            navigate("/student");
        } catch (error) {
            console.error("Order failed:", error);
            alert("Order failed: " + error);
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="text-center py-16 animate-fade-in-up">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-black text-slate-800 mb-4">Your Cart is Empty</h2>
                <p className="text-slate-500 mb-6 font-medium">Browse our delicious menu and add items to your cart!</p>
                <Button onClick={() => navigate("/student")}>Browse Meals</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6">
            <h2 className="text-2xl font-black mb-6 text-slate-800">Your Cart</h2>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
                <ul className="divide-y divide-slate-100">
                    {cart.map((item) => (
                        <li key={item.id} className="p-6 flex items-center justify-between">
                            <div className="flex items-center">
                                {item.image && (
                                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl mr-4 border border-slate-200" />
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                                    <p className="text-slate-500 text-sm">৳{item.price} each</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                                    <button
                                        className="p-2.5 hover:bg-slate-200/50 transition-colors text-slate-600"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="px-4 font-bold text-slate-800">{item.quantity}</span>
                                    <button
                                        className="p-2.5 hover:bg-slate-200/50 transition-colors text-slate-600"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <div className="font-extrabold text-lg w-20 text-right text-slate-800">
                                    ৳{item.price * item.quantity}
                                </div>

                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-500 hover:text-red-655 transition-colors p-2 hover:bg-red-50 rounded-xl"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-lg font-bold text-slate-700">Total Amount</div>
                    <div className="text-2xl font-black text-orange-600">৳{cartTotal}</div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="secondary" onClick={() => navigate("/student")}>
                    Continue Shopping
                </Button>
                <Button size="lg" onClick={handleCheckout} disabled={loading}>
                    {loading ? "Processing..." : "Place Order"}
                </Button>
            </div>
        </div>
    );
}
