// Using Intl for Bangladesh Time (Asia/Dhaka)

// Fallback if date-fns-tz is not installed, or just use Intl
export const formatDateBD = (date: any, formatStr = 'PP pp'): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);

    // Using Intl for reliable timezone handling without extra deps if possible, 
    // but user might want specific format. 
    // Let's try to use standard formatting with 'Asia/Dhaka'

    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
    }).format(d);
};

export const formatTimeBD = (date: any): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        timeStyle: 'short',
        hour12: true
    }).format(d);
};
export const formatDateShortBD = (date: any): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : (date.seconds ? new Date(date.seconds * 1000) : new Date(date));
    
    const datePart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        month: 'short',
        day: 'numeric'
    }).format(d);
    
    const timePart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        timeStyle: 'short',
        hour12: true
    }).format(d);
    
    return `${datePart}, ${timePart}`;
};

export const formatDateOnlyBD = (date: any): string => {
    if (!date) return 'N/A';
    // For "YYYY-MM-DD" strings, we want to extract just the date safely without timezone shifting issues
    if (typeof date === 'string' && date.length === 10) {
        const parts = date.split('-');
        if (parts.length === 3) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
        }
    }
    
    const d = date.toDate ? date.toDate() : (date.seconds ? new Date(date.seconds * 1000) : new Date(date));
    
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        month: 'short',
        day: 'numeric'
    }).format(d);
};
