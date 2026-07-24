import { DoorOpen } from "lucide-react";
import { getAvatarLetter, getDisplayName, nameToGradient } from "../../utils/userMapping";

export function Avatar({ name, email, size = 9 }: { name?: string; email?: string; size?: number }) {
    const displayName = getDisplayName(name, email);
    const letter = getAvatarLetter(name, email);
    const px = size * 4;

    return (
        <div
            className="rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{
                width: px,
                height: px,
                minWidth: px,
                background: nameToGradient(displayName),
            }}
        >
            {letter}
        </div>
    );
}

export function CustomerName({ name, email, userNumericId }: {
    name?: string;
    email?: string;
    userNumericId?: number | null;
}) {
    const displayName = getDisplayName(name, email);

    return (
        <span className="text-sm font-semibold text-slate-800">
            {displayName}
        </span>
    );
}

export function CustomerCell({ name, email, userNumericId, roomNumber }: {
    name?: string;
    email?: string;
    userNumericId?: number | null;
    roomNumber?: string;
}) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex flex-col">
                <CustomerName name={name} email={email} userNumericId={userNumericId} />
                <div className="flex items-center gap-1.5 mt-0.5">
                    {userNumericId != null && (
                        <span className="font-semibold text-[#6366f1] bg-[#eef2ff] rounded" style={{ fontSize: '10px', padding: '2px 6px' }}>#{userNumericId}</span>
                    )}
                    {roomNumber && (
                        <span className="font-bold text-slate-600 bg-slate-100 rounded" style={{ fontSize: '10px', padding: '2px 6px' }}>Rm {roomNumber}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function RoomNoCell({ roomNumber }: { roomNumber?: string }) {
    if (!roomNumber?.trim()) {
        return <span className="text-xs text-slate-300 italic">—</span>;
    }

    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
            <DoorOpen size={13} className="text-slate-400 shrink-0" />
            {roomNumber}
        </span>
    );
}
