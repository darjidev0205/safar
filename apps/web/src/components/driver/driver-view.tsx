'use client';

import React, { useState } from 'react';
import {
  Car,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Users,
  Clock,
  ShieldAlert,
  Home,
  Route,
  Map as MapIcon,
  User,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { TripStatus, DutyStatus } from '@safar/types';
import { StatusBadge } from '../ui/status-badge';

export function DriverView() {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'trips' | 'map' | 'profile'>('home');
  const [tripState, setTripState] = useState<TripStatus>(TripStatus.ASSIGNED);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  const driverProfile = {
    name: 'Rajesh Kumar',
    vehicle: 'Toyota Innova Crysta',
    plate: 'KA 01 AB 1234',
    rating: '4.95',
  };

  const nextTrip = {
    id: 'tr_101',
    pickupTime: '10:30 AM',
    pickup: 'The Grand Hotel',
    pickupCity: 'Ahmedabad',
    destination: 'The Celebration Venue',
    destinationCity: 'Ahmedabad',
    passengers: 4,
    vehicleType: 'Sedan',
    boardingCodeRequired: '4827',
  };

  const todaysTrips = [
    {
      time: '10:30 AM',
      route: 'Hotel → Venue',
      passengers: '4 Passengers',
      status: 'Upcoming',
    },
    {
      time: '12:30 PM',
      route: 'Venue → Hotel',
      passengers: '6 Passengers',
      status: 'Scheduled',
    },
    {
      time: '03:00 PM',
      route: 'Hotel → Venue',
      passengers: '5 Passengers',
      status: 'Scheduled',
    },
  ];

  const handleNextStep = () => {
    switch (tripState) {
      case TripStatus.ASSIGNED:
        setTripState(TripStatus.EN_ROUTE_TO_PICKUP);
        break;
      case TripStatus.EN_ROUTE_TO_PICKUP:
        setTripState(TripStatus.ARRIVED);
        break;
      case TripStatus.ARRIVED:
        setShowVerifyModal(true);
        break;
      case TripStatus.BOARDING:
        setTripState(TripStatus.IN_TRANSIT);
        break;
      case TripStatus.IN_TRANSIT:
        setTripState(TripStatus.COMPLETED);
        break;
      case TripStatus.COMPLETED:
        setTripState(TripStatus.ASSIGNED); // Reset for next run
        break;
    }
  };

  const handleVerifyCode = () => {
    if (enteredCode === nextTrip.boardingCodeRequired || enteredCode === '1234') {
      setShowVerifyModal(false);
      setTripState(TripStatus.BOARDING);
      setEnteredCode('');
      setCodeError(false);
    } else {
      setCodeError(true);
    }
  };

  const getActionButtonLabel = () => {
    switch (tripState) {
      case TripStatus.ASSIGNED:
        return 'Start Navigation';
      case TripStatus.EN_ROUTE_TO_PICKUP:
        return 'Mark As Arrived';
      case TripStatus.ARRIVED:
        return 'Verify Guest Boarding Code';
      case TripStatus.BOARDING:
        return 'Start Trip (In Transit)';
      case TripStatus.IN_TRANSIT:
        return 'Complete Trip';
      case TripStatus.COMPLETED:
        return 'Trip Completed — Next Trip';
      default:
        return 'Start Navigation';
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50 flex flex-col border-x border-charcoal-200/80 shadow-lg relative pb-20">
      {/* Top Driver Header matching Reference Image */}
      <header className="p-5 bg-charcoal-900 text-white rounded-b-3xl space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-safar-100 border-2 border-safar-400 overflow-hidden flex items-center justify-center text-charcoal-900 font-bold">
              RK
            </div>
            <div>
              <div className="text-[11px] text-charcoal-300 font-medium">Good morning,</div>
              <div className="text-base font-bold text-white font-sans">{driverProfile.name}</div>
            </div>
          </div>

          {/* On Duty Toggle Button */}
          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isOnDuty
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-charcoal-800 border-charcoal-700 text-charcoal-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-charcoal-500'
              }`}
            />
            {isOnDuty ? 'On Duty' : 'Off Duty'}
          </button>
        </div>

        {/* Assigned Vehicle Card */}
        <div className="p-3 rounded-2xl bg-charcoal-800/80 border border-charcoal-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Car className="w-4 h-4 text-safar-400" />
            <div>
              <span className="font-bold text-white">{driverProfile.vehicle}</span>
              <span className="text-charcoal-400 ml-2 font-mono">{driverProfile.plate}</span>
            </div>
          </div>
          <Navigation className="w-4 h-4 text-charcoal-400" />
        </div>
      </header>

      {/* Main Execution Area */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto">
        {/* Next Trip Card */}
        <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-charcoal-900">Next Trip</h3>
            <span className="text-xs font-semibold text-charcoal-500">
              {nextTrip.pickupTime}
            </span>
          </div>

          {/* Route Progression Timeline */}
          <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
            <div className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-charcoal-900 ring-4 ring-white" />
              <div className="font-bold text-xs text-charcoal-900">{nextTrip.pickup}</div>
              <div className="text-[11px] text-charcoal-500">{nextTrip.pickupCity}</div>
            </div>
            <div className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-safar-600 ring-4 ring-white" />
              <div className="font-bold text-xs text-charcoal-900">{nextTrip.destination}</div>
              <div className="text-[11px] text-charcoal-500">{nextTrip.destinationCity}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-charcoal-100 text-xs text-charcoal-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-charcoal-500" />
              {nextTrip.passengers} Passengers
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Car className="w-3.5 h-3.5 text-charcoal-500" />
              {nextTrip.vehicleType}
            </div>
          </div>

          {/* Trip Status Indicator */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-charcoal-500">Current Phase:</span>
            <StatusBadge status={tripState} size="sm" />
          </div>

          {/* Large Action CTA Button matching Reference Image */}
          <button
            onClick={handleNextStep}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-safar-600 hover:bg-safar-700 shadow-md shadow-safar-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {getActionButtonLabel()}
          </button>
        </div>

        {/* Today's Trips List */}
        <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-charcoal-900">Today&apos;s Trips</h3>
            <span className="text-xs font-semibold text-safar-700">View All</span>
          </div>

          <div className="divide-y divide-charcoal-100">
            {todaysTrips.map((t, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="font-bold text-charcoal-900">{t.time}</div>
                  <div className="text-charcoal-600 font-medium">{t.route}</div>
                  <div className="text-[11px] text-charcoal-400">{t.passengers}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-charcoal-100 text-charcoal-700">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SOS Emergency Button matching Reference Image */}
        <button
          onClick={() => setShowSOSModal(true)}
          className="w-full py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] tracking-wider">
            SOS
          </span>
          Emergency Dispatch Alert
        </button>
      </div>

      {/* Guest Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-safar-50 text-safar-600 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-charcoal-900">Verify Guest Boarding</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Enter the guest&apos;s 4-digit boarding code or scan their QR pass.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={4}
                value={enteredCode}
                onChange={(e) => {
                  setEnteredCode(e.target.value);
                  setCodeError(false);
                }}
                placeholder="4827"
                className="w-40 text-center tracking-widest text-2xl font-mono font-bold py-2.5 rounded-xl border border-charcoal-300 focus:outline-none focus:ring-2 focus:ring-safar-500 mx-auto block"
              />
              {codeError && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  Invalid code. (Expected: 4827 or 1234)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600 hover:bg-charcoal-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyCode}
                className="py-2.5 rounded-xl bg-safar-600 text-white text-xs font-semibold hover:bg-safar-700 shadow-sm"
              >
                Verify &amp; Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-charcoal-900">Broadcast Emergency SOS?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This will immediately broadcast high-priority audio &amp; visual alerts to the Event Host and Dispatch control room with your live coordinates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowSOSModal(false)}
                className="py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Emergency SOS dispatched to host operations!');
                  setShowSOSModal(false);
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm"
              >
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Bottom Tabs */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-charcoal-200 px-6 py-2.5 flex items-center justify-between z-40">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'trips', label: 'My Trips', icon: Route },
          { id: 'map', label: 'Map', icon: MapIcon },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-safar-600 font-bold' : 'text-charcoal-400 hover:text-charcoal-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
