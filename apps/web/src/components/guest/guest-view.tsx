'use client';

import React, { useState } from 'react';
import {
  Car,
  Calendar,
  Info,
  LifeBuoy,
  Copy,
  Clock,
  MapPin,
  CheckCircle2,
  QrCode,
  ArrowRight,
  Home,
  Bookmark,
  User,
  Bell,
  Search,
} from 'lucide-react';
import { SafarLogo } from '../ui/safar-logo';
import { StatusBadge } from '../ui/status-badge';
import { EventModel, VehicleCategory, BookingModel } from '@safar/types';
import { apiClient } from '../../lib/api';

interface GuestViewProps {
  event: EventModel | null;
  onJoinAnotherEvent?: () => void;
}

export function GuestView({ event, onJoinAnotherEvent }: GuestViewProps) {
  const [currentTab, setCurrentTab] = useState<'home' | 'book' | 'my-rides' | 'profile'>('home');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBoardingPass, setShowBoardingPass] = useState(false);

  // Active simulated / fetched ride
  const [activeBooking, setActiveBooking] = useState({
    id: 'bk_1',
    time: 'Today • 10:30 AM',
    pickup: 'The Grand Hotel',
    destination: 'The Celebration Venue',
    category: 'Sedan',
    seats: 4,
    status: 'ON_TIME',
    duration: '6 min',
    distance: '1.8 km',
    boardingCode: '4827',
  });

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    pickup: 'The Grand Hotel',
    destination: 'The Celebration Venue',
    category: VehicleCategory.SEDAN,
    passengers: 2,
    time: '12:30 PM',
  });

  const eventCode = event?.joinCode || '';
  const eventName = event?.name || 'Active Event';
  const eventLocation = event?.city || '';
  const eventDates = event?.startDate ? `${new Date(event.startDate).toLocaleDateString()} – ${new Date(event.endDate).toLocaleDateString()}` : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(eventCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConfirmBooking = () => {
    // Generate 4-digit code
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setActiveBooking({
      id: `bk_${Date.now()}`,
      time: `Today • ${bookingForm.time}`,
      pickup: bookingForm.pickup,
      destination: bookingForm.destination,
      category: bookingForm.category,
      seats: bookingForm.category === 'SUV' ? 6 : bookingForm.category === 'TEMPO_TRAVELLER' ? 16 : 4,
      status: 'ON_TIME',
      duration: '12 min',
      distance: '4.2 km',
      boardingCode: newCode,
    });
    setShowBookingModal(false);
    setShowBoardingPass(true);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50 flex flex-col border-x border-charcoal-200/80 shadow-lg relative pb-20">
      {/* Top Mobile Bar */}
      <header className="px-5 py-4 bg-white border-b border-charcoal-100 flex items-center justify-between sticky top-0 z-30">
        <SafarLogo size="sm" />
        <div className="flex items-center gap-2">
          <button className="p-2 text-charcoal-500 hover:text-charcoal-800 rounded-full hover:bg-charcoal-50">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-safar-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            A
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto">
        {/* Event Card Header with Image & Event Code Pill */}
        <div className="relative rounded-2xl overflow-hidden bg-charcoal-900 text-white shadow-md">
          {/* Subtle architectural wedding backdrop */}
          <div
            className="h-44 w-full bg-cover bg-center brightness-[0.75]"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-900/30 to-transparent flex flex-col justify-end p-4">
            <h2 className="text-xl font-bold font-sans tracking-tight">{eventName}</h2>
            <p className="text-xs text-charcoal-300 font-medium">
              {eventLocation} • {eventDates}
            </p>

            {/* Event Code Pill with Copy */}
            <div className="mt-3 inline-flex items-center self-start bg-charcoal-900/85 backdrop-blur-md rounded-xl p-1 pr-1.5 border border-white/15 gap-2 text-xs">
              <span className="px-2 py-0.5 text-[11px] font-medium text-charcoal-300">
                Event Code: <strong className="text-white font-mono">{eventCode}</strong>
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* 4 Quick Action Cards matching Reference Image */}
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => setShowBookingModal(true)}
            className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-charcoal-800">Book Ride</span>
          </button>

          <button
            onClick={() => setCurrentTab('my-rides')}
            className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-charcoal-800">My Rides</span>
          </button>

          <button
            onClick={() => alert(`Event Ceremonies:\n- Mehendi (14 Nov)\n- Sangeet (15 Nov)\n- Wedding (16 Nov)`)}
            className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
              <Info className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-charcoal-800">Event Info</span>
          </button>

          <button
            onClick={() => alert('Host Transport Concierge Hotline: +91 98765 00000')}
            className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-charcoal-800">Support</span>
          </button>
        </div>

        {/* "Your Next Ride" Card matching reference image */}
        <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs p-4.5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-charcoal-900">Your Next Ride</h3>
            <button
              onClick={() => setCurrentTab('my-rides')}
              className="text-xs font-semibold text-safar-700 hover:text-safar-800"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-charcoal-600">
              {activeBooking.time}
            </div>

            {/* Route Timeline */}
            <div className="space-y-2.5 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-charcoal-900 ring-4 ring-white" />
                <div className="font-bold text-xs text-charcoal-900">{activeBooking.pickup}</div>
                <div className="text-[11px] text-charcoal-500">Pickup Location</div>
              </div>
              <div className="relative">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-safar-600 ring-4 ring-white" />
                <div className="font-bold text-xs text-charcoal-900">{activeBooking.destination}</div>
                <div className="text-[11px] text-charcoal-500">Drop-off Venue</div>
              </div>
            </div>

            {/* Vehicle & Status Row */}
            <div className="flex items-center justify-between pt-2 border-t border-charcoal-100">
              <div>
                <div className="font-bold text-xs text-charcoal-900">
                  {activeBooking.category}
                </div>
                <div className="text-[11px] text-charcoal-500">{activeBooking.seats} seats allocated</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="ON_TIME" size="sm" />
                <button
                  onClick={() => setShowBoardingPass(true)}
                  className="px-3 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Track Ride
                </button>
              </div>
            </div>

            {/* Mini Map Visual with ETA matching reference image */}
            <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#eef2f5] border border-charcoal-200/60 flex items-center justify-center">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 320 110">
                <path d="M 0 30 Q 150 40 320 20" stroke="#d5dde5" strokeWidth="8" fill="none" />
                <path d="M 0 85 Q 160 80 320 90" stroke="#d5dde5" strokeWidth="8" fill="none" />
                <path
                  d="M 40 85 C 90 85, 120 40, 200 45 S 270 30, 290 35"
                  stroke="#0d9488"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="5 3"
                  fill="none"
                />
                <circle cx="40" cy="85" r="5" fill="#111827" />
                <circle cx="290" cy="35" r="5" fill="#0d9488" />
                {/* Moving Car */}
                <g transform="translate(180, 44)">
                  <circle cx="0" cy="0" r="10" fill="#0d9488" opacity="0.25">
                    <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="5" fill="#0d9488" />
                </g>
              </svg>

              <div className="absolute top-2 right-2 bg-white/95 px-2.5 py-1 rounded-lg border border-charcoal-200 text-[10px] font-bold text-charcoal-900 shadow-xs">
                {activeBooking.duration} • {activeBooking.distance}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Drawer / Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-charcoal-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-safar-700 uppercase">Book Shuttle</span>
                <h3 className="font-bold text-base text-charcoal-900">Request Transportation</h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-xs font-semibold text-charcoal-500 hover:text-charcoal-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Pickup Location
                </label>
                <select
                  value={bookingForm.pickup}
                  onChange={(e) => setBookingForm({ ...bookingForm, pickup: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs bg-white font-medium"
                >
                  <option>The Grand Hotel</option>
                  <option>Ahmedabad Airport (AMD)</option>
                  <option>The Celebration Venue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Destination Venue
                </label>
                <select
                  value={bookingForm.destination}
                  onChange={(e) => setBookingForm({ ...bookingForm, destination: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs bg-white font-medium"
                >
                  <option>The Celebration Venue</option>
                  <option>The Grand Hotel</option>
                  <option>The Heritage Palace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Select Ride Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cat: VehicleCategory.SEDAN, label: 'Sedan', seats: '4 seats' },
                    { cat: VehicleCategory.SUV, label: 'SUV', seats: '6 seats' },
                    { cat: VehicleCategory.TEMPO_TRAVELLER, label: 'Traveller', seats: '16 seats' },
                  ].map((item) => (
                    <button
                      key={item.cat}
                      type="button"
                      onClick={() => setBookingForm({ ...bookingForm, category: item.cat })}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        bookingForm.category === item.cat
                          ? 'border-safar-600 bg-safar-50 text-safar-900 font-bold'
                          : 'border-charcoal-200 bg-white text-charcoal-600'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-charcoal-400 font-normal">{item.seats}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Passenger Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={bookingForm.passengers}
                  onChange={(e) => setBookingForm({ ...bookingForm, passengers: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-charcoal-200 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              className="w-full py-3 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              Confirm Reservation
            </button>
          </div>
        </div>
      )}

      {/* Boarding Pass Modal */}
      {showBoardingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-semibold text-safar-700 uppercase tracking-wider">
                Confirmed Ride
              </span>
              <h3 className="text-lg font-bold text-charcoal-900">Your Boarding Pass</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Show this 4-digit code or QR to your driver upon arrival.
              </p>
            </div>

            {/* 4-digit Boarding Code Box */}
            <div className="p-4 rounded-2xl bg-warm-100 border border-charcoal-200">
              <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-500">
                Boarding Code
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-safar-700 mt-1">
                {activeBooking.boardingCode}
              </div>
            </div>

            {/* Simulated QR Code SVG */}
            <div className="p-3 bg-white border border-charcoal-200 rounded-xl inline-block shadow-inner">
              <div className="w-36 h-36 bg-charcoal-900 p-2 rounded-lg flex items-center justify-center text-white">
                <QrCode className="w-28 h-28 text-white" />
              </div>
            </div>

            <button
              onClick={() => setShowBoardingPass(false)}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 text-white font-semibold text-xs hover:bg-charcoal-800 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Bottom Mobile Navigation matching Reference Image */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-charcoal-200 px-6 py-2.5 flex items-center justify-between z-40">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'book', label: 'Book', icon: Car, onClick: () => setShowBookingModal(true) },
          { id: 'my-rides', label: 'My Rides', icon: Bookmark },
          { id: 'profile', label: 'Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={tab.onClick || (() => setCurrentTab(tab.id as any))}
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
