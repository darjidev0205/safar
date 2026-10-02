'use client';

import React from 'react';
import { BarChart3, Download, TrendingUp, Users, Car, Route, Calendar, FileText } from 'lucide-react';

export default function HostReportsPage() {
  const reports = [
    { title: 'Passenger Transportation Manifest', desc: 'Complete breakdown of all guest pickups, departures, and vehicle allocations.', date: 'Generated Oct 02, 2026', type: 'CSV / PDF' },
    { title: 'Fleet Mileage & Fuel Log', desc: 'Individual odometer readings, trip durations, and chauffeur driving hours.', date: 'Generated Oct 02, 2026', type: 'CSV' },
    { title: 'Ceremony Attendance & Shuttles', desc: 'Cross-functional arrival counts vs ceremony RSVPs.', date: 'Generated Oct 01, 2026', type: 'PDF' },
    { title: 'Guest Booking Verification Audit', desc: 'Boarding passcode verification logs with driver timestamps.', date: 'Generated Sep 30, 2026', type: 'CSV' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Operational summaries, passenger manifests, fleet utilization, and exportable logs.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting full event transportation manifest...')}
          className="px-4 py-2 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export All Reports
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Passengers Served', val: '186 Pax', sub: '+12% from projected', icon: Users },
          { label: 'Fleet Trips Completed', val: '42 Runs', sub: '98.4% on-time dispatch', icon: Route },
          { label: 'Active Chauffeur Hours', val: '164 Hrs', sub: '0 reported incidents', icon: Car },
          { label: 'Average Pickup ETA', val: '4.2 Mins', sub: 'Within 5 min SLA buffer', icon: TrendingUp },
        ].map((kpi, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-charcoal-400">
              <span className="text-xs font-medium">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-safar-600" />
            </div>
            <div className="text-xl font-bold text-charcoal-900">{kpi.val}</div>
            <div className="text-[11px] text-emerald-600 font-semibold">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-charcoal-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-charcoal-900">Available Manifests &amp; Audit Logs</h3>
          <span className="text-xs text-charcoal-400">4 ready to download</span>
        </div>

        <div className="divide-y divide-charcoal-100">
          {reports.map((rep, idx) => (
            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-charcoal-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-charcoal-900">{rep.title}</h4>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">{rep.desc}</p>
                  <span className="text-[10px] text-charcoal-400 mt-1 inline-block">{rep.date} &bull; Format: {rep.type}</span>
                </div>
              </div>

              <button
                onClick={() => alert(`Downloading ${rep.title}`)}
                className="px-3.5 py-1.5 rounded-xl border border-charcoal-200 bg-white hover:bg-charcoal-50 text-charcoal-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0 self-end sm:self-center"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
