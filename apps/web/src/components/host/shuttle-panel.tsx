'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Car, ChevronRight, Plus } from 'lucide-react';
import { TripModel, TripStatus } from '@safar/types';
import { StatusBadge } from '../ui/status-badge';
import { StarFlourish } from '../ui/botanical-ornaments';
import { EmptyState } from './empty-state';

interface ShuttlePanelProps {
  trips: TripModel[];
  onViewAll?: () => void;
  onCreateTrip?: () => void;
  className?: string;
}

export function ShuttlePanel({
  trips,
  onViewAll,
  onCreateTrip,
  className = '',
}: ShuttlePanelProps) {
  return (
    <div
      className={`bg-white rounded-3xl border border-[#E8E2D9] shadow-card overflow-hidden font-sans ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/60">
        <div>
          <div className="flex items-center gap-2 font-serif font-bold text-base text-charcoal-900">
            <StarFlourish className="w-3 h-3 text-gold-600" />
            <span>Upcoming Guest Shuttles</span>
          </div>
          <p className="text-xs text-charcoal-500 font-sans mt-0.5">
            Active dispatch and scheduled venue transfers
          </p>
        </div>

        <div className="flex items-center gap-3">
          {trips.length > 0 && (
            <Link
              href="/host/trips"
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors flex items-center gap-1"
            >
              <span>View all ({trips.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-warm-50 text-xs font-semibold shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>Schedule Shuttle</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {trips.length === 0 ? (
        <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-warm-100/80 border border-warm-300/80 flex items-center justify-center text-charcoal-700 mb-3 shadow-2xs">
            <Clock className="w-6 h-6 text-gold-600" />
          </div>
          <h4 className="text-sm font-serif font-bold text-charcoal-900 tracking-tight">
            No shuttles scheduled
          </h4>
          <p className="mt-1 text-xs text-charcoal-500 max-w-sm font-sans leading-relaxed">
            Schedule transport runs between guest hotels, airports, and ceremony lawns.
          </p>
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="mt-3.5 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 hover:underline font-sans"
            >
              + Schedule First Shuttle Run
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans min-w-[600px]">
            <thead>
              <tr className="border-b border-warm-200/80 bg-warm-100/40 text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Chauffeur</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-xs">
              {trips.map((trip) => {
                const formattedTime = new Date(trip.scheduledPickupTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const vehicleText = trip.vehicle
                  ? `${trip.vehicle.category} (${trip.vehicle.model})`
                  : 'Unassigned';
                const driverText = trip.driver?.fullName || 'Pending Assignment';

                return (
                  <tr key={trip.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-charcoal-900 whitespace-nowrap font-mono text-xs">
                      {formattedTime}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[140px]">
                          {trip.origin?.name || 'Guest Hotel'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gold-600 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {(typeof trip.destination === 'string' ? trip.destination : (trip as any).destination?.name || trip.destinationLocation?.name) || 'Ceremony Lawn'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600 whitespace-nowrap">
                      {vehicleText}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-800 whitespace-nowrap">
                      {driverText}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <StatusBadge status={trip.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Keep backwards-compatibility alias
export const UpcomingTripsTable = ShuttlePanel;
