'use client';

import React from 'react';
import { LiveFleetMapCard } from '../../../components/host/live-fleet-map-card';

export default function HostLiveTrackingPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Live Fleet GPS Telemetry</h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Real-time location stream and active journey tracking across all wedding shuttles.
        </p>
      </div>

      <LiveFleetMapCard />
    </div>
  );
}
