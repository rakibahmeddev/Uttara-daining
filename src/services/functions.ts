import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const promoteUserToAdmin = async (targetUid) => {
    const promote = httpsCallable(functions, 'promoteUserToAdmin');
    return await promote({ targetUid });
};
