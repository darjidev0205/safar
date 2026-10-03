'use client';

import React from 'react';
import { LiveFleetMapCard } from '../../../components/host/live-fleet-map-card';
import { Radio, Car, ShieldCheck, Compass, Sparkles } from 'lucide-react';

export default function HostLiveTrackingPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-terracotta-100/70 text-terracotta-900 border border-terracotta-200/60 font-sans">
              Real-Time Operations
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-800">
              <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
              Live Telemetry Stream
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
            Live Fleet GPS Telemetry
          </h1>
          <p className="text-xs text-charcoal-500 mt-1 max-w-2xl font-sans leading-relaxed">
            Real-time geospatial tracking across all shuttles, airport transfers, and ceremonial guest convoys.
          </p>
        </div>

        {/* Telemetry Status Pill */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="px-3.5 py-2 rounded-2xl bg-white/90 border border-warm-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-charcoal-800">GPS Constellation Active</span>
            <span className="text-[11px] font-mono text-charcoal-400">| 1.0s sync</span>
          </div>
        </div>
      </div>

      {/* Main Map Card */}
      <LiveFleetMapCard />
    </div>
  );
}
