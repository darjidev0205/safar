'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SafarLogo } from '../components/ui/safar-logo';
import { AuthModal } from '../components/ui/auth-modal';
import { useAuth } from '../context/auth-context';
import { UserRole } from '@safar/types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Car,
  Shield,
  CheckCircle2,
  Navigation,
  Compass,
  QrCode,
  Sparkles,
  PhoneCall,
  Search,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { authStatus, profile, role, logout } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.EVENT_ORGANIZER);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Hero Booking Bar Form State
  const [pickupLocation, setPickupLocation] = useState('Ahmedabad Airport (AMD)');
  const [destinationVenue, setDestinationVenue] = useState('The Grand Palace Lawns, SG Highway');
  const [rideDate, setRideDate] = useState('2026-10-18');
  const [rideTime, setRideTime] = useState('17:30');
  const [passengers, setPassengers] = useState('4');
  const [eventAccessCode, setEventAccessCode] = useState('');

  // Active Journey Step for interactive timeline
  const [activeStep, setActiveStep] = useState(0);

  // Selected Fleet Option
  const [selectedVehicle, setSelectedVehicle] = useState('suv');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuthWithRole = (targetRole: UserRole) => {
    setAuthRole(targetRole);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const getRoleDashboard = (userRole?: UserRole | null) => {
    switch (userRole) {
      case UserRole.DRIVER:
        return '/driver';
      case UserRole.GUEST:
        return '/guest';
      case UserRole.EVENT_ORGANIZER:
      case UserRole.ACCOUNT_OWNER:
      default:
        return '/host';
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventAccessCode.trim()) {
      router.push(`/guest/join?code=${encodeURIComponent(eventAccessCode.trim().toUpperCase())}`);
    } else if (authStatus === 'AUTHENTICATED' && profile) {
      router.push(getRoleDashboard(role));
    } else {
      openAuthWithRole(UserRole.GUEST);
    }
  };

  const handleEventCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventAccessCode.trim()) {
      router.push(`/guest/join?code=${encodeURIComponent(eventAccessCode.trim().toUpperCase())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#101827] flex flex-col font-sans selection:bg-safar-100 selection:text-safar-900">
      {/* ========================================================================= */}
      {/* 1. REFINED EDITORIAL NAVIGATION                                           */}
      {/* ========================================================================= */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E6E3D8] py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
            : 'bg-[#FAF9F5]/80 backdrop-blur-xs border-b border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between">
          {/* Brand Wordmark & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
            <SafarLogo size="md" />
            <div className="hidden sm:flex flex-col border-l border-[#D5D1C3] pl-3 py-0.5">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#0B968D] uppercase">
                Move Together.
              </span>
              <span className="text-[11px] font-medium text-[#64748B]">
                Event Mobility
              </span>
            </div>
          </Link>

          {/* Editorial Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-[#334155] tracking-wide">
            <a
              href="#how-it-works"
              className="hover:text-[#0B968D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0B968D] hover:after:w-full after:transition-all"
            >
              How SAFAR Works
            </a>
            <a
              href="#event-types"
              className="hover:text-[#0B968D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0B968D] hover:after:w-full after:transition-all"
            >
              Event Types
            </a>
            <a
              href="#fleet"
              className="hover:text-[#0B968D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0B968D] hover:after:w-full after:transition-all"
            >
              The Fleet
            </a>
            <a
              href="#safar-pass"
              className="hover:text-[#0B968D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0B968D] hover:after:w-full after:transition-all"
            >
              SAFAR Pass
            </a>
            <a
              href="#why-safar"
              className="hover:text-[#0B968D] transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0B968D] hover:after:w-full after:transition-all"
            >
              Why SAFAR
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-4">
            {authStatus === 'AUTHENTICATED' && profile ? (
              <div className="flex items-center gap-3">
                <Link
                  href={getRoleDashboard(role)}
                  className="px-4.5 py-2.5 rounded-lg bg-[#0B968D] hover:bg-[#087F76] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  <span>Dashboard ({role ? role.replace('_', ' ') : 'WORKSPACE'})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2.5 rounded-lg border border-[#D5D1C3] text-[#475569] hover:text-[#0F172A] hover:bg-[#EFECE4] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => openAuthWithRole(UserRole.GUEST)}
                  className="text-xs font-bold text-[#1E293B] hover:text-[#0B968D] transition-colors px-2 py-1"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="px-5 py-2.5 rounded-lg bg-[#101827] hover:bg-[#1E293B] text-white text-xs font-bold tracking-wide transition-all shadow-sm flex items-center gap-2"
                >
                  <span>BOOK TRANSPORT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg text-[#1E293B] hover:bg-[#EFECE4] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[70px] bg-[#FAF9F5] border-b border-[#E6E3D8] shadow-xl z-40 p-6 space-y-6 animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-4 text-sm font-semibold text-[#1E293B]">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B968D]"
            >
              How SAFAR Works
            </a>
            <a
              href="#event-types"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B968D]"
            >
              Event Types
            </a>
            <a
              href="#fleet"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B968D]"
            >
              The Fleet
            </a>
            <a
              href="#safar-pass"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B968D]"
            >
              SAFAR Pass
            </a>
            <a
              href="#why-safar"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B968D]"
            >
              Why SAFAR
            </a>
          </nav>

          <div className="pt-4 border-t border-[#E6E3D8] space-y-3">
            {authStatus === 'AUTHENTICATED' && profile ? (
              <div className="space-y-2">
                <Link
                  href={getRoleDashboard(role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-lg bg-[#0B968D] text-white text-xs font-bold text-center block"
                >
                  Go to {role ? role.replace('_', ' ') : 'Workspace'} Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg border border-[#D5D1C3] text-xs font-semibold text-[#475569] text-center block"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="w-full py-3 rounded-lg bg-[#101827] text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  Book Event Transport <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAuthWithRole(UserRole.GUEST)}
                  className="w-full py-2.5 rounded-lg border border-[#D5D1C3] text-xs font-bold text-[#1E293B]"
                >
                  Sign In as Guest or Driver
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pt-24">
        {/* ========================================================================= */}
        {/* 2. HERO: FULL-WIDTH EDITORIAL COMPOSITION                                  */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Editorial Eyebrow & Headline Block */}
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 text-xs font-bold tracking-[0.2em] text-[#0B968D] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#0B968D] animate-ping" />
                <span>Event Transportation, Reimagined</span>
                <span className="text-[#A8A495]">•</span>
                <span className="text-[#64748B] normal-case tracking-normal font-medium">
                  Weddings • Summits • Celebrations
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-black text-[#101827] tracking-[-0.03em] leading-[1.04]">
                The journey is part of{' '}
                <span className="font-serif italic font-normal text-[#0B968D] tracking-normal">
                  the event.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-[#475569] max-w-2xl font-normal leading-relaxed">
                Coordinated private fleets, scheduled guest shuttles, and live venue arrivals.
                Every ride mapped, every driver verified, every guest arriving in rhythm.
              </p>
            </div>

            {/* Immersive Event Photography Composition */}
            <div className="mt-10 lg:mt-12 relative">
              <div className="relative aspect-[16/9] lg:aspect-[21/9] w-full rounded-2xl overflow-hidden border border-[#D5D1C3] shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-[#101827]">
                <Image
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85"
                  alt="Guests arriving at an illuminated luxury evening event venue"
                  fill
                  priority
                  className="object-cover object-center brightness-[0.88] hover:scale-[1.02] transition-transform duration-700 ease-out"
                />

                {/* Editorial Visual Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1724]/85 via-transparent to-black/20" />

                {/* Overlaid Event Tag */}
                <div className="absolute top-6 left-6 sm:top-8 sm:left-8 bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-mono tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  LIVE EVENT TRANSIT DISPATCH • AHMEDABAD
                </div>

                {/* Overlaid Route Indicator in bottom corner */}
                <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-[#D5D1C3] text-xs shadow-md">
                  <div className="flex items-center gap-1.5 font-bold text-[#101827]">
                    <span className="w-2 h-2 rounded-full bg-[#0B968D]" />
                    <span>MARRIOTT</span>
                  </div>
                  <span className="text-[#A8A495]">────────</span>
                  <div className="flex items-center gap-1.5 font-bold text-[#101827]">
                    <span className="w-2 h-2 rounded-full bg-[#D9A85C]" />
                    <span>PALACE LAWNS</span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                    ON TIME
                  </span>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 3. HERO BOOKING BAR: REAL TRANSPORTATION INTERFACE                    */}
            {/* ===================================================================== */}
            <div className="mt-8 -translate-y-6 sm:-translate-y-12 relative z-20 max-w-5xl mx-auto">
              <div className="bg-[#FAF9F5] border-2 border-[#101827] rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.08)] p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6E3D8]">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#0B968D]" />
                    <span className="text-xs font-bold tracking-wider text-[#101827] uppercase">
                      Book Event Ride or Enter Pass Code
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] hidden sm:inline">
                    Direct Chauffeur & Shuttle Coordination
                  </span>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-0 lg:divide-x lg:divide-[#E6E3D8]">
                    {/* FROM */}
                    <div className="lg:px-4 first:lg:pl-0 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0B968D]" /> From (Pickup)
                      </label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="Airport / Hotel / Address"
                        className="w-full text-xs sm:text-sm font-semibold text-[#101827] bg-transparent border-0 focus:ring-0 p-0 placeholder-[#94A3B8]"
                      />
                    </div>

                    {/* TO */}
                    <div className="lg:px-4 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-[#D9A85C]" /> To (Event Venue)
                      </label>
                      <input
                        type="text"
                        value={destinationVenue}
                        onChange={(e) => setDestinationVenue(e.target.value)}
                        placeholder="Venue / Palace / Banquet"
                        className="w-full text-xs sm:text-sm font-semibold text-[#101827] bg-transparent border-0 focus:ring-0 p-0 placeholder-[#94A3B8]"
                      />
                    </div>

                    {/* DATE */}
                    <div className="lg:px-4 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#0B968D]" /> Date
                      </label>
                      <input
                        type="date"
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold text-[#101827] bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
                      />
                    </div>

                    {/* TIME */}
                    <div className="lg:px-4 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0B968D]" /> Pickup Time
                      </label>
                      <input
                        type="time"
                        value={rideTime}
                        onChange={(e) => setRideTime(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold text-[#101827] bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
                      />
                    </div>

                    {/* PASSENGERS */}
                    <div className="lg:px-4 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-[#64748B] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#0B968D]" /> Passengers
                      </label>
                      <select
                        value={passengers}
                        onChange={(e) => setPassengers(e.target.value)}
                        className="w-full text-xs sm:text-sm font-semibold text-[#101827] bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
                      >
                        <option value="1">1 Guest (Executive)</option>
                        <option value="2">2 Guests (Couple)</option>
                        <option value="4">4 Guests (Family Car)</option>
                        <option value="6">6 Guests (Premium SUV)</option>
                        <option value="12">12 Guests (Tempo Shuttle)</option>
                        <option value="35">35+ Guests (Event Coach)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-3 border-t border-[#E6E3D8] flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Event Code Quick Jump */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <QrCode className="w-4 h-4 text-[#64748B]" />
                      <span className="text-xs text-[#475569] font-medium whitespace-nowrap">
                        Have an event pass code?
                      </span>
                      <input
                        type="text"
                        value={eventAccessCode}
                        onChange={(e) => setEventAccessCode(e.target.value)}
                        placeholder="e.g. ROYAL26"
                        className="px-2.5 py-1 text-xs uppercase font-mono font-bold tracking-wider bg-white border border-[#D5D1C3] rounded text-[#101827] w-28 focus:outline-none focus:border-[#0B968D]"
                      />
                    </div>

                    {/* Primary Submit Button */}
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-7 py-3 rounded-lg bg-[#0B968D] hover:bg-[#087F76] text-white text-xs font-bold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 group"
                    >
                      <span>FIND RIDE FOR EVENT</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. SIGNATURE ROUTE LINE ELEMENT                                           */}
        {/* ========================================================================= */}
        <section className="py-8 bg-[#F5F4EF] border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <span className="text-xs font-mono font-bold tracking-wider text-[#64748B] uppercase">
                SAFAR TRANSIT ARCHITECTURE:
              </span>

              {/* Graphic Route Flow */}
              <div className="flex-1 max-w-3xl flex items-center justify-between text-xs font-mono text-[#334155] w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#101827]" />
                  <span className="font-bold">HOTEL / AIRPORT</span>
                </div>

                <div className="flex-1 px-4 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-[#0B968D] relative">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F5F4EF] px-2 text-[10px] text-[#0B968D] font-bold">
                      ACTIVE ROUTE
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 bg-[#D9A85C]" />
                  <span className="font-bold">DISPATCH HUB</span>
                </div>

                <div className="flex-1 px-4 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-[#0B968D] relative">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F5F4EF] px-2 text-[10px] text-[#0B968D] font-bold">
                      LIVE ETA
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B968D]" />
                  <span className="font-bold text-[#0B968D]">VENUE GATES</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. EVENT DISCOVERY: "WHERE ARE YOU HEADING?" (ASYMMETRIC EDITORIAL)       */}
        {/* ========================================================================= */}
        <section id="event-types" className="py-20 lg:py-28 border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Editorial Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
              <div>
                <span className="text-xs font-bold tracking-[0.2em] text-[#0B968D] uppercase block mb-3">
                  Coordinated Gatherings
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#101827] tracking-tight">
                  Where are you{' '}
                  <span className="font-serif italic font-normal text-[#0B968D]">heading?</span>
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#475569] max-w-md font-normal leading-relaxed">
                Whether a 500-guest wedding Baraat or a private corporate summit, SAFAR orchestrates
                seamless transit from pickup to destination.
              </p>
            </div>

            {/* Asymmetric Editorial Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Card 1: Large Feature Card (7 Columns) */}
              <div
                onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                className="lg:col-span-7 group cursor-pointer bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=85"
                    alt="Grand Wedding and Sangeet Event"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-4 left-4 bg-[#101827]/85 backdrop-blur-xs text-white px-3 py-1.5 rounded text-xs font-mono tracking-wider">
                    OCTOBER 2026 • GUJARAT & RAJASTHAN
                  </div>
                  <div className="absolute bottom-4 right-4 bg-emerald-700 text-white px-3 py-1 rounded text-[11px] font-bold">
                    68 RIDES COORDINATED
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-[#0B968D] uppercase">
                      Category 01 • Destination Celebrations
                    </span>
                    <ArrowRight className="w-5 h-5 text-[#101827] group-hover:translate-x-2 transition-transform" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#101827] tracking-tight">
                    Grand Weddings & Sangeet Nights
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Synchronized guest pickups from 4 partner hotels, airport guest reception desks,
                    and punctual Baraat arrival coordination.
                  </p>
                </div>
              </div>

              {/* Column 2: Two Asymmetric Cards (5 Columns) */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                {/* Card 2: Corporate Summits */}
                <div
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="group cursor-pointer bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex-1 flex flex-col"
                >
                  <div className="relative aspect-[16/8] overflow-hidden bg-[#101827]">
                    <Image
                      src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=85"
                      alt="Corporate Summit & Conference"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-3 left-3 bg-[#101827]/85 text-white px-2.5 py-1 rounded text-[11px] font-mono">
                      EXECUTIVE DELEGATES
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    <span className="text-[10px] font-bold tracking-wider text-[#0B968D] uppercase">
                      Category 02 • Professional
                    </span>
                    <h3 className="text-xl font-bold text-[#101827] flex items-center justify-between">
                      Corporate Summits & Conclaves
                      <ArrowRight className="w-4 h-4 text-[#101827] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Flight tracking for keynotes, dedicated executive sedans, and scheduled venue
                      express loops.
                    </p>
                  </div>
                </div>

                {/* Card 3: Festivals & Galas */}
                <div
                  onClick={() => openAuthWithRole(UserRole.GUEST)}
                  className="group cursor-pointer bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex-1 flex flex-col"
                >
                  <div className="relative aspect-[16/8] overflow-hidden bg-[#101827]">
                    <Image
                      src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85"
                      alt="Festivals and Cultural Galas"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-3 left-3 bg-[#101827]/85 text-white px-2.5 py-1 rounded text-[11px] font-mono">
                      ARENAS & FESTIVALS
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    <span className="text-[10px] font-bold tracking-wider text-[#0B968D] uppercase">
                      Category 03 • Mass Transit
                    </span>
                    <h3 className="text-xl font-bold text-[#101827] flex items-center justify-between">
                      Concerts, Galas & Private Passes
                      <ArrowRight className="w-4 h-4 text-[#101827] group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Pre-booked group cab passes, dedicated pickup lanes, and guaranteed post-event
                      egress rides.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. JOURNEY STORYTELLING: "FROM YOUR DOOR TO THE EVENT"                    */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-[#101827] text-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Section Header */}
            <div className="max-w-3xl mb-16 space-y-4">
              <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#0B968D] uppercase">
                The Movement Lifecycle
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                From your door to{' '}
                <span className="font-serif italic font-normal text-[#5EEAD4]">the event.</span>
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] font-normal leading-relaxed">
                Transportation should never be an afterthought. SAFAR replaces chaotic WhatsApp
                threads and last-minute cab panics with a calm, synchronized journey timeline.
              </p>
            </div>

            {/* 4-Step Interactive Journey Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 01 */}
              <div
                onClick={() => setActiveStep(0)}
                className={`p-6 sm:p-7 rounded-xl border transition-all cursor-pointer ${
                  activeStep === 0
                    ? 'border-[#0B968D] bg-white/10 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#5EEAD4]">01</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/10 text-white">
                    DISPATCH
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Book & Schedule</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Host configures event timings, hotel pickup points, and airport arrivals. Guests
                  receive personalized digital ride links.
                </p>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
                  <span>Pre-allocated Fleet</span>
                  <Check className="w-3.5 h-3.5 ml-auto" />
                </div>
              </div>

              {/* Step 02 */}
              <div
                onClick={() => setActiveStep(1)}
                className={`p-6 sm:p-7 rounded-xl border transition-all cursor-pointer ${
                  activeStep === 1
                    ? 'border-[#0B968D] bg-white/10 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#5EEAD4]">02</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/10 text-white">
                    ALLOCATION
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Match & Verify</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Drivers and vehicles are matched based on party size and hotel cluster. Background
                  checks and event protocols verified.
                </p>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
                  <span>Verified Chauffeurs</span>
                  <Check className="w-3.5 h-3.5 ml-auto" />
                </div>
              </div>

              {/* Step 03 */}
              <div
                onClick={() => setActiveStep(2)}
                className={`p-6 sm:p-7 rounded-xl border transition-all cursor-pointer ${
                  activeStep === 2
                    ? 'border-[#0B968D] bg-white/10 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#5EEAD4]">03</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/10 text-white">
                    TELEMETRY
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Track & Coordinate</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Live GPS route tracking. Guest sees vehicle arrival countdown. Host sees entire
                  fleet movement on live dispatch map.
                </p>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
                  <span>Live GPS Tracking</span>
                  <Check className="w-3.5 h-3.5 ml-auto" />
                </div>
              </div>

              {/* Step 04 */}
              <div
                onClick={() => setActiveStep(3)}
                className={`p-6 sm:p-7 rounded-xl border transition-all cursor-pointer ${
                  activeStep === 3
                    ? 'border-[#0B968D] bg-white/10 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#5EEAD4]">04</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white/10 text-white">
                    ARRIVAL
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Arrive Together</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Smooth drop-off right at the venue gates. No parking queues or delay. Host
                  notified as VIP parties step out.
                </p>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
                  <span>Synchronized VIP Drop</span>
                  <Check className="w-3.5 h-3.5 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. THE EVENT FLEET: "CHOOSE YOUR RIDE"                                    */}
        {/* ========================================================================= */}
        <section id="fleet" className="py-20 lg:py-28 border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
              <div>
                <span className="text-xs font-bold tracking-[0.2em] text-[#0B968D] uppercase block mb-3">
                  Vehicle Portfolio
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#101827] tracking-tight">
                  Choose your{' '}
                  <span className="font-serif italic font-normal text-[#0B968D]">ride.</span>
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#475569] max-w-md font-normal leading-relaxed">
                From luxury executive sedans for keynote speakers to luxury tempo travellers for the
                extended wedding party.
              </p>
            </div>

            {/* Fleet Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Option 1: Executive Sedan */}
              <div
                onClick={() => setSelectedVehicle('sedan')}
                className={`bg-[#F5F4EF] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                  selectedVehicle === 'sedan'
                    ? 'border-[#0B968D] shadow-md ring-2 ring-[#0B968D]/20'
                    : 'border-[#D5D1C3] hover:border-[#101827]'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"
                    alt="Executive Event Sedan"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#101827]/85 text-white px-2.5 py-0.5 rounded text-[10px] font-mono">
                    EXECUTIVE SEDAN
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#101827]">Mercedes / Camry / BMW</h3>
                    <p className="text-xs text-[#64748B]">
                      Quiet luxury for VIP guests, keynote speakers & groom/bride arrival.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E6E3D8] text-xs font-medium text-[#334155]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Capacity:</span>
                      <span className="font-bold">3–4 Guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Luggage:</span>
                      <span className="font-bold">3 Large Bags</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Event Suitability:</span>
                      <span className="font-bold text-[#0B968D]">VIP & Keynotes</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="w-full py-2.5 rounded-lg border border-[#101827] text-xs font-bold hover:bg-[#101827] hover:text-white transition-colors"
                  >
                    SELECT SEDAN
                  </button>
                </div>
              </div>

              {/* Option 2: Event SUV */}
              <div
                onClick={() => setSelectedVehicle('suv')}
                className={`bg-[#F5F4EF] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                  selectedVehicle === 'suv'
                    ? 'border-[#0B968D] shadow-md ring-2 ring-[#0B968D]/20'
                    : 'border-[#D5D1C3] hover:border-[#101827]'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"
                    alt="Event Luxury SUV"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#0B968D] text-white px-2.5 py-0.5 rounded text-[10px] font-mono">
                    MOST POPULAR
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#101827]">Innova Crysta / Fortuner</h3>
                    <p className="text-xs text-[#64748B]">
                      Spacious premium SUV for immediate family, luggage & airport transfers.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E6E3D8] text-xs font-medium text-[#334155]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Capacity:</span>
                      <span className="font-bold">6 Guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Luggage:</span>
                      <span className="font-bold">5 Large Bags</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Event Suitability:</span>
                      <span className="font-bold text-[#0B968D]">Family & Airport Sync</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="w-full py-2.5 rounded-lg bg-[#0B968D] text-white text-xs font-bold hover:bg-[#087F76] transition-colors"
                  >
                    SELECT SUV
                  </button>
                </div>
              </div>

              {/* Option 3: Tempo Traveller */}
              <div
                onClick={() => setSelectedVehicle('tempo')}
                className={`bg-[#F5F4EF] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                  selectedVehicle === 'tempo'
                    ? 'border-[#0B968D] shadow-md ring-2 ring-[#0B968D]/20'
                    : 'border-[#D5D1C3] hover:border-[#101827]'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"
                    alt="Tempo Traveller Shuttle"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#101827]/85 text-white px-2.5 py-0.5 rounded text-[10px] font-mono">
                    GROUP SHUTTLE
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#101827]">Force Urbania / Traveller</h3>
                    <p className="text-xs text-[#64748B]">
                      High-roof executive shuttles for hotel-to-venue group runs.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E6E3D8] text-xs font-medium text-[#334155]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Capacity:</span>
                      <span className="font-bold">12–16 Guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Luggage:</span>
                      <span className="font-bold">14 Bags</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Event Suitability:</span>
                      <span className="font-bold text-[#0B968D]">Hotel Guest Loops</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="w-full py-2.5 rounded-lg border border-[#101827] text-xs font-bold hover:bg-[#101827] hover:text-white transition-colors"
                  >
                    SELECT TRAVELLER
                  </button>
                </div>
              </div>

              {/* Option 4: Luxury Coach */}
              <div
                onClick={() => setSelectedVehicle('coach')}
                className={`bg-[#F5F4EF] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                  selectedVehicle === 'coach'
                    ? 'border-[#0B968D] shadow-md ring-2 ring-[#0B968D]/20'
                    : 'border-[#D5D1C3] hover:border-[#101827]'
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80"
                    alt="Luxury Event Coach"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#101827]/85 text-white px-2.5 py-0.5 rounded text-[10px] font-mono">
                    EVENT COACH
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#101827]">Volvo Luxury Cruiser</h3>
                    <p className="text-xs text-[#64748B]">
                      Mass movement for outstation wedding parties & conference delegates.
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#E6E3D8] text-xs font-medium text-[#334155]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Capacity:</span>
                      <span className="font-bold">35–45 Guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Luggage:</span>
                      <span className="font-bold">Bulk Cargo Bay</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Event Suitability:</span>
                      <span className="font-bold text-[#0B968D]">Full Party Transit</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="w-full py-2.5 rounded-lg border border-[#101827] text-xs font-bold hover:bg-[#101827] hover:text-white transition-colors"
                  >
                    SELECT COACH
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. SIGNATURE "SAFAR PASS": PHYSICAL TRAVEL / BOARDING PASS COMPONENT       */}
        {/* ========================================================================= */}
        <section id="safar-pass" className="py-20 lg:py-28 bg-[#F5F4EF] border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Editorial Explanation */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-xs font-bold tracking-[0.2em] text-[#0B968D] uppercase block">
                  Signature Experience
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-[#101827] tracking-tight leading-tight">
                  Every guest receives their{' '}
                  <span className="font-serif italic font-normal text-[#0B968D]">SAFAR Pass.</span>
                </h2>
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                  No confusing links or misplaced ride coordinates. Guests receive an elegant
                  digital travel boarding pass showing their allocated chauffeur, pickup window,
                  vehicle details, and direct contact.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1E293B]">
                    <CheckCircle2 className="w-4 h-4 text-[#0B968D]" />
                    <span>Instant Apple Wallet & WhatsApp Pass integration</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1E293B]">
                    <CheckCircle2 className="w-4 h-4 text-[#0B968D]" />
                    <span>Real-time driver ETA countdown without downloading an app</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#1E293B]">
                    <CheckCircle2 className="w-4 h-4 text-[#0B968D]" />
                    <span>Private driver hotline for frictionless venue coordination</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => openAuthWithRole(UserRole.GUEST)}
                    className="px-6 py-3 rounded-lg bg-[#101827] hover:bg-[#1E293B] text-white text-xs font-bold tracking-wide transition-all shadow-sm flex items-center gap-2"
                  >
                    <span>LOOK UP MY PASS</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Physical Ticket / Boarding Pass Component */}
              <div className="lg:col-span-6">
                <div className="max-w-md mx-auto bg-white border-2 border-[#101827] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.08)] overflow-hidden ticket-notch">
                  {/* Ticket Header */}
                  <div className="bg-[#101827] text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0B968D] animate-pulse" />
                      <span className="font-mono text-xs font-bold tracking-widest uppercase">
                        SAFAR EVENT BOARDING PASS
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#5EEAD4] bg-white/10 px-2 py-0.5 rounded">
                      PASS SF-4821
                    </span>
                  </div>

                  {/* Ticket Body */}
                  <div className="p-6 space-y-6">
                    {/* Event & Guest info */}
                    <div className="flex justify-between items-start pb-4 border-b border-[#E6E3D8]">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Event
                        </span>
                        <h4 className="text-base font-black text-[#101827]">
                          Royal Rajputana Wedding Gala
                        </h4>
                        <span className="text-xs text-[#0B968D] font-medium">Host: Dev & Family</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Date & Window
                        </span>
                        <div className="text-xs font-mono font-bold text-[#101827]">18 OCT 2026</div>
                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          17:30–18:00
                        </span>
                      </div>
                    </div>

                    {/* Journey Route Visual */}
                    <div className="space-y-3 bg-[#FAF9F5] p-3.5 rounded-lg border border-[#E6E3D8]">
                      <div className="flex items-center gap-3 text-xs font-semibold text-[#101827]">
                        <span className="w-2 h-2 rounded-full bg-[#101827]" />
                        <span>PICKUP: Courtyard Marriott, Satellite</span>
                      </div>
                      <div className="pl-1 text-[#0B968D] text-[10px] font-mono tracking-wider">
                        │ 14.2 km • Expressway Corridor
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold text-[#101827]">
                        <span className="w-2 h-2 rounded-full bg-[#0B968D]" />
                        <span>DESTINATION: The Grand Palace Lawns, SG Highway</span>
                      </div>
                    </div>

                    {/* Chauffeur & Vehicle Allocation */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                          Assigned Chauffeur
                        </span>
                        <div className="font-bold text-[#101827]">Vikram Singh</div>
                        <span className="text-[11px] text-amber-700 font-semibold">
                          ★ 4.9 • Verified Chauffeur
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                          Vehicle & Registration
                        </span>
                        <div className="font-bold text-[#101827]">SAFAR Premium SUV</div>
                        <span className="text-[11px] font-mono text-[#64748B]">GJ-01-EV-4821</span>
                      </div>
                    </div>

                    {/* Live Status Bar */}
                    <div className="pt-4 border-t border-[#E6E3D8] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-bold text-emerald-800">
                          Chauffeur En Route (ETA 6 mins)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#101827]">SEATS: 4 PAX</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. "WHY SAFAR" EDITORIAL STATEMENT                                        */}
        {/* ========================================================================= */}
        <section id="why-safar" className="py-20 lg:py-28 border-b border-[#E6E3D8]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Big Editorial Statement */}
            <div className="max-w-4xl mb-16 space-y-4">
              <span className="text-xs font-bold tracking-[0.2em] text-[#0B968D] uppercase block">
                The SAFAR Difference
              </span>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#101827] tracking-tight leading-tight">
                Events are complex.{' '}
                <span className="font-serif italic font-normal text-[#0B968D]">Arrivals</span>{' '}
                shouldn't be.
              </h2>
            </div>

            {/* Three Distinct Concepts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Concept 1 */}
              <div className="space-y-4 p-6 sm:p-8 bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#101827] text-white flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <h3 className="text-2xl font-black text-[#101827]">Coordinated</h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  No scattered phone calls, stranded elders, or confusing directions. The host sees
                  the status of all 40+ vehicles on a single real-time map.
                </p>
                <div className="pt-2 text-xs font-mono text-[#0B968D] font-bold">
                  ONE UNIFIED FLEET
                </div>
              </div>

              {/* Concept 2 */}
              <div className="space-y-4 p-6 sm:p-8 bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#0B968D] text-white flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <h3 className="text-2xl font-black text-[#101827]">Visible</h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Know exactly where every car is, which guests have been picked up from the
                  airport, and who is 5 minutes from the gate.
                </p>
                <div className="pt-2 text-xs font-mono text-[#0B968D] font-bold">
                  REAL-TIME TELEMETRY
                </div>
              </div>

              {/* Concept 3 */}
              <div className="space-y-4 p-6 sm:p-8 bg-[#F5F4EF] border border-[#D5D1C3] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#D9A85C] text-white flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <h3 className="text-2xl font-black text-[#101827]">Reliable</h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Dedicated chauffeurs pre-assigned to your event. Zero last-minute driver
                  cancellations or surge pricing shocks.
                </p>
                <div className="pt-2 text-xs font-mono text-[#0B968D] font-bold">
                  GUARANTEED ARRIVALS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. SOCIAL PROOF / EVENT ORGANIZER QUOTE                                  */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-[#FAF9F5] border-b border-[#E6E3D8]">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="text-4xl text-[#0B968D] font-serif">“</span>
                <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-serif italic text-[#101827] leading-snug">
                  SAFAR made moving 180 guests between three venues feel completely effortless. Not a
                  single delayed baraat, not a single missed flight.
                </blockquote>
                <div className="pt-2">
                  <div className="font-bold text-base text-[#101827]">Priya & Siddharth Patel</div>
                  <div className="text-xs text-[#64748B]">
                    Destination Wedding Hosts • Ahmedabad & Udaipur
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#D5D1C3] shadow-md relative bg-[#101827]">
                  <Image
                    src="https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=800&q=80"
                    alt="Event hosts and guests celebrating"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white text-xs font-mono">
                    180 GUESTS • 3 VENUES • 100% ON-TIME
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 11. FINAL BOOKING CTA                                                     */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-28 bg-[#101827] text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 text-center space-y-8 relative z-10">
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#0B968D] uppercase block">
              Plan Your Movement
            </span>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Your event starts before you{' '}
              <span className="font-serif italic font-normal text-[#5EEAD4]">arrive.</span>
            </h2>

            <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              Coordinate dedicated guest shuttles, airport transfers, and VIP private chauffeurs for
              your upcoming gathering.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[#0B968D] hover:bg-[#087F76] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <span>PLAN EVENT TRANSPORTATION</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => openAuthWithRole(UserRole.GUEST)}
                className="w-full sm:w-auto px-8 py-4 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>JOIN AS GUEST / DRIVER</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 12. EDITORIAL BRAND FOOTER                                                */}
      {/* ========================================================================= */}
      <footer className="bg-[#FAF9F5] border-t border-[#E6E3D8] pt-16 pb-12 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-12">
          {/* Top Brand Statement */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-12 border-b border-[#E6E3D8]">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-3xl font-black text-[#101827] tracking-tight">SAFAR</span>
                <span className="text-xs font-mono font-bold text-[#0B968D] tracking-widest uppercase">
                  MOVE TOGETHER.
                </span>
              </div>
              <p className="text-sm font-serif italic text-[#475569]">
                Wherever the event, we'll get you there.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                className="px-4 py-2 rounded border border-[#D5D1C3] text-xs font-bold text-[#101827] hover:bg-[#EFECE4] transition-colors"
              >
                Host Portal
              </button>
              <button
                onClick={() => openAuthWithRole(UserRole.GUEST)}
                className="px-4 py-2 rounded border border-[#D5D1C3] text-xs font-bold text-[#101827] hover:bg-[#EFECE4] transition-colors"
              >
                Guest Portal
              </button>
              <button
                onClick={() => openAuthWithRole(UserRole.DRIVER)}
                className="px-4 py-2 rounded border border-[#D5D1C3] text-xs font-bold text-[#101827] hover:bg-[#EFECE4] transition-colors"
              >
                Driver Portal
              </button>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <h5 className="font-bold text-[#101827] uppercase tracking-wider text-[11px]">
                Platform
              </h5>
              <ul className="space-y-2">
                <li>
                  <a href="#how-it-works" className="hover:text-[#0B968D] transition-colors">
                    How SAFAR Works
                  </a>
                </li>
                <li>
                  <a href="#fleet" className="hover:text-[#0B968D] transition-colors">
                    Fleet Catalog
                  </a>
                </li>
                <li>
                  <a href="#safar-pass" className="hover:text-[#0B968D] transition-colors">
                    SAFAR Pass
                  </a>
                </li>
                <li>
                  <a href="#why-safar" className="hover:text-[#0B968D] transition-colors">
                    Why SAFAR
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-[#101827] uppercase tracking-wider text-[11px]">
                Event Types
              </h5>
              <ul className="space-y-2">
                <li>
                  <a href="#event-types" className="hover:text-[#0B968D] transition-colors">
                    Weddings & Sangeet
                  </a>
                </li>
                <li>
                  <a href="#event-types" className="hover:text-[#0B968D] transition-colors">
                    Corporate Conclaves
                  </a>
                </li>
                <li>
                  <a href="#event-types" className="hover:text-[#0B968D] transition-colors">
                    Concerts & Arenas
                  </a>
                </li>
                <li>
                  <a href="#event-types" className="hover:text-[#0B968D] transition-colors">
                    Private Galas
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-[#101827] uppercase tracking-wider text-[11px]">
                Experiences
              </h5>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="hover:text-[#0B968D] transition-colors text-left"
                  >
                    Event Organizer Console
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openAuthWithRole(UserRole.GUEST)}
                    className="hover:text-[#0B968D] transition-colors text-left"
                  >
                    Guest Ride Pass (PWA)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openAuthWithRole(UserRole.DRIVER)}
                    className="hover:text-[#0B968D] transition-colors text-left"
                  >
                    Driver Navigation (PWA)
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-[#101827] uppercase tracking-wider text-[11px]">
                Security & Standards
              </h5>
              <ul className="space-y-2">
                <li>Verified Drivers Only</li>
                <li>GPS Live Telemetry</li>
                <li>ISO Event Transit Standards</li>
                <li>Zero Surge Guarantee</li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-[#E6E3D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <span>© {new Date().getFullYear()} SAFAR Mobility Technologies. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <span className="hover:text-[#0B968D] cursor-pointer">Privacy Policy</span>
              <span className="hover:text-[#0B968D] cursor-pointer">Terms of Service</span>
              <span className="hover:text-[#0B968D] cursor-pointer">Security Overview</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Authentication Modal (preserves full auth and role system) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultRole={authRole}
      />
    </div>
  );
}
