'use client';

import React from 'react';
import { Users, Home, Car, UserCheck, Clock, ShieldCheck } from 'lucide-react';
import { StarFlourish } from '../ui/botanical-ornaments';

export interface HostKpiStats {
  totalGuests: number;
  families: number;
  vehiclesRequired: number;
  guestsAssigned: number;
  guestsPending: number;
  driversAssigned: number;
  activeTrips?: number;
  totalFleetVehicles?: number;
  totalFleetDrivers?: number;
}

interface KpiCardsProps {
  stats: HostKpiStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: 'Total Guests',
      value: (stats.totalGuests || 0).toLocaleString(),
      trend: stats.totalGuests > 0 ? 'Confirmed in database' : 'No guests yet',
      icon: Users,
      color: 'text-safar-800',
      bgColor: 'bg-safar-50 border border-safar-200/80',
    },
    {
      title: 'Families',
      value: (stats.families || 0).toLocaleString(),
      trend: stats.families > 0 ? `${stats.families} registered family groups` : 'No families yet',
      icon: Home,
      color: 'text-terracotta-800',
      bgColor: 'bg-terracotta-50 border border-terracotta-200/80',
    },
    {
      title: 'Vehicles Needed',
      value: (stats.vehiclesRequired || 0).toString(),
      trend:
        stats.totalFleetVehicles !== undefined
          ? `${stats.totalFleetVehicles} available in fleet`
          : 'Based on guest counts',
      icon: Car,
      color: 'text-gold-700',
      bgColor: 'bg-amber-50 border border-gold-300/80',
    },
    {
      title: 'Guests Assigned',
      value: (stats.guestsAssigned || 0).toLocaleString(),
      trend:
        stats.totalGuests > 0
          ? `${Math.round(((stats.guestsAssigned || 0) / stats.totalGuests) * 100)}% allocated`
          : 'Pending allocation',
      icon: UserCheck,
      color: 'text-sage-800',
      bgColor: 'bg-sage-50 border border-sage-200/80',
    },
    {
      title: 'Guests Pending',
      value: (stats.guestsPending || 0).toLocaleString(),
      trend: (stats.guestsPending || 0) > 0 ? 'Awaiting vehicle assignment' : 'All guests assigned',
      icon: Clock,
      color: (stats.guestsPending || 0) > 0 ? 'text-burgundy-800' : 'text-charcoal-400',
      bgColor: (stats.guestsPending || 0) > 0 ? 'bg-burgundy-50 border border-burgundy-200/80' : 'bg-warm-50 border border-warm-200',
    },
    {
      title: 'Active Chauffeurs',
      value: (stats.driversAssigned || 0).toString(),
      trend:
        stats.totalFleetDrivers !== undefined
          ? `${stats.totalFleetDrivers} total drivers on roster`
          : 'Assigned on duties',
      icon: ShieldCheck,
      color: 'text-charcoal-800',
      bgColor: 'bg-warm-100 border border-warm-300/80',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)] hover:shadow-md hover:border-warm-300 transition-all flex flex-col justify-between active:scale-[0.985]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider truncate font-sans">
                {card.title}
              </span>
              <div className={`w-7 h-7 rounded-xl ${card.bgColor} flex items-center justify-center ${card.color} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl md:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
                {card.value}
              </div>
              <div className="mt-1 text-[11px] text-charcoal-500 truncate font-medium font-sans">
                {card.trend}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
