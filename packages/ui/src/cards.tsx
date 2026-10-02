import React from 'react';
import { cn } from './utils';
import { StatusBadge } from './feedback';
import { Car, Clock, MapPin, Users, Phone, ArrowRight, Calendar } from 'lucide-react';

export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-white border border-gray-200/80 shadow-xs p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-teal-300 hover:shadow-sm active:scale-[0.99]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function VehicleCard({
  model,
  plate,
  category,
  capacity,
  driver,
  status,
  onClick,
}: {
  model: string;
  plate: string;
  category: string;
  capacity: number;
  driver?: string | null;
  status: string;
  onClick?: () => void;
}) {
  return (
    <Card onClick={onClick} className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">{model}</h4>
            <p className="text-xs font-mono font-bold text-teal-700">{plate}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Assigned Driver:</span>
          <span className="font-semibold text-gray-900">{driver || 'Unassigned'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Category:</span>
          <span className="font-semibold text-gray-900">{category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Capacity:</span>
          <span className="font-semibold text-gray-900">{capacity} Seats</span>
        </div>
      </div>
    </Card>
  );
}

export function TripCard({
  pickup,
  destination,
  time,
  passengers,
  status,
  driver,
  vehicle,
  onClick,
}: {
  pickup: string;
  destination: string;
  time: string;
  passengers: number;
  status: string;
  driver?: string;
  vehicle?: string;
  onClick?: () => void;
}) {
  return (
    <Card onClick={onClick} className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{time}</span>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="space-y-2 relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        <div className="relative">
          <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gray-900 ring-4 ring-white" />
          <div className="font-bold text-xs text-gray-900">{pickup}</div>
        </div>
        <div className="relative">
          <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
          <div className="font-bold text-xs text-gray-900">{destination}</div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span>{passengers} Guests</span>
        </div>
        {(driver || vehicle) && (
          <span className="text-[11px] text-gray-500 font-mono">
            {vehicle} &bull; {driver}
          </span>
        )}
      </div>
    </Card>
  );
}

export function EventCard({
  name,
  city,
  dates,
  code,
  guestCount,
  onClick,
}: {
  name: string;
  city: string;
  dates: string;
  code: string;
  guestCount?: number;
  onClick?: () => void;
}) {
  return (
    <Card onClick={onClick} className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
            {city}
          </span>
          <h3 className="font-bold text-base text-gray-900 mt-0.5">{name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{dates}</p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-gray-900 text-white font-mono font-bold text-xs">
          {code}
        </span>
      </div>

      {typeof guestCount === 'number' && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Registered Attendees</span>
          <span className="font-semibold text-gray-900">{guestCount} Guests</span>
        </div>
      )}
    </Card>
  );
}
