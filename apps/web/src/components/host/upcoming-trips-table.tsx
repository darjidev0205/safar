'use client';

import React from 'react';
import { StatusBadge } from '../ui/status-badge';
import { ArrowRight, Route, Clock } from 'lucide-react';
import { TripModel } from '@safar/types';

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
    <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-charcoal-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-charcoal-900">Upcoming Trips</h3>
          <p className="text-xs text-charcoal-500">Live dispatch and scheduled shuttles</p>
        </div>
        {trips.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-safar-700 hover:text-safar-800 transition-colors"
          >
            View all
          </button>
        )}
      </div>

      {/* Table Content */}
      {trips.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-charcoal-700">No trips scheduled</p>
          <p className="text-[11px] text-charcoal-400 mt-0.5 mb-3">
            Schedule transport runs between hotels and venues.
          </p>
          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="text-xs font-semibold text-safar-700 hover:underline"
            >
              + Create Trip
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-charcoal-100 bg-charcoal-50/50 text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100 text-xs">
              {trips.map((trip) => {
                const formattedTime = new Date(trip.scheduledPickupTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const routeText = `${trip.origin?.name || 'Hotel'} → ${trip.destination?.name || 'Venue'}`;
                const vehicleText = trip.vehicle ? `${trip.vehicle.category} (${trip.vehicle.model})` : 'Unassigned';
                const driverText = trip.driver?.fullName || 'Pending Assign';

                return (
                  <tr key={trip.id} className="hover:bg-charcoal-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-charcoal-900 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-charcoal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{trip.origin?.name || 'Hotel'}</span>
                        <ArrowRight className="w-3 h-3 text-charcoal-400" />
                        <span>{trip.destination?.name || 'Venue'}</span>
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
