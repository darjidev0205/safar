'use client';

import React from 'react';
import { Navigation, Car, Users, ExternalLink, Shield } from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';
import { StarFlourish } from '../ui/botanical-ornaments';

interface LiveFleetMapCardProps {
  onOpenLiveMap?: () => void;
}

export function LiveFleetMapCard({ onOpenLiveMap }: LiveFleetMapCardProps) {
  const activeVehicles = [
    {
      plate: 'GJ 01 AB 1234',
      model: 'Force Urbania',
      category: 'Tempo Traveller',
      status: 'EN_ROUTE_TO_PICKUP',
      passengers: '12 guests',
      driver: 'Rohit Sharma',
    },
    {
      plate: 'GJ 01 CD 5678',
      model: 'Toyota Innova Crysta',
      category: 'Luxury SUV',
      status: 'ARRIVED',
      passengers: '6 guests',
      driver: 'Amit Patel',
    },
    {
      plate: 'GJ 27 EF 9012',
      model: 'Toyota Camry Hybrid',
      category: 'Executive Sedan',
      status: 'IN_TRANSIT',
      passengers: '3 guests',
      driver: 'Suresh Kumar',
    },
  ];

  return (
    <div className="bg-white/95 rounded-3xl border border-warm-200/90 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/60">
        <div>
          <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-charcoal-900">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Live Fleet Tracking</span>
          </div>
          <p className="text-xs text-charcoal-500 font-sans mt-0.5">
            Real-time GPS telemetry from active wedding chauffeurs
          </p>
        </div>
        {onOpenLiveMap && (
          <button
            onClick={onOpenLiveMap}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors font-sans"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Full Map</span>
          </button>
        )}
      </div>

      {/* Map + Vehicles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-warm-200/80">
        {/* Visual Simulated Route Map */}
        <div className="lg:col-span-7 p-4 bg-warm-50/50 flex flex-col justify-center">
          <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-[#FAF7F2] border border-warm-300/80 shadow-inner flex items-center justify-center">
            {/* Map Roads & Polyline SVG */}
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 240">
              {/* Grid Roads */}
              <path d="M 0 60 Q 150 70 400 50" stroke="#E5DACB" strokeWidth="12" fill="none" opacity="0.6" />
              <path d="M 0 190 Q 200 170 400 200" stroke="#E5DACB" strokeWidth="10" fill="none" opacity="0.6" />
              <path d="M 80 0 L 100 240" stroke="#E5DACB" strokeWidth="8" fill="none" opacity="0.6" />
              <path d="M 320 0 L 310 240" stroke="#E5DACB" strokeWidth="8" fill="none" opacity="0.6" />

              {/* Active Route Terracotta Line */}
              <path
                d="M 60 170 C 120 170, 140 90, 220 110 S 310 70, 340 80"
                stroke="#C86D51"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="6 4"
                fill="none"
              />

              {/* Origin Marker */}
              <circle cx="60" cy="170" r="7" fill="#0F172A" />
              <circle cx="60" cy="170" r="3" fill="#FFFFFF" />

              {/* Destination Marker */}
              <circle cx="340" cy="80" r="7" fill="#087F76" />
              <circle cx="340" cy="80" r="3" fill="#FFFFFF" />

              {/* In-Transit Moving Vehicle Dot */}
              <g transform="translate(200, 108)">
                <circle cx="0" cy="0" r="14" fill="#C86D51" opacity="0.25">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="8" fill="#C86D51" />
                <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
              </g>
            </svg>

            {/* Overlaid Map Pill */}
            <div className="absolute bottom-3 left-3 apple-glass-floating px-3 py-1.5 rounded-full border border-warm-300 text-[11px] font-semibold text-charcoal-800 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
              <span>Live Telemetry: 3 Vehicles Active</span>
            </div>
          </div>
        </div>

        {/* Vehicles List */}
        <div className="lg:col-span-5 p-4 space-y-2.5 bg-white/95">
          {activeVehicles.map((v, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-warm-200/90 hover:border-warm-300 bg-warm-50/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-warm-100/90 border border-warm-200/80 flex items-center justify-center text-charcoal-700">
                  <Car className="w-4 h-4 text-terracotta-700" />
                </div>
                <div>
                  <div className="font-bold text-xs text-charcoal-900 font-sans">{v.plate}</div>
                  <div className="text-[11px] text-charcoal-500">
                    {v.category} • {v.driver}
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <StatusBadge status={v.status} size="sm" />
                <div className="text-[11px] font-medium text-charcoal-500">
                  {v.passengers}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
