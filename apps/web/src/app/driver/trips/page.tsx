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
      pickupCity: 'SG Highway, Ahmedabad',
      destination: 'The Celebration Venue (North Lawn)',
      destinationCity: 'Sindhu Bhavan Road, Ahmedabad',
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
      pickupCity: 'Sindhu Bhavan Road, Ahmedabad',
      destination: 'The Grand Hotel (Main Entrance)',
      destinationCity: 'SG Highway, Ahmedabad',
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
      pickupCity: 'SG Highway, Ahmedabad',
      destination: 'Ahmedabad International Airport (Terminal 2)',
      destinationCity: 'Hansol, Ahmedabad',
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
      pickupCity: 'Hansol, Ahmedabad',
      destination: 'The Grand Hotel',
      destinationCity: 'SG Highway, Ahmedabad',
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
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700 block">
            Fleet Schedule
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 font-serif">
            Assigned Trips Roster
          </h1>
          <p className="text-xs text-charcoal-500">
            Authorized assignments dispatched to your vehicle and driver account.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="p-1 rounded-full bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-1 text-xs font-semibold self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Trips' },
            { id: 'active', label: 'Active' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full transition-all text-xs active:scale-[0.98] ${
                filter === tab.id
                  ? 'bg-charcoal-900 text-white shadow-xs font-bold'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-50'
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
            className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] space-y-4 hover:border-terracotta-300 transition-all"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <div className="flex items-center gap-2.5">
                <StatusBadge status={trip.status} size="sm" />
                <span
                  dangerouslySetInnerHTML={{ __html: trip.pickupTime }}
                  className="text-xs font-semibold text-charcoal-600 font-sans"
                />
              </div>
              <span className="text-xs font-mono font-bold text-charcoal-400 bg-[#FDFBF7] px-2.5 py-1 rounded-lg border border-[#E8E2D9]">
                {trip.id}
              </span>
            </div>

            {/* Route Timeline with centered markers */}
            <div className="relative pl-8 space-y-4 before:absolute before:left-[11px] before:top-[10px] before:bottom-[10px] before:w-0.5 before:bg-[#E8E2D9]">
              <div className="relative">
                <span className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-charcoal-900 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-charcoal-900" />
                </span>
                <div className="text-xs uppercase font-bold tracking-wider text-charcoal-400">Pickup</div>
                <div className="text-sm font-bold text-charcoal-900 font-serif mt-0.5">{trip.pickup}</div>
                {trip.pickupCity && <div className="text-xs text-charcoal-500 font-sans">{trip.pickupCity}</div>}
              </div>
              <div className="relative">
                <span className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-terracotta-600 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-terracotta-600" />
                </span>
                <div className="text-xs uppercase font-bold tracking-wider text-terracotta-700">Destination</div>
                <div className="text-sm font-bold text-charcoal-900 font-serif mt-0.5">{trip.destination}</div>
                {trip.destinationCity && <div className="text-xs text-charcoal-500 font-sans">{trip.destinationCity}</div>}
              </div>
            </div>

            {/* Manifest & Distance */}
            <div className="pt-3 border-t border-warm-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-charcoal-800 font-medium">
                  <Users className="w-4 h-4 text-terracotta-600" />
                  <span>{trip.passengers}</span>
                </div>
                {trip.notes && (
                  <p className="text-[11px] text-charcoal-400 italic">
                    Note: {trip.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-charcoal-500 bg-warm-50 px-2.5 py-1 rounded-lg border border-[#E8E2D9]">
                  {trip.distance} &bull; {trip.duration}
                </span>
                {trip.status !== TripStatus.COMPLETED ? (
                  <Link
                    href="/driver"
                    className="px-4 py-2 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-terracotta-600/20 active:scale-[0.98] transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Open Console</span>
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-warm-100 text-charcoal-600 text-xs font-semibold border border-[#E8E2D9]">
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
