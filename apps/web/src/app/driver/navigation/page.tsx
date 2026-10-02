'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation, Compass, MapPin, Radio, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DriverNavigationPage() {
  const [speed, setSpeed] = useState(38);
  const [eta, setEta] = useState(6);
  const [distanceRemaining, setDistanceRemaining] = useState('1.4 km');

  // Slight speed fluctuation for realism
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(Math.floor(34 + Math.random() * 8));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
            Active Turn-by-Turn Navigation
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            En route to: <strong className="text-charcoal-800">The Celebration Venue</strong>
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          GPS Locked
        </div>
      </div>

      {/* Main Navigation Map & Turn Card */}
      <div className="rounded-3xl overflow-hidden bg-white border border-charcoal-200/90 shadow-sm space-y-4 p-6">
        {/* Next Maneuver Banner */}
        <div className="p-4 rounded-2xl bg-charcoal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-safar-600 flex items-center justify-center text-white">
              <Navigation className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <div className="text-xs font-medium text-charcoal-300">In 350 meters</div>
              <div className="text-base font-bold">Turn right onto Sindhu Bhavan Road</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black font-mono">{eta} min</div>
            <div className="text-[11px] text-charcoal-400">{distanceRemaining}</div>
          </div>
        </div>

        {/* Interactive Map Visualizer */}
        <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-[#eef2f5] border border-charcoal-200/70 flex items-center justify-center">
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 500 300">
            {/* Grid roads */}
            <path d="M 0 80 Q 250 90 500 70" stroke="#d5dde5" strokeWidth="12" fill="none" />
            <path d="M 0 220 Q 250 200 500 230" stroke="#d5dde5" strokeWidth="12" fill="none" />
            <path d="M 120 0 L 140 300" stroke="#d5dde5" strokeWidth="10" fill="none" />
            <path d="M 380 0 L 360 300" stroke="#d5dde5" strokeWidth="10" fill="none" />

            {/* Active Navigation Route */}
            <path
              d="M 60 220 C 140 220, 200 120, 320 120 S 420 80, 440 75"
              stroke="#0d9488"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Vehicle Location Icon */}
            <g transform="translate(240, 140)">
              <circle cx="0" cy="0" r="18" fill="#0d9488" opacity="0.2">
                <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="8" fill="#0d9488" stroke="#ffffff" strokeWidth="2" />
            </g>

            {/* Destination Pin */}
            <g transform="translate(440, 75)">
              <circle cx="0" cy="0" r="6" fill="#111827" />
            </g>
          </svg>

          {/* Telemetry Floating Card */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-mono text-charcoal-800 shadow-sm flex items-center gap-3">
            <div>
              <span className="text-[10px] text-charcoal-400 block">SPEED</span>
              <strong className="text-sm font-black">{speed} km/h</strong>
            </div>
            <div className="w-px h-6 bg-charcoal-200" />
            <div>
              <span className="text-[10px] text-charcoal-400 block">ACCURACY</span>
              <strong className="text-sm font-black">&plusmn;3.8 m</strong>
            </div>
            <div className="w-px h-6 bg-charcoal-200" />
            <div>
              <span className="text-[10px] text-charcoal-400 block">HEADING</span>
              <strong className="text-sm font-black">74° NE</strong>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/driver"
            className="px-4 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50"
          >
            Back to Console
          </Link>

          <Link
            href="/driver/verification"
            className="px-5 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            Arrived &bull; Verify Boarding Pass <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
