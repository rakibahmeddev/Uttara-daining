import { useState, useEffect } from "react";
import { getImages } from "../../services/storage";
import { Check } from "lucide-react";

export default function MediaLibrary({ onSelect }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUrl, setSelectedUrl] = useState(null);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        try {
            const urls = await getImages();
            setImages(urls);
        } catch (error) {
            console.error("Error loading images:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (url) => {
        setSelectedUrl(url);
        onSelect(url);
    };

    if (loading) return <div className="p-4 text-center">Loading library...</div>;

    return (
        <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
            {images.length === 0 ? (
                <div className="col-span-3 text-center text-gray-500">No images found in library.</div>
            ) : (
                images.map((url, index) => (
                    <div
                        key={index}
                        className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 ${selectedUrl === url ? 'border-blue-500' : 'border-transparent'}`}
                        onClick={() => handleSelect(url)}
                    >
                        <img src={url} alt={`Stored ${index}`} className="w-full h-24 object-cover" />
                        {selectedUrl === url && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <div className="bg-blue-500 text-white rounded-full p-1">
                                    <Check size={16} />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
