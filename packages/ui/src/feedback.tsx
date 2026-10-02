import React from 'react';
import { cn } from './utils';
import { LucideIcon, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const norm = status.toUpperCase().replace(/\s+/g, '_');

  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    // Trip Status
    SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    DRIVER_ACCEPTED: { label: 'Driver Accepted', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    EN_ROUTE_TO_PICKUP: { label: 'En Route', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    EN_ROUTE: { label: 'En Route', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    ARRIVED: { label: 'Arrived', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    BOARDING: { label: 'Boarding', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    IN_TRANSIT: { label: 'In Transit', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    COMPLETED: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    NO_SHOW: { label: 'No Show', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    FAILED: { label: 'Failed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

    // Duty Status
    ON_DUTY: { label: 'On Duty', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    OFF_DUTY: { label: 'Off Duty', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    AVAILABLE: { label: 'Available', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    ON_TRIP: { label: 'On Trip', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    BREAK: { label: 'Break', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },

    // Booking Status
    PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    BOARDED: { label: 'Boarded', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    UPCOMING: { label: 'Upcoming', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    ON_TIME: { label: 'On Time', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  };

  const c = configs[norm] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-wide uppercase rounded-full border whitespace-nowrap',
        c.bg,
        c.text,
        c.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', c.text.replace('text-', 'bg-'))} />
      {c.label}
    </span>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'p-8 sm:p-12 text-center rounded-2xl bg-white border border-dashed border-gray-300 space-y-4 max-w-lg mx-auto',
        className
      )}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="p-12 text-center space-y-3">
      <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-medium text-gray-500">{message}</p>
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-8 text-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3 max-w-md mx-auto">
      <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
      <p className="text-xs font-semibold">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="bg-teal-600 h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  };
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn('rounded-full object-cover border border-gray-200', sizes[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-teal-700 text-white font-bold flex items-center justify-center border border-teal-800/10 shadow-xs',
        sizes[size]
      )}
    >
      {initials}
    </div>
  );
}
