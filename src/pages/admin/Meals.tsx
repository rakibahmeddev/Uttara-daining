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
    const [timeSlot, setTimeSlot] = useState("morning");
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
        setTimeSlot("morning");
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
                <Button onClick={() => handleOpenModal()} className="w-fit shadow-md">
                    <Plus size={20} className="mr-2" />
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
                                    <td className="whitespace-nowrap text-right text-sm font-semibold space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenModal(meal)}
                                            className="inline-flex items-center border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        >
                                            <Edit2 size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDelete(meal.id)}
                                            className="inline-flex items-center border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                                        >
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
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
                <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Price (৳)</label>
                        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity Available</label>
                        <Input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Number of meals available"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Time Slot</label>
                        <select
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/60 transition-all duration-200"
                            value={timeSlot}
                            onChange={(e) => setTimeSlot(e.target.value)}
                        >
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                            <option value="dinner">Dinner</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Price (৳)</label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <Input
                                type="date"
                                value={mealDate}
                                onChange={(e) => setMealDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Ordering Start Time</label>
                            <Input
                                type="time"
                                value={orderingStartTime}
                                onChange={(e) => setOrderingStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ordering End Time</label>
                            <Input
                                type="time"
                                value={orderingEndTime}
                                onChange={(e) => setOrderingEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Image (Optional)</label>

                        <div className="flex flex-col gap-3">
                            {/* Preview Area */}
                            {(imageFile || selectedLibraryImage || manualImageUrl) && (
                                <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : (selectedLibraryImage || manualImageUrl)}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null);
                                            setSelectedLibraryImage(null);
                                            setManualImageUrl("");
                                        }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {/* Upload Button */}
                                <label className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 flex-1 justify-center transition-all">
                                    <Upload size={20} className="text-slate-500" />
                                    <span className="text-sm text-slate-500">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            setImageFile(e.target.files[0]);
                                            setSelectedLibraryImage(null);
                                            setManualImageUrl("");
                                        }}
                                        className="hidden"
                                    />
                                </label>

                                {/* Library Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsLibraryOpen(true)}
                                    className="flex-1"
                                >
                                    <ImageIcon size={20} className="mr-2" />
                                    Library
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500">Or paste URL</span>
                                </div>
                            </div>

                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={manualImageUrl}
                                onChange={(e) => {
                                    setManualImageUrl(e.target.value);
                                    setImageFile(null);
                                    setSelectedLibraryImage(null);
                                }}
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
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
