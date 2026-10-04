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
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700 block">
          Chauffeur Operations
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 font-serif">
          Duty Status &amp; Vehicle Inspection
        </h1>
        <p className="text-xs text-charcoal-500">
          Pre-shift fleet inspection checklist and active duty availability log.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Vehicle inspection checklist and duty status updated successfully.</span>
        </div>
      )}

      {/* Duty Status Selector */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] space-y-4">
        <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900">Current Operational Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                className={`p-4 rounded-2xl text-left border transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-[#FDFBF7] border-[#E8E2D9] text-charcoal-700 hover:border-warm-300'
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
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] space-y-4">
          <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900">Vehicle Telemetry Readings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Current Odometer (km)
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#E8E2D9] bg-[#FDFBF7] text-xs font-mono font-bold focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Fuel / Charge Level
              </label>
              <div className="relative">
                <Fuel className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#E8E2D9] bg-[#FDFBF7] text-xs font-mono font-bold focus:ring-2 focus:ring-terracotta-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Trip Safety Checklist */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900">Mandatory Pre-Trip Safety Checklist</h3>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Cleared
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'tires', label: 'Tire Pressure & Tread Condition' },
              { key: 'brakes', label: 'Braking & Steering Response' },
              { key: 'ac', label: 'Air Conditioning & Cabin Comfort' },
              { key: 'sanitized', label: 'Cabin Sanitized & Water Bottles Placed' },
              { key: 'firstAid', label: 'First Aid Kit & Emergency Kit Present' },
              { key: 'fuelAdequate', label: 'Fuel/Charge Adequate for Shift' },
            ].map((check) => (
              <label
                key={check.key}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#E8E2D9] bg-[#FDFBF7] hover:border-terracotta-300 cursor-pointer text-xs transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checklist[check.key as keyof typeof checklist]}
                  onChange={() => toggleCheck(check.key as keyof typeof checklist)}
                  className="rounded text-terracotta-600 focus:ring-terracotta-500 w-4 h-4"
                />
                <span className="font-medium text-charcoal-800">{check.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-terracotta-600/20 transition-all active:scale-[0.98]"
            >
              Submit Inspection &amp; Update Duty
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
