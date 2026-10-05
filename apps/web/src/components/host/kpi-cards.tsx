'use client';

import React from 'react';
import { Users, Home, Calendar, Car, UserCheck, Clock, ShieldCheck } from 'lucide-react';
import { SummaryCard } from './summary-card';

export interface HostKpiStats {
  totalGuests: number;
  families: number;
  functionsCount?: number;
  vehiclesRequired: number;
  guestsAssigned: number;
  guestsPending: number;
  driversAssigned: number;
  activeChauffeurs?: number;
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
      label: 'Total Guests',
      value: (stats.totalGuests || 0).toLocaleString(),
      supportingText: stats.totalGuests > 0 ? 'Confirmed in roster' : 'No guests yet',
      icon: Users,
      iconColor: 'text-charcoal-800',
      iconBgColor: 'bg-warm-100 border-warm-300/80',
    },
    {
      label: 'Families',
      value: (stats.families || 0).toLocaleString(),
      supportingText: stats.families > 0 ? `${stats.families} family groups` : 'No families yet',
      icon: Home,
      iconColor: 'text-terracotta-700',
      iconBgColor: 'bg-terracotta-50 border-terracotta-200/80',
    },
    {
      label: 'Functions',
      value: (stats.functionsCount || 0).toString(),
      supportingText: stats.functionsCount ? `${stats.functionsCount} ceremonies` : 'Mehndi, Sangeet...',
      icon: Calendar,
      iconColor: 'text-gold-700',
      iconBgColor: 'bg-amber-50 border-gold-200/80',
    },
    {
      label: 'Vehicles Needed',
      value: (stats.vehiclesRequired || 0).toString(),
      supportingText:
        stats.totalFleetVehicles !== undefined
          ? `${stats.totalFleetVehicles} in fleet`
          : 'Based on capacity',
      icon: Car,
      iconColor: 'text-gold-800',
      iconBgColor: 'bg-amber-50 border-gold-300/80',
    },
    {
      label: 'Guests Assigned',
      value: (stats.guestsAssigned || 0).toLocaleString(),
      supportingText:
        stats.totalGuests > 0
          ? `${Math.round(((stats.guestsAssigned || 0) / stats.totalGuests) * 100)}% allocated`
          : 'Pending allocation',
      icon: UserCheck,
      iconColor: 'text-sage-800',
      iconBgColor: 'bg-sage-50 border-sage-200/80',
    },
    {
      label: 'Guests Pending',
      value: (stats.guestsPending || 0).toLocaleString(),
      supportingText: (stats.guestsPending || 0) > 0 ? 'Awaiting vehicles' : 'All assigned',
      icon: Clock,
      iconColor: (stats.guestsPending || 0) > 0 ? 'text-burgundy-800' : 'text-charcoal-400',
      iconBgColor:
        (stats.guestsPending || 0) > 0
          ? 'bg-burgundy-50 border-burgundy-200/80'
          : 'bg-warm-50 border-warm-200',
    },
    {
      label: 'Active Chauffeurs',
      value: (stats.activeChauffeurs || stats.driversAssigned || 0).toString(),
      supportingText:
        stats.totalFleetDrivers !== undefined
          ? `${stats.totalFleetDrivers} on roster`
          : 'On duty',
      icon: ShieldCheck,
      iconColor: 'text-charcoal-800',
      iconBgColor: 'bg-warm-100 border-warm-300/80',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5">
      {cards.map((card, idx) => (
        <SummaryCard
          key={idx}
          label={card.label}
          value={card.value}
          supportingText={card.supportingText}
          icon={card.icon}
          iconColor={card.iconColor}
          iconBgColor={card.iconBgColor}
        />
      ))}
    </div>
  );
}
