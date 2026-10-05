'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Users, Edit3, Trash2 } from 'lucide-react';

export interface FunctionCardData {
  id: string;
  name: string;
  eventType?: string;
  venueName?: string | null;
  city?: string | null;
  startDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  guestCount?: number;
  tripsCount?: number;
  transportRequirements?: {
    numberOfVehicles?: number;
    vehicleType?: string;
    pickupRequired?: boolean;
    dropRequired?: boolean;
  } | null;
}

interface FunctionCardProps {
  event: FunctionCardData;
  onEdit?: (event: FunctionCardData) => void;
  onDelete?: (event: FunctionCardData) => void;
  className?: string;
}

export function FunctionCard({
  event,
  onEdit,
  onDelete,
  className = '',
}: FunctionCardProps) {
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const formattedTime =
    event.startTime && event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime || 'Scheduled';

  const tr = event.transportRequirements;
  const fleetText = tr?.numberOfVehicles
    ? `${tr.numberOfVehicles} ${tr.vehicleType || 'Vehicles'}`
    : 'Transport Ready';

  const guestCount = event.guestCount ?? 0;
  const eventType = event.eventType ? event.eventType.toUpperCase() : 'CUSTOM';

  return (
    <div
      className={`p-5 rounded-3xl bg-white border border-[#E8E2D9] shadow-card hover:shadow-md hover:border-gold-400/50 transition-all duration-200 flex flex-col justify-between h-full select-none font-sans ${className}`}
    >
      {/* Top Section */}
      <div className="space-y-3">
        {/* Header: Title and Type Badge (NO access codes on functions) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide bg-warm-100 text-charcoal-700 border border-warm-300/80">
              {eventType}
            </span>
          </div>
          <h3 className="text-base font-serif font-bold text-charcoal-900 tracking-tight leading-snug line-clamp-1">
            {event.name}
          </h3>
        </div>

        {/* Location */}
        <div>
          <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block font-sans">
            Location
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal-700 font-sans">
            <MapPin className="w-3.5 h-3.5 text-gold-600 shrink-0" />
            <span className="truncate font-medium">
              {event.venueName || event.city || 'Grand Banquet Venue'}
            </span>
          </div>
        </div>

        {/* Details Grid: Date & Time | Guests & Fleet */}
        <div className="p-3 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] grid grid-cols-2 gap-2.5 text-xs font-sans">
          <div>
            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
              Date & Time
            </span>
            <span className="font-semibold text-charcoal-900 block mt-0.5 truncate">
              {formattedDate}
            </span>
            <span className="text-[11px] text-charcoal-500 block truncate font-mono">
              {formattedTime}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
              Guests & Fleet
            </span>
            <span className="font-semibold text-charcoal-900 block mt-0.5 truncate">
              {guestCount} Guests
            </span>
            <span className="text-[11px] text-terracotta-700 font-semibold block truncate">
              {fleetText}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3.5 border-t border-warm-100 flex items-center justify-between font-sans">
        <Link
          href={`/host/guests?eventId=${event.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta-700 hover:text-terracotta-800 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Guests ({guestCount})</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-warm-100/80 transition-colors"
              title="Edit Ceremony Details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(event)}
              className="p-1.5 rounded-full text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Function"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            href={`/host/events?eventId=${event.id}`}
            className="px-3.5 py-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 text-xs font-semibold shadow-2xs transition-all transform hover:-translate-y-0.5 active:scale-95 ml-0.5"
          >
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
