'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, QrCode, ArrowRight, CheckCircle2, Car } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/status-badge';

export default function GuestRidesPage() {
  const [selectedRide, setSelectedRide] = useState<any>(null);

  const rides = [
    {
      id: 'r_1',
      date: 'Today, 14 Nov',
      time: '10:30 AM',
      pickup: 'The Grand Hotel',
      destination: 'The Celebration Venue',
      vehicle: 'Sedan',
      status: 'ON_TIME',
      boardingCode: '4827',
      passengers: 4,
    },
    {
      id: 'r_2',
      date: 'Tomorrow, 15 Nov',
      time: '06:30 PM',
      pickup: 'The Grand Hotel',
      destination: 'The Heritage Palace',
      vehicle: 'SUV',
      status: 'SCHEDULED',
      boardingCode: '7194',
      passengers: 5,
    },
  ];

  return (
    <div className="py-4 max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-safar-700">
            Passenger Itinerary
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
            My Booked Rides
          </h1>
        </div>
        <Link
          href="/guest/book"
          className="px-3.5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs transition-colors"
        >
          + Book Ride
        </Link>
      </div>

      <div className="space-y-3.5">
        {rides.map((ride) => (
          <div
            key={ride.id}
            className="p-5 rounded-2xl bg-white border border-charcoal-200/90 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-charcoal-500">
                {ride.date} &bull; {ride.time}
              </span>
              <StatusBadge status={ride.status} size="sm" />
            </div>

            <div className="space-y-2 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-charcoal-900 ring-4 ring-white" />
                <div className="font-bold text-xs text-charcoal-900">{ride.pickup}</div>
              </div>
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-safar-600 ring-4 ring-white" />
                <div className="font-bold text-xs text-charcoal-900">{ride.destination}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-charcoal-100">
              <div className="text-xs text-charcoal-600">
                <span className="font-semibold">{ride.vehicle}</span> &bull; {ride.passengers} seats
              </div>
              <button
                onClick={() => setSelectedRide(ride)}
                className="px-3 py-1.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                Boarding Pass
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Boarding Pass Dialog */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-semibold text-safar-700 uppercase tracking-wider">
                Confirmed Ride
              </span>
              <h3 className="text-lg font-bold text-charcoal-900">Your Boarding Pass</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Show this code or QR to your driver upon arrival.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-100 border border-charcoal-200">
              <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-500">
                Boarding Code
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-safar-700 mt-1">
                {selectedRide.boardingCode}
              </div>
            </div>

            <div className="p-3 bg-white border border-charcoal-200 rounded-xl inline-block shadow-inner">
              <div className="w-36 h-36 bg-charcoal-900 p-2 rounded-lg flex items-center justify-center text-white">
                <QrCode className="w-28 h-28 text-white" />
              </div>
            </div>

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 text-white font-semibold text-xs hover:bg-charcoal-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
