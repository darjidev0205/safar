'use client';

import React from 'react';
import { Navigation, Car, Users, ExternalLink, Shield } from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';

interface LiveFleetMapCardProps {
  onOpenLiveMap?: () => void;
}

export function LiveFleetMapCard({ onOpenLiveMap }: LiveFleetMapCardProps) {
  const activeVehicles = [
    {
      plate: 'KA 01 AB 1234',
      model: 'Force Urbania',
      category: 'Tempo Traveller',
      status: 'EN_ROUTE_TO_PICKUP',
      passengers: '12 guests',
      driver: 'Rohit Sharma',
    },
    {
      plate: 'KA 02 CD 5678',
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      status: 'ARRIVED',
      passengers: '6 guests',
      driver: 'Amit Patel',
    },
    {
      plate: 'KA 03 EF 9012',
      model: 'Honda City',
      category: 'Sedan',
      status: 'IN_TRANSIT',
      passengers: '4 guests',
      driver: 'Suresh Kumar',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-charcoal-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-charcoal-900">Live Fleet Tracking</h3>
          <p className="text-xs text-charcoal-500">Real-time GPS telemetry from active drivers</p>
        </div>
        <button
          onClick={onOpenLiveMap}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-safar-700 hover:text-safar-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Live Map
        </button>
      </div>

      {/* Map + Vehicles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-charcoal-100">
        {/* Visual Simulated Route Map */}
        <div className="lg:col-span-7 p-4 bg-warm-50/50 flex flex-col justify-center">
          <div className="relative h-60 w-full rounded-xl overflow-hidden bg-[#eef2f5] border border-charcoal-200/60 shadow-inner flex items-center justify-center">
            {/* Map Roads & Polyline SVG */}
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 240">
              {/* Grid Roads */}
              <path d="M 0 60 Q 150 70 400 50" stroke="#d5dde5" strokeWidth="12" fill="none" />
              <path d="M 0 190 Q 200 170 400 200" stroke="#d5dde5" strokeWidth="10" fill="none" />
              <path d="M 80 0 L 100 240" stroke="#d5dde5" strokeWidth="8" fill="none" />
              <path d="M 320 0 L 310 240" stroke="#d5dde5" strokeWidth="8" fill="none" />

              {/* Active Route Teal Line */}
              <path
                d="M 60 170 C 120 170, 140 90, 220 110 S 310 70, 340 80"
                stroke="#0d9488"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="6 4"
                fill="none"
              />

              {/* Origin Marker */}
              <circle cx="60" cy="170" r="7" fill="#111827" />
              <circle cx="60" cy="170" r="3" fill="#ffffff" />

              {/* Destination Marker */}
              <circle cx="340" cy="80" r="7" fill="#0d9488" />
              <circle cx="340" cy="80" r="3" fill="#ffffff" />

              {/* In-Transit Moving Vehicle Dot */}
              <g transform="translate(200, 108)">
                <circle cx="0" cy="0" r="14" fill="#0d9488" opacity="0.25">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="8" fill="#0d9488" />
                <circle cx="0" cy="0" r="4" fill="#ffffff" />
              </g>
            </svg>

            {/* Overlaid Map Pill */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-charcoal-200 text-[11px] font-semibold text-charcoal-800 shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              Live WebSocket Stream: 3 active pings/sec
            </div>
          </div>
        </div>

        {/* Vehicles List */}
        <div className="lg:col-span-5 p-4 space-y-2.5 bg-white">
          {activeVehicles.map((v, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-charcoal-200/80 hover:border-safar-300 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-charcoal-50 flex items-center justify-center text-charcoal-700">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-charcoal-900">{v.plate}</div>
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
