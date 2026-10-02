'use client';

import React from 'react';
import { Users, BookMarked, Route, Car, TrendingUp, Radio } from 'lucide-react';
import { DashboardStats } from '@safar/types';

interface KpiCardsProps {
  stats: DashboardStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: 'Total Guests',
      value: stats.totalGuests.toString(),
      trend: stats.totalGuests > 0 ? '+12 this week' : 'No guests yet',
      icon: Users,
      trendColor: 'text-emerald-600',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      trend: stats.totalBookings > 0 ? '+18% this week' : 'No bookings yet',
      icon: BookMarked,
      trendColor: 'text-emerald-600',
    },
    {
      title: 'Active Trips',
      value: stats.activeTrips.toString(),
      trend: stats.activeTrips > 0 ? 'Live now' : 'Idle',
      icon: Route,
      trendColor: stats.activeTrips > 0 ? 'text-teal-600' : 'text-charcoal-400',
      badgeDot: stats.activeTrips > 0,
    },
    {
      title: 'Vehicles On Duty',
      value: `${stats.vehiclesOnDuty} / ${stats.totalVehicles || 0}`,
      trend:
        stats.totalVehicles > 0
          ? `${Math.round((stats.vehiclesOnDuty / stats.totalVehicles) * 100)}% utilized`
          : 'Fleet unassigned',
      icon: Car,
      trendColor: 'text-charcoal-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-charcoal-500 mb-3">
              <span className="text-xs font-semibold text-charcoal-500">{card.title}</span>
              <div className="w-8 h-8 rounded-xl bg-charcoal-50 flex items-center justify-center text-charcoal-700">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl lg:text-3xl font-bold text-charcoal-900 font-sans tracking-tight">
                {card.value}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {card.badgeDot && (
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              )}
              <span className={`font-medium ${card.trendColor}`}>{card.trend}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
