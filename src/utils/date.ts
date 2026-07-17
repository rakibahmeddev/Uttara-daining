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
