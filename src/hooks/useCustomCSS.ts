import { useEffect, useState } from "react";
import { getCustomCSS } from "../services/db";

const STYLE_TAG_ID = "admin-custom-css";

/** Fetches saved custom CSS from Firestore and injects it into <head>.
 *  Call this once at the app root level (e.g. inside AdminLayout or App). */
export function useCustomCSS() {
    const [css, setCss] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCustomCSS()
            .then((savedCss) => {
                setCss(savedCss);
                injectCSS(savedCss);
            })
            .catch((err) => {
                if (err?.code === 'permission-denied') {
                    console.warn("⚠️ Firebase Permission Denied: You need to add Firestore rules for the 'settings' collection to enable Custom CSS.");
                } else {
                    console.error("Failed to load custom CSS:", err);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    return { css, setCss: (newCss: string) => { setCss(newCss); injectCSS(newCss); }, loading };
}

/** Injects or updates the custom CSS <style> tag in document <head>. */
export function injectCSS(css: string) {
    let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
        tag = document.createElement("style");
        tag.id = STYLE_TAG_ID;
        document.head.appendChild(tag);
    }
    tag.textContent = css;
}
