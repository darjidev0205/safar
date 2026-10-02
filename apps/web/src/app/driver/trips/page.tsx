'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Route, Clock, Users, MapPin, ArrowRight, CheckCircle2, Navigation } from 'lucide-react';
import { TripStatus } from '@safar/types';
import { StatusBadge } from '../../../components/ui/status-badge';

export default function DriverTripsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all');

  const allTrips = [
    {
      id: 'tr_101',
      pickupTime: 'Today &bull; 10:30 AM',
      pickup: 'The Grand Hotel (Lobby Gate 2)',
      destination: 'The Celebration Venue (North Lawn)',
      passengers: '4 Passengers (Patel Family)',
      status: TripStatus.ASSIGNED,
      distance: '1.8 km',
      duration: '6 mins',
      notes: 'Guest has 2 elders requiring assisted boarding.',
    },
    {
      id: 'tr_102',
      pickupTime: 'Today &bull; 01:15 PM',
      pickup: 'The Celebration Venue (Valet Porch)',
      destination: 'The Grand Hotel (Main Entrance)',
      passengers: '6 Passengers (Bride Relatives)',
      status: TripStatus.SCHEDULED,
      distance: '1.8 km',
      duration: '7 mins',
      notes: 'Luggage bags: 4 medium trolley cases.',
    },
    {
      id: 'tr_103',
      pickupTime: 'Today &bull; 04:00 PM',
      pickup: 'The Grand Hotel (Concierge Desk)',
      destination: 'Ahmedabad International Airport (Terminal 2)',
      passengers: '3 Passengers (VIP Corporate Delegates)',
      status: TripStatus.SCHEDULED,
      distance: '14.2 km',
      duration: '25 mins',
      notes: 'Flight departure 06:45 PM. Priority transit requested.',
    },
    {
      id: 'tr_100',
      pickupTime: 'Today &bull; 08:00 AM',
      pickup: 'Ahmedabad Airport (Terminal 1)',
      destination: 'The Grand Hotel',
      passengers: '5 Passengers (Sharma Family)',
      status: TripStatus.COMPLETED,
      distance: '14.5 km',
      duration: '28 mins',
      notes: 'Flight 6E-204 arrived on time. Completed.',
    },
  ];

  const filteredTrips = allTrips.filter((t) => {
    if (filter === 'active') return t.status === TripStatus.ASSIGNED || t.status === TripStatus.EN_ROUTE_TO_PICKUP || t.status === TripStatus.IN_TRANSIT;
    if (filter === 'scheduled') return t.status === TripStatus.SCHEDULED;
    if (filter === 'completed') return t.status === TripStatus.COMPLETED;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
            Assigned Trips Roster
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            You only see authorized trips assigned to your account and vehicle.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="p-1 rounded-2xl bg-white border border-charcoal-200/90 shadow-xs flex items-center gap-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Trips' },
            { id: 'active', label: 'Active' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === tab.id
                  ? 'bg-charcoal-900 text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Cards List */}
      <div className="space-y-4">
        {filteredTrips.map((trip) => (
          <div
            key={trip.id}
            className="p-6 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-4 hover:border-safar-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={trip.status} size="sm" />
                <span
                  dangerouslySetInnerHTML={{ __html: trip.pickupTime }}
                  className="text-xs font-semibold text-charcoal-500"
                />
              </div>
              <span className="text-xs font-mono font-bold text-charcoal-400">
                {trip.id}
              </span>
            </div>

            {/* Route Timeline */}
            <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-charcoal-900 ring-4 ring-white" />
                <div className="text-xs font-bold text-charcoal-900">{trip.pickup}</div>
              </div>
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-safar-600 ring-4 ring-white" />
                <div className="text-xs font-bold text-charcoal-900">{trip.destination}</div>
              </div>
            </div>

            {/* Manifest & Distance */}
            <div className="pt-2 border-t border-charcoal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-charcoal-700 font-medium">
                  <Users className="w-3.5 h-3.5 text-safar-600" />
                  <span>{trip.passengers}</span>
                </div>
                {trip.notes && (
                  <p className="text-[11px] text-charcoal-400 italic">
                    Note: {trip.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-charcoal-500">
                  {trip.distance} &bull; {trip.duration}
                </span>
                {trip.status !== TripStatus.COMPLETED ? (
                  <Link
                    href="/driver"
                    className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Open Console
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-charcoal-100 text-charcoal-600 text-xs font-semibold">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
