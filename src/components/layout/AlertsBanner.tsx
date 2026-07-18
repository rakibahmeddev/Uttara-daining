import { X, Pin, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { cn } from '../../utils/cn';

const typeStyles = {
  light: {
    info: {
      icon: Info,
      border: 'border-sky-200',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      iconBg: 'bg-sky-100',
      title: 'text-sky-900',
      desc: 'text-slate-700',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      iconBg: 'bg-amber-100',
      title: 'text-amber-900',
      desc: 'text-slate-700',
    },
    success: {
      icon: CheckCircle,
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      iconBg: 'bg-emerald-100',
      title: 'text-emerald-900',
      desc: 'text-slate-700',
    },
    urgent: {
      icon: AlertTriangle,
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      iconBg: 'bg-red-100',
      title: 'text-red-900',
      desc: 'text-slate-700',
    },
  },
  dark: {
    info: {
      icon: Info,
      border: 'border-sky-500/30',
      bg: 'bg-sky-500/10',
      text: 'text-sky-300',
      iconBg: 'bg-black/20',
      title: 'text-sky-300',
      desc: 'text-slate-300',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      iconBg: 'bg-black/20',
      title: 'text-amber-300',
      desc: 'text-slate-300',
    },
    success: {
      icon: CheckCircle,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      iconBg: 'bg-black/20',
      title: 'text-emerald-300',
      desc: 'text-slate-300',
    },
    urgent: {
      icon: AlertTriangle,
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      text: 'text-red-300',
      iconBg: 'bg-black/20',
      title: 'text-red-300',
      desc: 'text-slate-300',
    },
  },
};

export default function AlertsBanner({
  theme = 'light',
}: {
  theme?: 'light' | 'dark';
}) {
  const { notifications, permanentNotice, dismissNotification } =
    useNotifications();

  const hasNotice =
    permanentNotice?.active !== false && permanentNotice?.message;
  const hasNotifications = notifications.length > 0;

  if (!hasNotice && !hasNotifications) return null;

  const styles = typeStyles[theme];
  const isLight = theme === 'light';

  return (
    <div
      className="mb-6 space-y-3 w-full max-w-full"
      style={{ display: 'block', padding: '0 16px', marginTop: '24px' }}
    >
      <div>
        {hasNotice && (
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border p-4 shadow-sm',
              isLight
                ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-amber-500/10'
                : 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 shadow-amber-500/5',
            )}
            style={{ padding: '20px' }}
          >
            <div
              className={cn(
                'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl',
                isLight ? 'bg-amber-300/30' : 'bg-amber-500/10',
              )}
            />
            <div className="relative flex items-start gap-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  isLight
                    ? 'bg-amber-200 text-amber-700'
                    : 'bg-amber-500/20 text-amber-400',
                )}
              >
                <Pin size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    isLight ? 'text-amber-800' : 'text-amber-400',
                  )}
                >
                  Important Notice
                </p>
                <p
                  className={cn(
                    'mt-1 text-sm font-medium leading-relaxed',
                    isLight ? 'text-amber-950' : 'text-amber-50',
                  )}
                >
                  {permanentNotice!.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {notifications.slice(0, 3).map((n) => {
          const style =
            styles[(n.type as keyof typeof styles) || 'info'] || styles.info;
          const Icon = style.icon;
          return (
            <div
              key={n.id}
              className={cn(
                'relative flex items-start gap-3 rounded-2xl border p-4',
                isLight ? 'shadow-sm' : 'backdrop-blur-sm',
                style.border,
                style.bg,
              )}
              style={{ padding: '20px' }}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  style.iconBg,
                  style.text,
                )}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-bold', style.title)}>
                    {n.title}
                  </p>
                  <button
                    onClick={() => dismissNotification(n.id)}
                    className={cn(
                      'shrink-0 rounded-lg p-1 transition-colors',
                      isLight
                        ? 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                        : 'text-slate-500 hover:bg-white/10 hover:text-white',
                    )}
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className={cn('mt-0.5 text-sm', style.desc)}>{n.message}</p>
                {n.createdByName && (
                  <p
                    className={cn(
                      'mt-1.5 flex items-center gap-1 text-[11px]',
                      isLight ? 'text-slate-500' : 'text-slate-400',
                    )}
                  >
                    <Bell size={10} /> From {n.createdByName}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
