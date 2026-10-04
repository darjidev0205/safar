'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, MapPin, CheckCircle2, QrCode, ArrowRight, Sparkles } from 'lucide-react';
import { VehicleCategory } from '@safar/types';
import { PlaceAutocomplete, PlaceResult } from '../../../components/ui/place-autocomplete';
import { StarFlourish } from '../../../components/ui/botanical-ornaments';

export default function GuestBookPage() {
  const router = useRouter();
  const [pickup, setPickup] = useState('The Grand Hotel, Ahmedabad');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState('The Celebration Venue, Ahmedabad');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState<VehicleCategory>(VehicleCategory.SEDAN);
  const [passengers, setPassengers] = useState(2);
  const [time, setTime] = useState('12:30 PM');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const handlePickupSelect = (place: PlaceResult) => {
    setPickup(place.address || place.name);
    if (place.latitude && place.longitude) {
      setPickupCoords({ lat: place.latitude, lng: place.longitude });
    }
  };

  const handleDestinationSelect = (place: PlaceResult) => {
    setDestination(place.address || place.name);
    if (place.latitude && place.longitude) {
      setDestinationCoords({ lat: place.latitude, lng: place.longitude });
    }
  };

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
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta-700">
            Booking Confirmed
          </span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 mt-1">
            Your Ride is Reserved!
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5 font-sans">
            A chauffeur has been scheduled for your departure at {confirmedBooking.time}.
          </p>
        </div>

        {/* Boarding Pass Box */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-sm space-y-4 text-center">
          <div className="p-4 rounded-2xl bg-warm-100 border border-[#E8E2D9]">
            <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-500 font-sans">
              Boarding Verification PIN
            </span>
            <div className="text-4xl font-bold font-mono tracking-widest text-charcoal-950 mt-1">
              {confirmedBooking.boardingCode}
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1 font-sans">
              Provide this 4-digit PIN to your chauffeur upon pickup.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#E8E2D9] rounded-2xl inline-block shadow-inner">
            <div className="w-32 h-32 bg-charcoal-900 p-2 rounded-xl flex items-center justify-center text-white">
              <QrCode className="w-24 h-24 text-white" />
            </div>
          </div>

          <div className="pt-2 text-xs text-charcoal-600 text-left space-y-1.5 border-t border-warm-200 font-sans">
            <div className="line-clamp-1"><strong>Pick-up:</strong> {confirmedBooking.pickup}</div>
            <div className="line-clamp-1"><strong>Destination:</strong> {confirmedBooking.destination}</div>
            <div><strong>Vehicle:</strong> {confirmedBooking.category} &bull; {confirmedBooking.passengers} Guests</div>
          </div>
        </div>

        <button
          onClick={() => router.push('/guest')}
          className="w-full py-3.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.985]"
        >
          Return to Guest Portal
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-md mx-auto space-y-5">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <StarFlourish className="w-3 h-3 text-gold-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-terracotta-700 font-sans">
            Ceremonial Shuttle Reservation
          </span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-charcoal-900 tracking-tight">
          Book Event Ride
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5 font-sans">
          Reserve seats with verified wedding chauffeurs and real-time GPS dispatch.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E2D9] shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1.5 font-sans">
            Pickup Location
          </label>
          <PlaceAutocomplete
            placeholder="Search hotel, airport, or address..."
            defaultValue={pickup}
            onPlaceSelect={handlePickupSelect}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1.5 font-sans">
            Destination Venue
          </label>
          <PlaceAutocomplete
            placeholder="Search banquet lawn, resort, or palace..."
            defaultValue={destination}
            onPlaceSelect={handleDestinationSelect}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1.5 font-sans">
            Select Ride Type
          </label>
          <div className="grid grid-cols-3 gap-2 font-sans">
            {[
              { cat: VehicleCategory.SEDAN, label: 'Executive Sedan', seats: '4 seats' },
              { cat: VehicleCategory.SUV, label: 'Luxury SUV', seats: '6 seats' },
              { cat: VehicleCategory.TEMPO_TRAVELLER, label: 'Traveller', seats: '16 seats' },
            ].map((item) => (
              <button
                key={item.cat}
                type="button"
                onClick={() => setCategory(item.cat)}
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  category === item.cat
                    ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-900 font-bold shadow-xs'
                    : 'border-[#E8E2D9] bg-white text-charcoal-600 hover:border-warm-300'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className="text-[10px] text-charcoal-400 font-normal">{item.seats}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
              Departure Time
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
              placeholder="e.g. 12:30 PM"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">
              Guest Count
            </label>
            <input
              type="number"
              min="1"
              max="16"
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.985]"
        >
          Confirm Reservation <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

