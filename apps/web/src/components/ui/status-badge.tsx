import React from 'react';
import { TripStatus, DutyStatus } from '@safar/types';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  let style = 'bg-warm-50 text-charcoal-700 border-warm-200';
  let dotColor = 'bg-charcoal-400';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case TripStatus.IN_TRANSIT:
    case 'ON_TRIP':
      style = 'bg-terracotta-50 text-terracotta-800 border-terracotta-200/80';
      dotColor = 'bg-terracotta-600 animate-pulse';
      label = 'In Transit';
      break;
    case TripStatus.EN_ROUTE_TO_PICKUP:
      style = 'bg-terracotta-50 text-terracotta-800 border-terracotta-200/80';
      dotColor = 'bg-terracotta-600 animate-pulse';
      label = 'En Route';
      break;
    case TripStatus.ARRIVED:
      style = 'bg-amber-50 text-gold-700 border-gold-300/80';
      dotColor = 'bg-gold-500';
      label = 'Arrived';
      break;
    case TripStatus.BOARDING:
      style = 'bg-amber-50 text-gold-700 border-gold-300/80';
      dotColor = 'bg-gold-500 animate-pulse';
      label = 'Boarding';
      break;
    case TripStatus.ASSIGNED:
      style = 'bg-sage-50 text-sage-800 border-sage-200/80';
      dotColor = 'bg-sage-600';
      label = 'Assigned';
      break;
    case TripStatus.SCHEDULED:
      style = 'bg-warm-100 text-charcoal-800 border-warm-300/80';
      dotColor = 'bg-gold-600';
      label = 'Scheduled';
      break;
    case TripStatus.COMPLETED:
      style = 'bg-warm-100 text-charcoal-800 border-warm-200';
      dotColor = 'bg-charcoal-700';
      label = 'Completed';
      break;
    case TripStatus.CANCELLED:
    case TripStatus.FAILED:
      style = 'bg-burgundy-50 text-burgundy-800 border-burgundy-200/80';
      dotColor = 'bg-burgundy-600';
      label = status;
      break;
    case DutyStatus.ON_DUTY:
      style = 'bg-safar-50 text-safar-800 border-safar-200/80';
      dotColor = 'bg-safar-600';
      label = 'On Duty';
      break;
    case DutyStatus.AVAILABLE:
      style = 'bg-sage-50 text-sage-800 border-sage-200/80';
      dotColor = 'bg-sage-600';
      label = 'Available';
      break;
    case DutyStatus.OFF_DUTY:
      style = 'bg-warm-50 text-charcoal-500 border-warm-200';
      dotColor = 'bg-charcoal-400';
      label = 'Off Duty';
      break;
    case DutyStatus.BREAK:
      style = 'bg-amber-50 text-gold-700 border-gold-200';
      dotColor = 'bg-gold-500';
      label = 'On Break';
      break;
  }

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${style} ${sizeClasses} select-none font-sans`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
}
