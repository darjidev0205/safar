'use client';

import React from 'react';
import { StatusBadge } from '../ui/status-badge';
import { ArrowRight, Route, Clock } from 'lucide-react';
import { TripModel } from '@safar/types';
import { StarFlourish } from '../ui/botanical-ornaments';

interface UpcomingTripsTableProps {
  trips: TripModel[];
  onViewAll?: () => void;
  onCreateTrip?: () => void;
}

export function UpcomingTripsTable({
  trips,
  onViewAll,
  onCreateTrip,
}: UpcomingTripsTableProps) {
  return (
    <div className="bg-white/95 rounded-3xl border border-warm-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/60">
        <div>
          <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-charcoal-900">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Upcoming Guest Shuttles</span>
          </div>
          <p className="text-xs text-charcoal-500 font-sans mt-0.5">
            Active dispatch and scheduled venue transfers
          </p>
        </div>
        {trips.length > 0 && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors font-sans"
          >
            View all ({trips.length})
          </button>
        )}
      </div>

      {/* Table Content */}
      {trips.length === 0 ? (
        <div className="p-8 text-center paper-texture">
          <Clock className="w-8 h-8 text-gold-500/70 mx-auto mb-2" />
          <p className="text-xs font-semibold text-charcoal-800 font-sans">No shuttles scheduled</p>
          <p className="text-[11px] text-charcoal-500 mt-0.5 mb-3 font-sans">
            Schedule transport runs between guest hotels, airports, and ceremony lawns.
          </p>
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="text-xs font-semibold text-terracotta-700 hover:underline font-sans"
            >
              + Schedule Shuttle Run
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-warm-200/80 bg-warm-100/40 text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">
                <th className="py-3 px-5">Time</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Chauffeur</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-xs">
              {trips.map((trip) => {
                const formattedTime = new Date(trip.scheduledPickupTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const vehicleText = trip.vehicle ? `${trip.vehicle.category} (${trip.vehicle.model})` : 'Unassigned';
                const driverText = trip.driver?.fullName || 'Pending Assignment';

                return (
                  <tr key={trip.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="py-3 px-5 font-bold text-charcoal-900 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[130px]">{trip.origin?.name || 'Hotel'}</span>
                        <ArrowRight className="w-3 h-3 text-gold-600 shrink-0" />
                        <span className="truncate max-w-[130px]">{trip.destination?.name || 'Banquet Lawn'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap">
                      {vehicleText}
                    </td>
                    <td className="py-3 px-4 font-medium text-charcoal-800 whitespace-nowrap">
                      {driverText}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
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
