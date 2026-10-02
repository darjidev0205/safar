import React from 'react';
import { TripStatus, DutyStatus } from '@safar/types';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  let style = 'bg-gray-100 text-gray-700 border-gray-200';
  let dotColor = 'bg-gray-400';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case TripStatus.IN_TRANSIT:
    case 'ON_TRIP':
      style = 'bg-teal-50 text-teal-800 border-teal-200';
      dotColor = 'bg-teal-500 animate-pulse';
      label = 'In Transit';
      break;
    case TripStatus.EN_ROUTE_TO_PICKUP:
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500 animate-pulse';
      label = 'En Route';
      break;
    case TripStatus.ARRIVED:
      style = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      dotColor = 'bg-cyan-500';
      label = 'Arrived';
      break;
    case TripStatus.BOARDING:
      style = 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-500';
      label = 'Boarding';
      break;
    case TripStatus.ASSIGNED:
      style = 'bg-blue-50 text-blue-800 border-blue-200';
      dotColor = 'bg-blue-500';
      label = 'Assigned';
      break;
    case TripStatus.SCHEDULED:
      style = 'bg-purple-50 text-purple-800 border-purple-200';
      dotColor = 'bg-purple-500';
      label = 'Scheduled';
      break;
    case TripStatus.COMPLETED:
      style = 'bg-gray-100 text-gray-800 border-gray-200';
      dotColor = 'bg-gray-500';
      label = 'Completed';
      break;
    case TripStatus.CANCELLED:
    case TripStatus.FAILED:
      style = 'bg-rose-50 text-rose-800 border-rose-200';
      dotColor = 'bg-rose-500';
      label = status;
      break;
    case DutyStatus.ON_DUTY:
      style = 'bg-teal-50 text-teal-800 border-teal-200';
      dotColor = 'bg-teal-500';
      label = 'On Duty';
      break;
    case DutyStatus.OFF_DUTY:
      style = 'bg-gray-100 text-gray-600 border-gray-200';
      dotColor = 'bg-gray-400';
      label = 'Off Duty';
      break;
    case 'ON_TIME':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500';
      label = 'On Time';
      break;
  }

  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full capitalize ${padding} ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
