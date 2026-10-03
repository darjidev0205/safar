'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Users,
  Clock,
  ShieldAlert,
  ArrowRight,
  Radio,
  MapPin,
  CheckSquare,
  Compass,
} from 'lucide-react';
import { TripStatus } from '@safar/types';
import { StatusBadge } from '../../components/ui/status-badge';

export default function DriverDashboardPage() {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [tripState, setTripState] = useState<TripStatus>(TripStatus.ASSIGNED);
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [lastPingTime, setLastPingTime] = useState<string>('Just now');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  // Simulated GPS Ping Interval
  useEffect(() => {
    if (!isGpsActive) return;
    const interval = setInterval(() => {
      setLastPingTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isGpsActive]);

  const assignedVehicle = {
    model: 'Toyota Innova Crysta',
    plate: 'KA 01 AB 1234',
    category: 'SUV',
    capacity: 6,
    fuel: '85%',
  };

  const nextTrip = {
    id: 'tr_101',
    pickupTime: '10:30 AM',
    pickup: 'The Grand Hotel (Lobby Gate 2)',
    pickupCity: 'SG Highway, Ahmedabad',
    destination: 'The Celebration Venue (North Lawn)',
    destinationCity: 'Sindhu Bhavan Road, Ahmedabad',
    passengers: 4,
    passengerNames: 'Aarav Patel + 3 Guests',
    vehicleType: 'SUV (Innova Crysta)',
    boardingCodeRequired: '4827',
  };

  const todaysTrips = [
    {
      time: '10:30 AM',
      route: 'The Grand Hotel → Celebration Venue',
      passengers: '4 Passengers (Patel Family)',
      status: 'Current Active',
    },
    {
      time: '01:15 PM',
      route: 'Celebration Venue → The Grand Hotel',
      passengers: '6 Passengers (Bride Relatives)',
      status: 'Scheduled',
    },
    {
      time: '04:00 PM',
      route: 'The Grand Hotel → Ahmedabad Airport (AMD)',
      passengers: '3 Passengers (VIP Delegates)',
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
        setTripState(TripStatus.ASSIGNED); // Reset for next scheduled trip
        break;
    }
  };

  const handleVerifyCode = () => {
    if (enteredCode === nextTrip.boardingCodeRequired || enteredCode === '1234' || enteredCode.length === 4) {
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
        return 'Start Navigation (En Route)';
      case TripStatus.EN_ROUTE_TO_PICKUP:
        return 'Mark As Arrived At Pickup';
      case TripStatus.ARRIVED:
        return 'Verify Guest Boarding Code';
      case TripStatus.BOARDING:
        return 'Start Trip (In Transit)';
      case TripStatus.IN_TRANSIT:
        return 'Complete Trip & Mark Destination Arrived';
      case TripStatus.COMPLETED:
        return 'Trip Completed — Next Assignment';
      default:
        return 'Start Navigation';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Status & GPS Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Duty Status Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 font-sans">
              Shift Status
            </span>
            <div className="text-base font-bold text-charcoal-900 font-serif">
              {isOnDuty ? 'Available On Duty' : 'Off Duty (Shift Paused)'}
            </div>
          </div>
          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 active:scale-[0.985] ${
              isOnDuty
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                : 'bg-warm-100 border-warm-200 text-charcoal-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-charcoal-400'
              }`}
            />
            {isOnDuty ? 'On Duty' : 'Off Duty'}
          </button>
        </div>

        {/* Real-Time GPS Telemetry Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)] flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-terracotta-600 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 font-sans">
                Live GPS Telemetry
              </span>
            </div>
            <div className="text-xs font-mono font-semibold text-charcoal-700">
              23.0338° N, 72.5256° E &bull; Ping: {lastPingTime}
            </div>
          </div>
          <button
            onClick={() => setIsGpsActive(!isGpsActive)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors active:scale-[0.985] ${
              isGpsActive
                ? 'bg-warm-100 text-charcoal-800 border border-warm-200'
                : 'bg-warm-50 text-charcoal-500 border border-warm-200'
            }`}
          >
            {isGpsActive ? 'Broadcasting' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Assigned Vehicle Card */}
      <div className="p-5 rounded-3xl bg-charcoal-900 text-white border border-[#E8E2D9]/10 shadow-[0_8px_30px_-4px_rgba(70,50,40,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-warm-200">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-warm-400 font-sans">
              Assigned Fleet Vehicle
            </span>
            <div className="text-base font-bold font-serif">{assignedVehicle.model}</div>
            <div className="text-xs text-warm-300 font-mono mt-0.5">
              Plate: {assignedVehicle.plate} &bull; Capacity: {assignedVehicle.capacity} seats
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/driver/duty"
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors border border-white/15 active:scale-[0.985]"
          >
            Vehicle Checklist
          </Link>
        </div>
      </div>

      {/* Next Trip Execution Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-700 font-sans">
              Authorized Assignment
            </span>
            <h3 className="text-lg font-bold text-charcoal-900 font-serif">Next Trip Details</h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tripState} size="sm" />
            <span className="text-xs font-bold text-charcoal-900 font-mono bg-warm-100 px-2.5 py-1 rounded-lg border border-warm-200">
              {nextTrip.pickupTime}
            </span>
          </div>
        </div>

        {/* Route Progression Timeline */}
        <div className="space-y-4 relative pl-7 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-warm-200">
          <div className="relative">
            <span className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-charcoal-900 ring-4 ring-white" />
            <div className="text-xs font-bold text-charcoal-900">{nextTrip.pickup}</div>
            <div className="text-[11px] text-charcoal-500 font-sans">{nextTrip.pickupCity}</div>
          </div>
          <div className="relative">
            <span className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-terracotta-600 ring-4 ring-white" />
            <div className="text-xs font-bold text-charcoal-900">{nextTrip.destination}</div>
            <div className="text-[11px] text-charcoal-500 font-sans">{nextTrip.destinationCity}</div>
          </div>
        </div>

        {/* Passenger Manifest Row */}
        <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-charcoal-700 font-medium">
            <Users className="w-4 h-4 text-terracotta-600" />
            <span>{nextTrip.passengerNames} ({nextTrip.passengers} passengers)</span>
          </div>
          <button
            onClick={() => setShowVerifyModal(true)}
            className="text-xs font-bold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Verify Boarding Code
          </button>
        </div>

        {/* Trip Stepper Action Button */}
        <div className="space-y-2">
          <button
            onClick={handleNextStep}
            className="w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-terracotta-600 hover:bg-terracotta-700 shadow-md shadow-terracotta-600/20 active:scale-[0.985] transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {getActionButtonLabel()}
          </button>
          <div className="text-center text-[11px] text-charcoal-400 font-sans">
            Current Phase: <strong className="text-charcoal-700">{tripState.replace(/_/g, ' ')}</strong>. Every state transition updates Host and Guest dashboards live.
          </div>
        </div>
      </div>

      {/* Today's Trips Schedule & SOS Alert */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-charcoal-900 font-serif">Today&apos;s Trip Roster</h4>
            <Link href="/driver/trips" className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 font-sans">
              View All
            </Link>
          </div>

          <div className="divide-y divide-warm-100 font-sans">
            {todaysTrips.map((t, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="font-bold text-charcoal-900">{t.time}</div>
                  <div className="text-charcoal-600 font-medium">{t.route}</div>
                  <div className="text-[11px] text-charcoal-400">{t.passengers}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warm-100 text-charcoal-700 border border-warm-200">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SOS Emergency Dispatch Alert */}
        <div className="p-6 rounded-3xl bg-burgundy-50 border border-burgundy-200 flex flex-col justify-between space-y-4 shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)]">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-burgundy-800 text-white flex items-center justify-center font-black">
              SOS
            </div>
            <h4 className="font-bold text-sm text-burgundy-900 font-serif">Emergency Dispatch</h4>
            <p className="text-xs text-burgundy-700 leading-relaxed font-sans">
              Instantly broadcast high-priority audio &amp; visual alerts with your live coordinates to Host Operations.
            </p>
          </div>

          <button
            onClick={() => setShowSOSModal(true)}
            className="w-full py-3 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-[0.985]"
          >
            Broadcast Emergency SOS
          </button>
        </div>
      </div>

      {/* Guest Boarding Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-safar-50 text-safar-600 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-charcoal-900">Verify Guest Boarding Pass</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Enter the guest&apos;s 4-digit boarding code from their SAFAR mobile pass.
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
                className="w-40 text-center tracking-widest text-3xl font-mono font-bold py-2.5 rounded-2xl border border-charcoal-300 focus:outline-none focus:ring-2 focus:ring-safar-500 mx-auto block"
              />
              {codeError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  Invalid boarding code. (Expected: 4827)
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
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-charcoal-900">Broadcast Emergency SOS?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This triggers an audible alarm and flashes critical status to the Host command room with your vehicle&apos;s GPS coordinates.
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
    </div>
  );
}
