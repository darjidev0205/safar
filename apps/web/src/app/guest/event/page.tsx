'use client';

import React from 'react';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';

export default function GuestEventPage() {
  const functions = [
    {
      name: 'Mehendi & Welcome Lunch',
      date: 'Friday, 14 Nov 2026',
      time: '12:00 PM – 04:00 PM',
      venue: 'The Grand Hotel — Poolside Lawn',
      dressCode: 'Pastel / Floral Festive',
    },
    {
      name: 'Sangeet & Musical Evening',
      date: 'Saturday, 15 Nov 2026',
      time: '07:00 PM – 11:30 PM',
      venue: 'The Celebration Venue — Royal Hall',
      dressCode: 'Indo-Western Glamour',
    },
    {
      name: 'Wedding Ceremony & Pheras',
      date: 'Sunday, 16 Nov 2026',
      time: '10:00 AM – 03:00 PM',
      venue: 'The Heritage Palace — Central Courtyard',
      dressCode: 'Traditional Indian Elegance',
    },
    {
      name: 'Grand Reception Dinner',
      date: 'Monday, 17 Nov 2026',
      time: '07:30 PM – Midnight',
      venue: 'The Celebration Venue — Grand Ballroom',
      dressCode: 'Formal Black Tie / Luxury Indian',
    },
  ];

  return (
    <div className="py-4 max-w-md mx-auto space-y-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-safar-700">
          Ceremony Timetable
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
          Event Schedule
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Aarav &amp; Diya Wedding &bull; Ahmedabad, Gujarat
        </p>
      </div>

      <div className="space-y-4">
        {functions.map((fn, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-charcoal-200/90 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-safar-700 bg-safar-50 px-2.5 py-1 rounded-lg">
                Ceremony 0{idx + 1}
              </span>
              <span className="text-xs font-medium text-charcoal-500">{fn.date}</span>
            </div>

            <h3 className="text-base font-bold text-charcoal-900">{fn.name}</h3>

            <div className="space-y-1.5 text-xs text-charcoal-600">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                <span>{fn.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-charcoal-400" />
                <span>{fn.venue}</span>
              </div>
              <div className="text-[11px] text-charcoal-500 pt-1">
                <strong>Attire:</strong> {fn.dressCode}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
