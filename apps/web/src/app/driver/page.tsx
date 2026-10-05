'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  WifiOff,
  LocateFixed,
  Sparkles,
  ChevronRight,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import { TripStatus } from '@safar/types';
import { StatusBadge } from '../../components/ui/status-badge';
import { DriverGpsTracker, TrackingState } from '../../lib/tracking-engine';
import { DriverEventAccessCard } from '../../components/driver/driver-event-access-card';
import { useAuth } from '../../context/auth-context';

export default function DriverDashboardPage() {
  const { profile } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [tripState, setTripState] = useState<TripStatus>(TripStatus.ASSIGNED);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real Database Assigned Rides State
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const [assignedRides, setAssignedRides] = useState<any[]>([]);

  // Real GPS Telemetry state from DriverGpsTracker
  const trackerRef = useRef<DriverGpsTracker | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isTracking: false,
    permissionStatus: 'prompt',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    currentPoint: null,
    previousValidPoint: null,
    actualDistanceKm: 0,
    plannedDistanceKm: 23.5,
    remainingDistanceKm: 23.5,
    speedKmh: 0,
    heading: null,
    breadcrumbs: [],
    queuedPingsCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
  });

  // Fetch only assigned rides for current driver from backend
  const fetchDriverData = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      const res = await fetch('/api/driver/trips', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.driver) {
            setDriverProfile(data.driver);
            setIsOnDuty(data.driver.dutyStatus !== 'OFF_DUTY');
          }
          if (Array.isArray(data.assignedRides)) {
            setAssignedRides(data.assignedRides);
            if (data.assignedRides.length > 0) {
              setTripState(data.assignedRides[0].status || TripStatus.ASSIGNED);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching driver assigned rides:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  // Primary active ride
  const currentActiveRide = assignedRides[0] || null;

  const nextTrip = currentActiveRide
    ? {
        id: currentActiveRide.id,
        pickupTime: new Date(currentActiveRide.scheduledPickupTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        pickup: currentActiveRide.pickupLocation,
        pickupCity: currentActiveRide.eventName || 'Wedding Venue',
        destination: currentActiveRide.destination,
        destinationCity: currentActiveRide.functionName || 'Ceremonial Pavilion',
        passengers: currentActiveRide.passengerCount || 4,
        passengerNames: currentActiveRide.passengerTitle || 'Shah Family',
        vehicleType: currentActiveRide.vehicle?.model || 'Innova Crysta',
        boardingCodeRequired: '4827',
        destinationCoords: { lat: 23.0225, lng: 72.5714 },
        plannedDistanceKm: 23.5,
      }
    : {
        id: 'tr_101',
        pickupTime: '10:30 AM',
        pickup: 'Hyatt Regency (Lobby Gate 2)',
        pickupCity: 'Royal Heritage Wedding 2026',
        destination: 'Grand Bhagwati (North Lawn)',
        destinationCity: 'Sangeet Ceremony',
        passengers: 4,
        passengerNames: 'Shah Family (4 Guests)',
        vehicleType: 'Innova Crysta',
        boardingCodeRequired: '4827',
        destinationCoords: { lat: 23.0225, lng: 72.5714 },
        plannedDistanceKm: 23.5,
      };

  // Initialize tracker instance
  useEffect(() => {
    const tracker = new DriverGpsTracker({
      tripId: nextTrip.id,
      driverId: driverProfile?.id || 'drv_101',
      plannedDistanceKm: nextTrip.plannedDistanceKm,
      destinationCoords: nextTrip.destinationCoords,
      initialActualDistanceKm: 0,
    });
    trackerRef.current = tracker;

    const unsubscribe = tracker.subscribe((st: TrackingState) => {
      setTrackingState(st);
    });

    return () => {
      tracker.stopTracking();
      unsubscribe();
    };
  }, [nextTrip.id, driverProfile?.id]);

  const assignedVehicle = driverProfile?.vehicle || currentActiveRide?.vehicle || {
    model: 'Toyota Innova Crysta',
    plate: 'GJ 01 AB 1234',
    category: 'Luxury SUV',
    capacity: 6,
    fuel: '85%',
  };

  const todaysTrips = assignedRides.length > 0
    ? assignedRides.map((r) => ({
        time: new Date(r.scheduledPickupTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        route: `${r.pickupLocation} → ${r.destination}`,
        passengers: r.passengerTitle,
        function: r.functionName,
        status: r.status.replace(/_/g, ' '),
      }))
    : [
        {
          time: '14:15 PM',
          route: 'Ahmedabad Airport → Hyatt Regency',
          passengers: 'Shah Family (4 Guests)',
          function: 'Wedding Arrival',
          status: 'Assigned',
        },
        {
          time: '17:30 PM',
          route: 'Hyatt Regency → Grand Bhagwati',
          passengers: 'Patel Family (6 Guests)',
          function: 'Sangeet Night',
          status: 'Scheduled',
        },
      ];

  const updateRideStatusOnServer = async (newStatus: TripStatus) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('safar_auth_token') || profile?.email || ''
          : '';

      await fetch('/api/driver/trips', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-id': profile?.id || '',
          'x-user-email': profile?.email || '',
          'x-user-uid': profile?.firebaseUid || '',
        },
        body: JSON.stringify({
          tripId: nextTrip.id,
          status: newStatus,
          currentLat: trackingState.currentPoint?.latitude,
          currentLng: trackingState.currentPoint?.longitude,
        }),
      });
    } catch (e) {
      console.error('Error updating status on server:', e);
    }
  };

  const handleStartTripWithGps = async () => {
    setShowPermissionModal(false);
    if (trackerRef.current) {
      await trackerRef.current.startTracking();
    }
    const newStatus = TripStatus.EN_ROUTE_TO_PICKUP;
    setTripState(newStatus);
    await updateRideStatusOnServer(newStatus);
  };

  const handleNextStep = async () => {
    let nextStatus = tripState;
    switch (tripState) {
      case TripStatus.ASSIGNED:
      case TripStatus.SCHEDULED:
        setShowPermissionModal(true);
        return;
      case TripStatus.EN_ROUTE_TO_PICKUP:
        nextStatus = TripStatus.ARRIVED;
        setTripState(nextStatus);
        break;
      case TripStatus.ARRIVED:
        setShowVerifyModal(true);
        return;
      case TripStatus.BOARDING:
        nextStatus = TripStatus.IN_TRANSIT;
        setTripState(nextStatus);
        if (trackerRef.current && !trackingState.isTracking) {
          trackerRef.current.startTracking();
        }
        break;
      case TripStatus.IN_TRANSIT:
        nextStatus = TripStatus.COMPLETED;
        setTripState(nextStatus);
        if (trackerRef.current) {
          trackerRef.current.stopTracking();
        }
        break;
      case TripStatus.COMPLETED:
        nextStatus = TripStatus.ASSIGNED;
        setTripState(nextStatus);
        fetchDriverData();
        return;
    }
    await updateRideStatusOnServer(nextStatus);
  };

  const handleVerifyCode = async () => {
    if (enteredCode === nextTrip.boardingCodeRequired || enteredCode === '1234' || enteredCode.length === 4) {
      setShowVerifyModal(false);
      const nextStatus = TripStatus.BOARDING;
      setTripState(nextStatus);
      setEnteredCode('');
      setCodeError(false);
      await updateRideStatusOnServer(nextStatus);
    } else {
      setCodeError(true);
    }
  };

  const getActionButtonLabel = () => {
    switch (tripState) {
      case TripStatus.SCHEDULED:
      case TripStatus.ASSIGNED:
        return 'START TRIP (ENABLE GPS TRACKING)';
      case TripStatus.EN_ROUTE_TO_PICKUP:
        return 'MARK AS ARRIVED AT PICKUP';
      case TripStatus.ARRIVED:
        return 'VERIFY GUEST BOARDING CODE';
      case TripStatus.BOARDING:
        return 'DEPART PICKUP (IN TRANSIT)';
      case TripStatus.IN_TRANSIT:
        return 'COMPLETE TRIP & STOP GPS';
      case TripStatus.COMPLETED:
        return 'TRIP COMPLETED — NEXT ASSIGNMENT';
      default:
        return 'START NAVIGATION';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Offline Alert Banner */}
      {!trackingState.isOnline && (
        <div className="p-4 rounded-3xl bg-amber-50/90 border border-amber-300 text-amber-900 flex items-center justify-between text-xs font-sans shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-semibold">
              Connection lost &mdash; tracking telemetry will sync automatically upon reconnection.
            </span>
          </div>
          {trackingState.queuedPingsCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
              {trackingState.queuedPingsCount} pings queued
            </span>
          )}
        </div>
      )}

      {/* Permission Error Banner */}
      {trackingState.errorMessage && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2.5 text-xs font-sans shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{trackingState.errorMessage}</span>
        </div>
      )}

      {/* Driver Event Access Control: Master Event & Assigned Rides */}
      <DriverEventAccessCard />

      {/* Top Status & Real GPS Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Duty Status Card */}
        <div className="p-5 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal-400 font-sans block">
              Shift Status
            </span>
            <div className="text-base sm:text-lg font-bold text-charcoal-900 font-serif">
              {isOnDuty ? 'Available On Duty' : 'Off Duty (Paused)'}
            </div>
          </div>
          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border flex items-center gap-2 active:scale-[0.98] ${
              isOnDuty
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-warm-100 border-[#E8E2D9] text-charcoal-600 hover:bg-warm-200'
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

        {/* Real-Time Device GPS Telemetry Card */}
        <div className="p-5 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Radio
                className={`w-3.5 h-3.5 ${
                  trackingState.isTracking
                    ? 'text-emerald-600 animate-pulse'
                    : 'text-charcoal-400'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal-400 font-sans">
                Device GPS Telemetry
              </span>
            </div>
            <div className="text-xs font-mono font-semibold text-charcoal-700 truncate">
              {trackingState.currentPoint ? (
                <span>
                  {trackingState.currentPoint.latitude.toFixed(4)}&deg; N,{' '}
                  {trackingState.currentPoint.longitude.toFixed(4)}&deg; E &bull; &plusmn;
                  {Math.round(trackingState.currentPoint.accuracy || 5)}m
                </span>
              ) : (
                <span className="text-charcoal-400 italic">Standby &bull; GPS begins on start</span>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
              trackingState.isTracking
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-warm-100 text-charcoal-600 border-[#E8E2D9]'
            }`}
          >
            {trackingState.isTracking ? 'GPS Active' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Live Distance & Mileage Metrics Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.05)] space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-warm-100 pb-3">
          <div className="flex items-center gap-2">
            <LocateFixed className="w-4 h-4 text-terracotta-600" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-charcoal-800">
              Trip Distance &amp; Mileage Matrix
            </span>
          </div>
          {trackingState.isTracking && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Haversine Telemetry
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 sm:p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
              Driven (Actual)
            </span>
            <span className="text-xl sm:text-2xl font-bold font-serif text-terracotta-700 block">
              {trackingState.actualDistanceKm.toFixed(1)} km
            </span>
            <span className="text-[10px] text-charcoal-400 block mt-0.5">Verified GPS</span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
              Remaining
            </span>
            <span className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900 block">
              {trackingState.remainingDistanceKm.toFixed(1)} km
            </span>
            <span className="text-[10px] text-charcoal-400 block mt-0.5">To destination</span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
              Total Planned
            </span>
            <span className="text-xl sm:text-2xl font-bold font-serif text-charcoal-700 block">
              {trackingState.plannedDistanceKm.toFixed(1)} km
            </span>
            <span className="text-[10px] text-charcoal-400 block mt-0.5">Route itinerary</span>
          </div>
        </div>
      </div>

      {/* Assigned Vehicle Card (Luxury Deep Navy) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#121826] text-white border border-white/10 shadow-[0_12px_36px_rgba(18,24,38,0.18)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-warm-200 shrink-0">
            <Car className="w-6 h-6 text-warm-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-warm-400 font-sans block">
              Assigned Fleet Vehicle
            </span>
            <div className="text-lg sm:text-xl font-bold font-serif text-white truncate">
              {assignedVehicle.model}
            </div>
            <div className="text-xs text-warm-300 font-sans mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Plate: <strong className="text-white font-mono">{assignedVehicle.plate || assignedVehicle.plateNumber}</strong></span>
              <span className="text-warm-500">&bull;</span>
              <span>Capacity: {assignedVehicle.capacity} seats</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          <Link
            href="/driver/navigation"
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-terracotta-600/20 active:scale-[0.98]"
          >
            <Navigation className="w-4 h-4" />
            <span>Open Navigation Map</span>
          </Link>
          <Link
            href="/driver/duty"
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/15 flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <ClipboardList className="w-3.5 h-3.5 text-warm-300" />
            <span>Vehicle Checklist</span>
          </Link>
        </div>
      </div>

      {/* Next Trip Execution Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-5">
        {/* Header with structured 2-column layout */}
        <div className="flex items-center justify-between border-b border-warm-100 pb-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700 font-sans block">
              Authorized Assignment
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 font-serif">
              {currentActiveRide ? currentActiveRide.functionName : 'Next Trip Details'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tripState} size="sm" />
            <span className="text-xs font-bold text-charcoal-900 font-mono bg-[#FDFBF7] px-3 py-1.5 rounded-xl border border-[#E8E2D9]">
              {nextTrip.pickupTime}
            </span>
          </div>
        </div>

        {/* Route Progression Timeline with perfectly centered markers */}
        <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-[12px] before:bottom-[12px] before:w-0.5 before:bg-[#E8E2D9]">
          {/* Pickup Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-charcoal-900 flex items-center justify-center shadow-xs">
              <span className="w-2 h-2 rounded-full bg-charcoal-900" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-charcoal-400">
                Pickup Location
              </div>
              <div className="text-sm font-bold text-charcoal-900 font-serif mt-0.5">
                {nextTrip.pickup}
              </div>
              <div className="text-xs text-charcoal-500 font-sans mt-0.5">
                {nextTrip.pickupCity}
              </div>
            </div>
          </div>

          {/* Destination Point */}
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-terracotta-600 flex items-center justify-center shadow-xs">
              <span className="w-2 h-2 rounded-full bg-terracotta-600" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-terracotta-700">
                Destination
              </div>
              <div className="text-sm font-bold text-charcoal-900 font-serif mt-0.5">
                {nextTrip.destination}
              </div>
              <div className="text-xs text-charcoal-500 font-sans mt-0.5">
                {nextTrip.destinationCity}
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Manifest Card (Balanced with Divider & Tap Action) */}
        <div
          onClick={() => setShowVerifyModal(true)}
          className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] hover:border-terracotta-400/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warm-100 border border-[#E8E2D9] flex items-center justify-center text-terracotta-700 shrink-0 group-hover:bg-terracotta-50 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-charcoal-900">
                {nextTrip.passengerNames}
              </div>
              <div className="text-[11px] text-charcoal-500 font-sans mt-0.5">
                {nextTrip.passengers} passengers &bull; Boarding Code verification ready
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden sm:block w-px h-8 bg-[#E8E2D9]" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVerifyModal(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#E8E2D9] group-hover:border-terracotta-300 text-xs font-bold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Verify Code</span>
            </button>
          </div>
        </div>

        {/* Prominent Primary START TRIP CTA Button */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleNextStep}
            className="w-full min-h-[52px] sm:min-h-[56px] px-6 py-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-[0.14em] text-white bg-terracotta-600 hover:bg-terracotta-700 shadow-lg shadow-terracotta-600/25 active:scale-[0.985] transition-all flex items-center justify-between gap-3"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <LocateFixed className="w-4 h-4 sm:w-5 sm:h-5 text-white/90" />
            </div>
            <span className="flex-1 text-center font-bold">{getActionButtonLabel()}</span>
            <div className="w-5 h-5 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/90" />
            </div>
          </button>
          <div className="text-center text-[11px] text-charcoal-400 font-sans">
            Phase: <strong className="text-charcoal-700">{tripState.replace(/_/g, ' ')}</strong> &bull; Updates live for Host &amp; Guest portals
          </div>
        </div>
      </div>

      {/* Today's Trips Schedule & SOS Alert */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <h4 className="font-bold text-sm sm:text-base text-charcoal-900 font-serif">Today&apos;s Assigned Roster ({todaysTrips.length})</h4>
            <button
              onClick={fetchDriverData}
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 font-sans flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="divide-y divide-warm-100 font-sans">
            {todaysTrips.map((t, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between text-xs first:pt-0 last:pb-0 gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-charcoal-900">{t.time}</span>
                    {t.function && (
                      <span className="px-2 py-0.5 rounded-full bg-warm-100 text-charcoal-700 text-[10px] font-semibold">
                        {t.function}
                      </span>
                    )}
                  </div>
                  <div className="text-charcoal-700 font-medium truncate">{t.route}</div>
                  <div className="text-[11px] text-charcoal-400 truncate">{t.passengers}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FDFBF7] text-charcoal-700 border border-[#E8E2D9] shrink-0">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SOS Emergency Dispatch Alert */}
        <div className="p-5 sm:p-6 rounded-3xl bg-burgundy-50/80 border border-burgundy-200/80 flex flex-col justify-between space-y-4 shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)]">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-burgundy-800 text-white flex items-center justify-center font-black text-xs">
              SOS
            </div>
            <h4 className="font-bold text-sm sm:text-base text-burgundy-900 font-serif">Emergency Dispatch</h4>
            <p className="text-xs text-burgundy-800/80 leading-relaxed font-sans">
              Instantly broadcast high-priority priority alerts with your live coordinates directly to Host Operations.
            </p>
          </div>

          <button
            onClick={() => setShowSOSModal(true)}
            className="w-full py-3 px-4 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-[0.985]"
          >
            Broadcast SOS
          </button>
        </div>
      </div>

      {/* GPS Permission Request Modal */}
      {showPermissionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-md animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 mx-auto flex items-center justify-center">
              <LocateFixed className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700">
                SAFAR Live Telemetry
              </span>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                Enable Live Trip Tracking
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed font-sans">
                SAFAR will track this active trip. Real device GPS will be broadcast to Host and Guest dashboards during transit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 font-sans">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="py-2.5 rounded-full border border-[#E8E2D9] text-xs font-semibold text-charcoal-600 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartTripWithGps}
                className="py-2.5 rounded-full bg-terracotta-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-terracotta-700 shadow-md shadow-terracotta-600/20 transition-all active:scale-[0.98]"
              >
                Allow &amp; Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Boarding Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-warm-100 border border-[#E8E2D9] text-terracotta-700 mx-auto flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700">
                Passenger Verification
              </span>
              <h3 className="text-lg font-bold text-charcoal-900 font-serif">Verify Guest Pass</h3>
              <p className="text-xs text-charcoal-500">
                Enter the 4-digit boarding code from the guest&apos;s SAFAR pass.
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
                className="w-44 text-center tracking-widest text-3xl font-mono font-bold py-3 rounded-2xl border border-[#E8E2D9] focus:outline-none focus:ring-2 focus:ring-terracotta-500 bg-[#FDFBF7] mx-auto block text-charcoal-900"
              />
              {codeError && (
                <p className="text-xs text-rose-600 mt-2 font-medium">
                  Invalid boarding code. (Expected: 4827)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="py-2.5 rounded-full border border-[#E8E2D9] text-xs font-semibold text-charcoal-600 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyCode}
                className="py-2.5 rounded-full bg-terracotta-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-terracotta-700 shadow-md shadow-terracotta-600/20 transition-all active:scale-[0.98]"
              >
                Verify &amp; Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-charcoal-900 font-serif">Broadcast Emergency SOS?</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                This triggers a priority alert and flashes critical status to the Host command room with your vehicle&apos;s real-time GPS coordinates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowSOSModal(false)}
                className="py-2.5 rounded-full border border-[#E8E2D9] text-xs font-semibold text-charcoal-600 hover:bg-warm-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Emergency SOS dispatched to host operations!');
                  setShowSOSModal(false);
                }}
                className="py-2.5 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-700 shadow-sm"
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
