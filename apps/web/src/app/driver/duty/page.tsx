'use client';

import React, { useState } from 'react';
import { Car, CheckCircle2, AlertTriangle, ShieldCheck, Gauge, Fuel } from 'lucide-react';
import { DutyStatus } from '@safar/types';

export default function DriverDutyPage() {
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>(DutyStatus.ON_DUTY);
  const [odometer, setOdometer] = useState('42,580');
  const [fuelLevel, setFuelLevel] = useState('85%');
  const [checklist, setChecklist] = useState({
    tires: true,
    brakes: true,
    ac: true,
    sanitized: true,
    firstAid: true,
    fuelAdequate: true,
  });
  const [savedNotice, setSavedNotice] = useState(false);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
          Duty Status &amp; Vehicle Inspection
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Pre-shift vehicle inspection log and operational availability status.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Vehicle inspection checklist and duty status updated successfully.</span>
        </div>
      )}

      {/* Duty Status Selector */}
      <div className="p-6 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-charcoal-900">Current Operational Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: DutyStatus.ON_DUTY, label: 'On Duty', desc: 'Ready for trips' },
            { id: DutyStatus.AVAILABLE, label: 'Available', desc: 'Standing by' },
            { id: DutyStatus.BREAK, label: 'On Break', desc: 'Paused (15m)' },
            { id: DutyStatus.OFF_DUTY, label: 'Off Duty', desc: 'Shift ended' },
          ].map((item) => {
            const isSelected = dutyStatus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDutyStatus(item.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  isSelected
                    ? 'bg-safar-50 border-safar-400 text-safar-900 shadow-xs'
                    : 'bg-charcoal-50 border-charcoal-200 text-charcoal-700 hover:border-charcoal-300'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] text-charcoal-500 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle Info & Readings */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-charcoal-900">Vehicle Readings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Current Odometer (km)
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-mono font-bold focus:ring-2 focus:ring-safar-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Fuel / Charge Level
              </label>
              <div className="relative">
                <Fuel className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-mono font-bold focus:ring-2 focus:ring-safar-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Trip Safety Checklist */}
        <div className="p-6 rounded-3xl bg-white border border-charcoal-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-charcoal-900">Mandatory Pre-Trip Safety Checklist</h3>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> All Checks Cleared
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'tires', label: 'Tire Pressure & Tread Condition' },
              { key: 'brakes', label: 'Braking & Steering Response' },
              { key: 'ac', label: 'Air Conditioning & Cabin Comfort' },
              { key: 'sanitized', label: 'Cabin Sanitized & Passenger Bottles Placed' },
              { key: 'firstAid', label: 'First Aid Kit & Emergency Triangle Present' },
              { key: 'fuelAdequate', label: 'Fuel/Charge Adequate for Full Shift' },
            ].map((check) => (
              <label
                key={check.key}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-charcoal-200 bg-charcoal-50/60 hover:bg-charcoal-50 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checklist[check.key as keyof typeof checklist]}
                  onChange={() => toggleCheck(check.key as keyof typeof checklist)}
                  className="rounded text-safar-600 focus:ring-safar-500"
                />
                <span className="font-medium text-charcoal-800">{check.label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Submit Inspection &amp; Update Duty
          </button>
        </div>
      </form>
    </div>
  );
}
