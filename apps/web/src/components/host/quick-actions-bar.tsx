'use client';

import React from 'react';
import { CalendarPlus, Car, UserPlus, BarChart3 } from 'lucide-react';

interface QuickActionsBarProps {
  onOpenWizard: () => void;
  onAddVehicle: () => void;
  onInviteGuests: () => void;
  onViewReports: () => void;
}

export function QuickActionsBar({
  onOpenWizard,
  onAddVehicle,
  onInviteGuests,
  onViewReports,
}: QuickActionsBarProps) {
  const actions = [
    {
      title: 'Create New Event',
      description: 'Set up a new event and manage transportation.',
      icon: CalendarPlus,
      onClick: onOpenWizard,
    },
    {
      title: 'Add Vehicles',
      description: 'Add your fleet and assign drivers.',
      icon: Car,
      onClick: onAddVehicle,
    },
    {
      title: 'Invite Guests',
      description: 'Share event code or invite.',
      icon: UserPlus,
      onClick: onInviteGuests,
    },
    {
      title: 'View Reports',
      description: 'Trip, booking and revenue reports.',
      icon: BarChart3,
      onClick: onViewReports,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={act.onClick}
            className="p-4 rounded-2xl bg-white border border-charcoal-200/80 hover:border-safar-400 hover:shadow-sm text-left transition-all group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-warm-50 text-safar-700 flex items-center justify-center mb-3 group-hover:bg-safar-50 transition-colors">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-charcoal-900 group-hover:text-safar-700 transition-colors">
                {act.title}
              </h4>
              <p className="text-[11px] text-charcoal-500 mt-0.5 leading-snug">
                {act.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
