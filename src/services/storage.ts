import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { storage } from "./firebase";

export const uploadImage = async (file, folder = "meals") => {
    if (!file) return null;
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const getImages = async (folder = "meals") => {
    const listRef = ref(storage, folder);
    const res = await listAll(listRef);
    return await Promise.all(
        res.items.map((itemRef) => getDownloadURL(itemRef))
    );
};
