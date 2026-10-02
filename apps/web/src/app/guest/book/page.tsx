'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, MapPin, CheckCircle2, QrCode, ArrowRight } from 'lucide-react';
import { VehicleCategory } from '@safar/types';

export default function GuestBookPage() {
  const router = useRouter();
  const [pickup, setPickup] = useState('The Grand Hotel');
  const [destination, setDestination] = useState('The Celebration Venue');
  const [category, setCategory] = useState<VehicleCategory>(VehicleCategory.SEDAN);
  const [passengers, setPassengers] = useState(2);
  const [time, setTime] = useState('12:30 PM');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setConfirmedBooking({
      id: `bk_${Date.now()}`,
      pickup,
      destination,
      category,
      passengers,
      time,
      boardingCode: newCode,
    });
  };

  if (confirmedBooking) {
    return (
      <div className="py-6 max-w-md mx-auto space-y-5 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-safar-700">
            Booking Confirmed
          </span>
          <h1 className="text-xl font-bold text-charcoal-900 mt-1">
            Your Ride is Reserved!
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            A vehicle has been scheduled for your departure at {confirmedBooking.time}.
          </p>
        </div>

        {/* Boarding Pass Box */}
        <div className="p-6 rounded-2xl bg-white border border-charcoal-200/90 shadow-sm space-y-4 text-center">
          <div className="p-4 rounded-xl bg-warm-100 border border-charcoal-200">
            <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-500">
              Boarding Verification Code
            </span>
            <div className="text-4xl font-black font-mono tracking-widest text-safar-700 mt-1">
              {confirmedBooking.boardingCode}
            </div>
            <p className="text-[11px] text-charcoal-400 mt-1">
              Provide this code to your driver upon pickup.
            </p>
          </div>

          <div className="p-3 bg-white border border-charcoal-200 rounded-xl inline-block shadow-inner">
            <div className="w-32 h-32 bg-charcoal-900 p-2 rounded-lg flex items-center justify-center text-white">
              <QrCode className="w-24 h-24 text-white" />
            </div>
          </div>

          <div className="pt-2 text-xs text-charcoal-600 text-left space-y-1 border-t border-charcoal-100">
            <div><strong>Route:</strong> {confirmedBooking.pickup} &rarr; {confirmedBooking.destination}</div>
            <div><strong>Vehicle:</strong> {confirmedBooking.category} &bull; {confirmedBooking.passengers} Passengers</div>
          </div>
        </div>

        <button
          onClick={() => router.push('/guest')}
          className="w-full py-3 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs transition-colors"
        >
          Return to Guest Home
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-md mx-auto space-y-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-safar-700">
          Shuttle Reservation
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
          Book Event Ride
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Reserve seats between official hotel hubs and wedding celebration venues.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-charcoal-200/90 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-charcoal-700 mb-1">
            Pickup Location
          </label>
          <select
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs bg-white font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
          >
            <option>The Grand Hotel</option>
            <option>Ahmedabad Airport (AMD)</option>
            <option>The Celebration Venue</option>
            <option>The Heritage Palace</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal-700 mb-1">
            Destination Venue
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs bg-white font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
          >
            <option>The Celebration Venue</option>
            <option>The Grand Hotel</option>
            <option>The Heritage Palace</option>
            <option>Ahmedabad Airport (AMD)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
            Select Ride Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { cat: VehicleCategory.SEDAN, label: 'Sedan', seats: '4 seats' },
              { cat: VehicleCategory.SUV, label: 'SUV', seats: '6 seats' },
              { cat: VehicleCategory.TEMPO_TRAVELLER, label: 'Traveller', seats: '16 seats' },
            ].map((item) => (
              <button
                key={item.cat}
                type="button"
                onClick={() => setCategory(item.cat)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  category === item.cat
                    ? 'border-safar-600 bg-safar-50 text-safar-900 font-bold shadow-xs'
                    : 'border-charcoal-200 bg-white text-charcoal-600 hover:border-charcoal-300'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className="text-[10px] text-charcoal-400 font-normal">{item.seats}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Departure Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
              placeholder="e.g. 12:30 PM"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Passenger Count
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-safar-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          Confirm Reservation <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
