'use client';

import React from 'react';
import { Car } from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';

export interface VehicleCardData {
  driverName: string;
  vehicleModel: string;
  plateNumber: string;
  status: string;
  actualDistanceKm: number;
  plannedDistanceKm: number;
  eta: string | number;
  isSelected?: boolean;
}

interface VehicleCardProps {
  vehicle: VehicleCardData;
  onClick?: () => void;
  className?: string;
}

export function VehicleCard({ vehicle, onClick, className = '' }: VehicleCardProps) {
  const formattedEta =
    typeof vehicle.eta === 'number'
      ? `${vehicle.eta} min`
      : vehicle.eta || 'Calculating';

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-2xl border transition-all duration-200 select-none ${
        vehicle.isSelected
          ? 'bg-terracotta-50/40 border-terracotta-300 shadow-sm'
          : 'bg-white border-[#E8E2D9] hover:border-warm-300 hover:bg-warm-50/30'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Top Header: Icon, Driver, Model, Plate, Status */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-200 flex items-center justify-center text-charcoal-700 shrink-0">
            <Car className="w-4 h-4 text-terracotta-600" />
          </div>
          <div className="min-w-0">
            <div className="font-serif font-bold text-xs text-charcoal-900 truncate">
              {vehicle.driverName}
            </div>
            <div className="text-[11px] text-charcoal-600 truncate font-sans">
              {vehicle.vehicleModel}
            </div>
            <div className="text-[10px] font-mono font-semibold text-charcoal-500 tracking-wide">
              {vehicle.plateNumber}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <StatusBadge status={vehicle.status} size="sm" />
        </div>
      </div>

      {/* Progress & ETA Row */}
      <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-warm-100 text-xs font-sans">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-charcoal-400 block">
            Mileage Progress
          </span>
          <span className="font-semibold text-charcoal-900 block truncate text-[11px] mt-0.5">
            {vehicle.actualDistanceKm.toFixed(1)} km{' '}
            <span className="text-charcoal-400 font-normal text-[10px]">
              / {vehicle.plannedDistanceKm.toFixed(1)} km
            </span>
          </span>
        </div>

        <div className="text-right">
          <span className="text-[9px] font-bold uppercase tracking-wider text-charcoal-400 block">
            ETA to Venue
          </span>
          <span className="font-bold text-charcoal-900 block text-[11px] mt-0.5">
            {formattedEta}
          </span>
        </div>
      </div>
    </div>
  );
}
