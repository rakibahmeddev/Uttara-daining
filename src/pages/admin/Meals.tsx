import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Edit2, Upload, Image as ImageIcon, Utensils } from "lucide-react";
import { getMeals, addMeal, deleteMeal, updateMeal } from "../../services/db";
import { uploadImage } from "../../services/storage";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Select, FormField } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import MediaLibrary from "../../components/ui/MediaLibrary";
import { DashboardPage, DashboardTableCard } from "../../components/layout/DashboardLayout";
import TableSearchBar, { filterBySearch } from "../../components/ui/TableSearchBar";
import { formatDateBD } from "../../utils/date";

export default function Meals() {
    const [meals, setMeals] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);

    // Form State
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [timeSlot, setTimeSlot] = useState("breakfast");
    const [mealDate, setMealDate] = useState(""); // New Date State
    const [orderingStartTime, setOrderingStartTime] = useState("");
    const [orderingEndTime, setOrderingEndTime] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [selectedLibraryImage, setSelectedLibraryImage] = useState(null);
    const [manualImageUrl, setManualImageUrl] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchMeals();
    }, []);

    const fetchMeals = async () => {
        const data = await getMeals();
        setMeals(data);
    };

    const resetForm = () => {
        setName("");
        setPrice("");
        setDescription("");
        setQuantity("");
        setTimeSlot("breakfast");
        setMealDate(""); // Reset Date
        setOrderingStartTime("");
        setOrderingEndTime("");
        setImageFile(null);
        setSelectedLibraryImage(null);
        setManualImageUrl("");
        setEditingMeal(null);
    };

    const handleOpenModal = (meal = null) => {
        if (meal) {
            setEditingMeal(meal);
            setName(meal.name);
            setPrice(meal.price);
            setDescription(meal.description);
            setQuantity(meal.quantity || "");
            setTimeSlot(meal.timeSlot);
            setMealDate(meal.date || ""); // Set Date
            setOrderingStartTime(meal.orderingStartTime || "");
            setOrderingEndTime(meal.orderingEndTime || "");
            setSelectedLibraryImage(meal.image); // Pre-fill with existing image
            setManualImageUrl(meal.image); // Also set manual URL for editing visibility
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = manualImageUrl || selectedLibraryImage || "";

            // If a new file is uploaded, it takes precedence
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const mealData = {
                name,
                price: parseFloat(price),
                description,
                quantity: parseInt(quantity) || 0,
                timeSlot,
                date: mealDate, // Save Date
                orderingStartTime,
                orderingEndTime,
                image: imageUrl,
                available: true,
            };

            if (editingMeal) {
                await updateMeal(editingMeal.id, mealData);
                alert("Meal updated successfully!");
            } else {
                await addMeal(mealData);
                alert("Meal added successfully!");
            }

            await fetchMeals();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error saving meal:", error);
            alert("Failed to save meal");
        } finally {
            setLoading(false);
        }
    };

    const handleAvailabilityToggle = async (meal, newStatus) => {
        const isAvailable = newStatus === 'available';
        try {
            await updateMeal(meal.id, { available: isAvailable });
            fetchMeals(); // Refresh list
        } catch (error) {
            console.error("Error updating availability:", error);
            alert("Failed to update status");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this meal?")) {
            await deleteMeal(id);
            fetchMeals();
        }
    };

    const handleLibrarySelect = (url) => {
        setSelectedLibraryImage(url);
        setManualImageUrl(url); // Also update manual URL input
        setImageFile(null);
        setIsLibraryOpen(false);
    };

    const filteredMeals = useMemo(
        () =>
            filterBySearch(meals, searchQuery, (m) =>
                [m.name, m.description, m.timeSlot, String(m.price), String(m.mealNumber)].filter(Boolean).join(" ")
            ),
        [meals, searchQuery]
    );

    return (
        <DashboardPage
            title="Manage Meals"
            subtitle="Add, edit, and control meal availability"
            action={
                <Button onClick={() => handleOpenModal()} className="w-fit shadow-md" style={{ padding: '8px 16px', borderRadius: '8px' }}>
                    <Plus size={20} className="mr-2 inline" />
                    Add New Meal
                </Button>
            }
        >
            <DashboardTableCard
            
               
            >
                <table className="admin-table admin-table-dark">
                        <thead>
                            <tr>
                                <th>Meal #</th>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Date Added</th>
                                <th>Available</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMeals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                                        {searchQuery ? "No meals match your search" : "No meals yet"}
                                    </td>
                                </tr>
                            ) : filteredMeals.map((meal, idx) => (
                                <tr key={meal.id}>
                                    <td className="whitespace-nowrap text-sm font-bold font-mono text-violet-400">
                                        #{idx + 1}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <div className="flex items-center">
                                            {meal.image && (
                                                <img
                                                    src={meal.image}
                                                    alt={meal.name}
                                                    className="w-10 h-10 rounded-xl object-cover mr-3 border border-slate-200 shadow-sm"
                                                />
                                            )}
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{meal.name}</div>
                                                <div className="max-w-[200px] truncate text-xs text-slate-500">{meal.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap text-sm font-extrabold text-slate-800">
                                        ৳{meal.price}
                                    </td>
                                    <td className="whitespace-nowrap text-sm text-slate-500">
                                        {formatDateBD(meal.createdAt)}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                            meal.available
                                            ? 'border-emerald-500/30 bg-emerald-50 text-emerald-600'
                                            : 'border-red-500/30 bg-red-50 text-red-500'
                                            }`}>
                                            {meal.available ? 'Available' : 'Unavailable'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap text-right text-sm font-semibold">
                                        <div className="flex items-center justify-end gap-[2px]">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenModal(meal)}
                                            className="inline-flex items-center border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                            style={{ padding: "2px 5px", fontSize: "12px" }}
                                        >
                                            <Edit2 size={12} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDelete(meal.id)}
                                            className="inline-flex items-center border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                                            style={{ padding: "2px 5px", fontSize: "12px" }}
                                        >
                                            <Trash2 size={12} className="mr-1" />
                                            Delete
                                        </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
            </DashboardTableCard>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={editingMeal ? "Edit Meal" : "Add New Meal"}
            >
                <form onSubmit={handleSubmit} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "2px" }}>

                    {/* Name */}
                    <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Biryani" required />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        {/* Price */}
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Price (৳)</label>
                            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 60" required />
                        </div>

                        {/* Quantity */}
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Quantity Available</label>
                            <Input
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="E.g., 50"
                                required
                            />
                        </div>

                        {/* Time Slot */}
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Time Slot</label>
                            <select
                                style={{ width: "100%", background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: "12px", padding: "10px 14px", fontSize: "14px", outline: "none" }}
                                value={timeSlot}
                                onChange={(e) => setTimeSlot(e.target.value)}
                            >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Date</label>
                            <Input 
                                type="date" 
                                value={mealDate} 
                                onChange={(e) => setMealDate(e.target.value)} 
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                required 
                            />
                        </div>
                    </div>

                    {/* Order Time Helper */}
                    {mealDate && (() => {
                        const d = new Date(mealDate);
                        if (!isNaN(d.getTime())) {
                            d.setDate(d.getDate() - 1);
                            const day = d.getDate().toString().padStart(2, '0');
                            const month = (d.getMonth() + 1).toString().padStart(2, '0');
                            const year = d.getFullYear();
                            return (
                                <div style={{ background: 'rgba(249,115,22,0.15)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(249,115,22,0.3)' }}>
                                    <p style={{ fontSize: '13px', color: '#fcd34d', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        Students can order this meal on <b>{day}/{month}/{year}</b> (8:00 PM - 11:00 PM)
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    {/* Description */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.85)" }}>Description</label>
                        <textarea
                            style={{ width: "100%", padding: "10px 14px", background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: "12px", fontSize: "14px", outline: "none", resize: "vertical" }}
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's included in this meal?..."
                        />
                    </div>

                    <Button type="submit" className="w-full" style={{ padding: "14px 0", fontSize: "15px", fontWeight: 700 }} disabled={loading}>
                        {loading ? "Saving..." : "Save Meal"}
                    </Button>
                </form>
            </Modal>

            {/* Media Library Modal */}
            <Modal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                title="Select Image from Library"
            >
                <MediaLibrary onSelect={handleLibrarySelect} />
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setIsLibraryOpen(false)}>
                        Cancel
                    </Button>
                </div>
            </Modal>
        </DashboardPage>
    );
}
