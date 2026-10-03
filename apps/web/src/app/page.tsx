'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SafarLogo } from '../components/ui/safar-logo';
import { EditorialNavbar } from '../components/ui/editorial-navbar';
import { AuthModal } from '../components/ui/auth-modal';
import { useAuth } from '../context/auth-context';
import { UserRole } from '@safar/types';
import {
  HorizontalCardScroller,
  SectionHeader,
  SafarBadge,
} from '../components/ui/safar-design-system';
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
  KeyRound,
  PhoneCall,
  Check,
  Star,
  Compass,
  Heart,
  Home,
  Luggage,
} from 'lucide-react';
import {
  MarigoldFlower,
  OliveBranch,
  JasmineBloom,
  StarFlourish,
  FloralDivider,
  IndianArchOutline,
} from '../components/ui/botanical-ornaments';

const FUNCTIONS_DATA = [
  {
    title: 'Sangeet Night',
    timing: '19:00 – Late',
    accentColor: 'border-terracotta-200/80 bg-warm-50 text-terracotta-800',
    tag: 'Celebration & Dance',
    desc: 'Choreography shuttles, family arrival convoys, and late-night return transfers ensuring every guest returns safely to their hotel.',
    fleetType: 'Tempo Travellers & Luxury SUVs',
    details: 'Multiple scheduled pickup windows from guest accommodations directly to the banquet lawns.',
  },
  {
    title: 'Mehndi Ceremony',
    timing: '11:00 – 15:00',
    accentColor: 'border-sage-200/80 bg-warm-50 text-sage-800',
    tag: 'Afternoon Gathering',
    desc: 'Intimate daytime transfers to garden pavilions and poolside venues with dedicated hospitality drivers for family elders.',
    fleetType: 'Executive Sedans & SUVs',
    details: 'Curated shaded pickup points with chilled bottled water and welcoming chauffeurs.',
  },
  {
    title: 'Haldi Function',
    timing: '09:00 – 12:00',
    accentColor: 'border-gold-300/80 bg-warm-50 text-gold-700',
    tag: 'Morning Rituals',
    desc: 'Early morning family pickups, yellow-themed hospitality cars, and swift coordination between bridal residences and ceremonial halls.',
    fleetType: 'Family Sedans & Shuttles',
    details: 'Coordinated morning departure times so both sides of the family arrive in synchronized harmony.',
  },
  {
    title: 'Wedding Ceremony',
    timing: '18:00 – 23:30',
    accentColor: 'border-burgundy-200/80 bg-warm-50 text-burgundy-800',
    tag: 'The Sacred Pheras',
    desc: 'The grand baraat procession transport, VIP bridal escorts, and continuous guest shuttling to the sanctified mandap.',
    fleetType: 'Full Fleet Mobility Suite',
    details: 'Dedicated dispatch coordinators stationed curbside with live GPS route guidance.',
  },
  {
    title: 'Reception Banquet',
    timing: '20:00 – 01:00',
    accentColor: 'border-charcoal-200/80 bg-warm-50 text-charcoal-800',
    tag: 'Formal Dinner',
    desc: 'VIP guest arrivals, grand palace valet management, and smooth airport departure runs throughout the night.',
    fleetType: 'Luxury Chauffeurs & Coaches',
    details: 'Luggage-safe executive vehicles for attendees departing directly for late-night flights.',
  },
];

const JOURNEY_STEPS = [
  {
    num: '01',
    title: 'Plan',
    subtitle: 'Ceremony Mapping',
    desc: 'Create distinct records for Sangeet, Mehndi, and Reception with specific pickup points, dates, and vehicle requirements.',
  },
  {
    num: '02',
    title: 'Invite',
    subtitle: 'Digital Guest Passes',
    desc: 'Send invitations with individual access codes and boarding passes. Guests see their scheduled pickup times and chauffeur details.',
  },
  {
    num: '03',
    title: 'Assign',
    subtitle: 'Family & Fleet Allocation',
    desc: 'Group guests into registered families and automatically allocate sedans, SUVs, or tempo travellers from your actual fleet.',
  },
  {
    num: '04',
    title: 'Travel',
    subtitle: 'Live Fleet Tracking',
    desc: 'Hosts and family members monitor real-time vehicle movement without frantic phone calls to the groom’s or bride’s parents.',
  },
  {
    num: '05',
    title: 'Arrive',
    subtitle: 'Curbside Hospitality',
    desc: 'Guests are greeted curbside at the venue by verified chauffeurs. Luggage is tagged and delivered to hotel rooms seamlessly.',
  },
];

const FLEET_CATEGORIES = [
  {
    name: 'Executive Sedans',
    idealFor: 'Bridal Party, Parents & Senior Elders',
    capacity: '3–4 Passengers • 2 Suitcases',
    models: 'Toyota Camry, Mercedes-Benz, Dzire ZXi',
    accent: 'border-gold-300/80',
  },
  {
    name: 'Luxury SUVs',
    idealFor: 'Immediate Families & Airport Transfers',
    capacity: '5–6 Passengers • 4 Large Bags',
    models: 'Toyota Innova Crysta, Fortuner, Defender',
    accent: 'border-terracotta-200/80',
  },
  {
    name: 'Tempo Travellers & Urbania',
    idealFor: 'Cousins, Sangeet Troupe & Baraat Environs',
    capacity: '12–17 Passengers • Overhead Luggage',
    models: 'Force Urbania, Tempo Traveller Royale',
    accent: 'border-sage-200/80',
  },
  {
    name: 'Ceremonial Mini Buses & Coaches',
    idealFor: 'Hotel-to-Banquet Large Guest Convoys',
    capacity: '25–40 Passengers • Complete Hospitality',
    models: 'BharatBenz Coaches, Volvo Luxury Line',
    accent: 'border-burgundy-200/80',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { authStatus, profile, role, logout } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.EVENT_ORGANIZER);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const openAuthWithRole = (targetRole: UserRole) => {
    setAuthRole(targetRole);
    setAuthModalOpen(true);
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

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    router.push(`/guest/join?code=${encodeURIComponent(joinCodeInput.trim().toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F2421] flex flex-col font-sans selection:bg-terracotta-100 selection:text-terracotta-900 paper-texture">
      {/* ========================================================================= */}
      {/* 1. EDITORIAL FLOATING GLASSMORPHIC APPLE-STYLE NAVIGATION                  */}
      {/* ========================================================================= */}
      <EditorialNavbar
        authStatus={authStatus}
        profile={profile}
        role={role}
        onOpenAuth={openAuthWithRole}
        onOpenJoinModal={() => setJoinModalOpen(true)}
        onLogout={logout}
        getRoleDashboard={getRoleDashboard}
      />

      {/* ========================================================================= */}
      {/* 2. SECTION 1: HANDCRAFTED WEDDING HERO (EDITORIAL COMPOSITION)           */}
      {/* ========================================================================= */}
      <section className="relative pt-24 sm:pt-32 md:pt-36 pb-14 sm:pb-20 md:pb-28 overflow-hidden">
        {/* Subtle Decorative Background Motifs */}
        <div className="absolute top-16 right-10 opacity-30 pointer-events-none hidden lg:block">
          <IndianArchOutline className="w-24 h-24 text-gold-600" />
        </div>
        <div className="absolute bottom-10 left-8 opacity-25 pointer-events-none hidden md:block">
          <OliveBranch className="w-20 h-20 text-sage-600 rotate-12" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
            {/* Left/Center Text Column: Stately Serif Typography */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-7 z-10 text-left">
              {/* Refined Upper Label */}
              <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.24em] text-terracotta-700 bg-white/90 px-3.5 py-1.5 rounded-full border border-terracotta-200/80 shadow-2xs">
                <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />
                <span>Wedding Travel, Beautifully Planned</span>
                <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />
              </div>

              {/* Main Headline */}
              <div className="space-y-1.5">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal font-serif text-charcoal-900 leading-[1.12] sm:leading-[1.08] tracking-tight">
                  Every celebration <br />
                  has a journey. <br />
                  <span className="italic font-light text-terracotta-600">
                    Make yours unforgettable.
                  </span>
                </h1>
              </div>

              {/* Supporting Subtext */}
              <p className="text-xs sm:text-sm md:text-base text-charcoal-600 font-sans leading-relaxed max-w-lg">
                Thoughtfully planned transportation for Indian weddings. From airport welcomes and multi-ceremony transfers to the final midnight farewell.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="px-7 py-3.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold uppercase tracking-[0.14em] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.985]"
                >
                  <span>Begin Your Journey</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="#functions"
                  className="px-6 py-3.5 rounded-full border border-[#D4C4B0] bg-white/90 hover:bg-white text-xs font-semibold text-charcoal-800 tracking-[0.12em] uppercase transition-all shadow-2xs flex items-center justify-center gap-2 active:scale-[0.985]"
                >
                  <span>Explore Functions</span>
                  <ChevronRight className="w-3.5 h-3.5 text-charcoal-400" />
                </a>
              </div>

              {/* Subtle Handcrafted Quote Note */}
              <div className="pt-2 flex items-center gap-2.5 text-xs text-charcoal-500 italic font-sans">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
                <span>No frantic phone calls to the baraat. Just graceful, dignified arrivals.</span>
              </div>
            </div>

            {/* Right Column: Hand-Painted Editorial Wedding Illustration Composition */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end mt-4 lg:mt-0">
              {/* Asymmetric Botanical Flowers Extending Beyond the Frame */}
              <div className="absolute -top-4 right-0 sm:-right-4 z-20 pointer-events-none animate-in fade-in">
                <MarigoldFlower className="w-9 h-9 sm:w-12 sm:h-12 text-terracotta-500 drop-shadow-xs" />
              </div>
              <div className="absolute -top-2 right-8 z-20 pointer-events-none">
                <JasmineBloom className="w-5 h-5 sm:w-6 sm:h-6 text-warm-50" />
              </div>
              <div className="absolute -bottom-4 left-0 sm:-left-6 z-20 pointer-events-none">
                <OliveBranch className="w-12 h-12 sm:w-16 sm:h-16 text-sage-600 -rotate-45 drop-shadow-xs" />
              </div>
              <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
                <MarigoldFlower className="w-7 h-7 sm:w-8 sm:h-8 text-gold-500 drop-shadow-xs" />
              </div>
              <div className="absolute top-1/2 -right-4 z-20 pointer-events-none hidden sm:block">
                <OliveBranch className="w-10 h-10 text-sage-600 rotate-90" />
              </div>

              {/* Deckled Edge Paper Invitation Card Container */}
              <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg bg-white rounded-3xl p-3 sm:p-4.5 invitation-frame shadow-[0_12px_36px_-8px_rgba(70,50,40,0.12)] rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Thin Inner Gold Border */}
                <div className="border border-[#C49E64]/40 rounded-2xl p-2.5 sm:p-3 bg-[#FAF7F2]/90 flex flex-col items-center">
                  {/* Top Flourish */}
                  <div className="flex items-center gap-2 my-1 text-gold-600">
                    <StarFlourish className="w-2.5 h-2.5" />
                    <span className="text-[10px] uppercase font-serif tracking-[0.25em] text-charcoal-600">
                      The Wedding Mandap
                    </span>
                    <StarFlourish className="w-2.5 h-2.5" />
                  </div>

                  {/* Main Wedding Artwork: User-Provided Watercolor Mandap Illustration */}
                  <div className="relative w-full aspect-[4/3] sm:aspect-square max-h-[300px] sm:max-h-[400px] rounded-xl overflow-hidden bg-white/70 flex items-center justify-center p-2">
                    <Image
                      src="/illustrations/hero-mandap-watercolor.png"
                      alt="Refined hand-painted Indian wedding mandap ceremony illustration with bride, groom, havan kund, and floral pavilion"
                      fill
                      priority
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                  </div>

                  {/* Editorial Caption Tag */}
                  <div className="mt-2 text-center">
                    <span className="text-[11px] font-serif italic text-charcoal-700 tracking-wide">
                      Sacred Pheras & Ceremonial Guest Hospitality
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION 2: "EVERY FUNCTION DESERVES ITS OWN JOURNEY"                  */}
      {/* ========================================================================= */}
      <section id="functions" className="py-20 sm:py-28 bg-[#F5EFE6]/50 border-y border-[#E5DACB]/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <SectionHeader
            eyebrow="Ceremonial Architecture"
            title="Every function deserves"
            highlightedTitle="its own journey."
            description="No generic buses. Each celebration — from afternoon Mehndi to midnight Sangeet — is configured with its own timing, vehicle fleet, and guest pickup logistics."
          />

          {/* Handcrafted Functions Cards: Mobile Horizontal Swipe + Desktop Grid */}
          <HorizontalCardScroller gridCols="md:grid-cols-2 lg:grid-cols-3">
            {FUNCTIONS_DATA.map((fn, idx) => (
              <div
                key={fn.title}
                className={`p-6 sm:p-7 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-gold-400/60 transition-all duration-200 flex flex-col justify-between h-full relative group active:scale-[0.985] ${
                  idx === 3 ? 'md:col-span-2 lg:col-span-1 border-burgundy-300/80' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar with Tag and Timing */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-warm-50 border border-warm-200 text-charcoal-700">
                      {fn.tag}
                    </span>
                    <span className="text-xs font-mono font-medium text-charcoal-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-gold-600" />
                      {fn.timing}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-2xl font-serif font-normal text-charcoal-900 group-hover:text-terracotta-600 transition-colors">
                      {fn.title}
                    </h3>
                    <p className="mt-2 text-xs text-charcoal-600 leading-relaxed font-sans">
                      {fn.desc}
                    </p>
                  </div>

                  {/* Transport Strategy Strip */}
                  <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-terracotta-600" />
                      Allocated Fleet
                    </div>
                    <div className="text-xs font-semibold text-charcoal-800">
                      {fn.fleetType}
                    </div>
                    <div className="text-[11px] text-charcoal-500 italic font-sans">
                      {fn.details}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-warm-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-charcoal-400 font-sans">
                    Independent function manifest
                  </span>
                  <button
                    onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                    className="font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1 transition-colors"
                  >
                    <span>Configure</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Final Card: Custom Ceremonies */}
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-terracotta-50/80 via-white to-warm-50 border border-terracotta-200 shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-terracotta-400/80 transition-all duration-200 flex flex-col justify-between h-full active:scale-[0.985]">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-white border border-terracotta-200 text-terracotta-800 inline-block">
                  Bespoke Functions
                </span>
                <h3 className="text-2xl font-serif font-normal text-charcoal-900">
                  Custom Ceremonies & After-Parties
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed font-sans">
                  Have a Sundowner Pool Party, Sufi Night, or Morning Baraat Assembly? Create as many standalone function records as your wedding requires.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-terracotta-200/60">
                <button
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="w-full py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-sm"
                >
                  Create Custom Function
                </button>
              </div>
            </div>
          </HorizontalCardScroller>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION 3: "FROM INVITATION TO ARRIVAL" (THE SAFAR JOURNEY)           */}
      {/* ========================================================================= */}
      <section id="journey" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <SectionHeader
          eyebrow="The 5-Stage Protocol"
          title="From invitation"
          highlightedTitle="to graceful arrival."
          description="A continuous handcrafted journey uniting hosts, guests, and ceremonial chauffeurs under one intuitive mobility rhythm."
        />

        {/* 5-Step Process: Mobile Horizontal Swipe + Desktop 5-Column Line */}
        <div className="relative">
          {/* Subtle connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 border-t border-dashed border-[#C49E64]/50 -translate-y-6 pointer-events-none" />

          <HorizontalCardScroller gridCols="md:grid-cols-3 lg:grid-cols-5">
            {JOURNEY_STEPS.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-gold-400/60 active:scale-[0.985] transition-all duration-200 flex flex-col justify-between h-full space-y-4 relative z-10"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-terracotta-50 border border-terracotta-200/80 text-terracotta-700 font-serif font-bold text-sm flex items-center justify-center shadow-2xs mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-serif font-normal text-charcoal-900">
                    {step.title}
                  </h3>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gold-700 mt-0.5 font-sans">
                    {step.subtitle}
                  </div>
                  <p className="text-xs text-charcoal-600 leading-relaxed mt-2.5 font-sans">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-2 text-[10px] text-charcoal-400 font-medium font-sans">
                  ✦ Stage {step.num} complete
                </div>
              </div>
            ))}
          </HorizontalCardScroller>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION 4: GUEST & FAMILY MANAGEMENT (ALTERNATING EDITORIAL COMPOSITION) */}
      {/* ========================================================================= */}
      <section id="families" className="py-20 sm:py-28 bg-[#F5EFE6]/60 border-y border-[#E5DACB]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Alternating Layout: Visual Manifests on Left, Narrative Text on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column (Desktop Order 1): Editorial Family Representation Cards */}
            <div className="lg:col-span-7 space-y-4 lg:order-1">
              {/* Example Card 1: The Shah Family */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-md hover:border-gold-400/60 transition-all space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 flex items-center justify-center font-serif font-bold text-base shrink-0 shadow-2xs">
                      S
                    </div>
                    <div>
                      <h4 className="text-base font-serif font-bold text-charcoal-900">The Shah Family</h4>
                      <span className="text-[11px] text-charcoal-500 font-sans">Groom’s Immediate Family • 4 Members</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Chauffeur Allocated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Pickup Origin</span>
                    <span className="font-bold text-charcoal-800">Ahmedabad Airport (AMD)</span>
                    <span className="text-[11px] text-charcoal-500 block">Flight 6E-204 • 14:15 Arrival</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Destination</span>
                    <span className="font-bold text-charcoal-800">Hyatt Regency</span>
                    <span className="text-[11px] text-charcoal-500 block">Rooms 401 & 402</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Assigned Chauffeur</span>
                    <span className="font-bold text-charcoal-800">Rohit Sharma</span>
                    <span className="text-[11px] text-terracotta-600 block font-medium">Innova Crysta (GJ 01 AB 8899)</span>
                  </div>
                </div>
              </div>

              {/* Example Card 2: The Patel Family */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-md hover:border-gold-400/60 transition-all space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sage-50 border border-sage-200 text-sage-700 flex items-center justify-center font-serif font-bold text-base shrink-0 shadow-2xs">
                      P
                    </div>
                    <div>
                      <h4 className="text-base font-serif font-bold text-charcoal-900">The Patel Family</h4>
                      <span className="text-[11px] text-charcoal-500 font-sans">Bride’s Maternal Relatives • 2 Members</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Chauffeur Allocated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Pickup Origin</span>
                    <span className="font-bold text-charcoal-800">Gandhinagar Station</span>
                    <span className="text-[11px] text-charcoal-500 block">Vande Bharat Express</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Destination</span>
                    <span className="font-bold text-charcoal-800">Grand Bhagwati Banquet</span>
                    <span className="text-[11px] text-charcoal-500 block">Sangeet Ceremony</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E2D9]">
                    <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Assigned Chauffeur</span>
                    <span className="font-bold text-charcoal-800">Vikramaditya Rao</span>
                    <span className="text-[11px] text-terracotta-600 block font-medium">Toyota Camry (GJ 01 CD 4321)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Desktop Order 2): Narrative Text */}
            <div className="lg:col-span-5 space-y-6 lg:order-2">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-800 bg-white/90 px-3.5 py-1.5 rounded-full border border-sage-200 shadow-2xs">
                <Home className="w-3.5 h-3.5 text-sage-700" />
                <span>Family-Centric Hospitality</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal font-serif text-charcoal-900 tracking-tight leading-[1.12]">
                Families stay together, <br />
                <span className="italic text-terracotta-600">from touchdown to mandap.</span>
              </h2>

              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed font-sans">
                We believe wedding guests should never be treated as isolated spreadsheet rows. SAFAR understands family hierarchies: the elders traveling with their children, party sizes, and luggage requirements are managed as cohesive units.
              </p>

              <div className="space-y-3 pt-2 font-sans">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </div>
                  <div className="text-xs text-charcoal-700 leading-normal">
                    <span className="font-bold text-charcoal-900">Excel Batch Import & Template:</span> Validate guest names, mobile numbers, and dietary notes in seconds with real preview and duplicate resolution.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </div>
                  <div className="text-xs text-charcoal-700 leading-normal">
                    <span className="font-bold text-charcoal-900">Family Manifest Grouping:</span> Manage cars, hotel rooms, and pickups collectively so families ride comfortably together.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                  </div>
                  <div className="text-xs text-charcoal-700 leading-normal">
                    <span className="font-bold text-charcoal-900">Function-Scoped Attendance:</span> Guests imported into the Sangeet are cleanly isolated from the Reception unless designated to attend both.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
                  className="px-6 py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-sm"
                >
                  Manage Guest Manifests
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION 5: THE CEREMONIAL FLEET                                        */}
      {/* ========================================================================= */}
      <section id="fleet" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <SectionHeader
          eyebrow="Curated Mobility"
          title="Vehicles suited for"
          highlightedTitle="ceremonial grace."
          description="All vehicle availability comes directly from your real host fleet database. No hardcoded or fictitious availability."
        />

        {/* Fleet Cards: Mobile Horizontal Swipe + Desktop 4-Column Grid */}
        <HorizontalCardScroller gridCols="md:grid-cols-2 lg:grid-cols-4">
          {FLEET_CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-gold-400/60 active:scale-[0.985] transition-all duration-200 flex flex-col justify-between h-full space-y-5"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-warm-50 border border-warm-200 text-terracotta-600 flex items-center justify-center shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-charcoal-900">{cat.name}</h3>
                  <span className="text-[11px] text-terracotta-700 font-semibold block mt-0.5 font-sans">
                    {cat.idealFor}
                  </span>
                </div>
                <div className="text-xs text-charcoal-600 font-medium font-sans">
                  {cat.capacity}
                </div>
              </div>

              <div className="pt-4 border-t border-warm-100">
                <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider font-sans">
                  Representative Fleet
                </span>
                <span className="text-xs font-semibold text-charcoal-800 font-sans mt-0.5 block">
                  {cat.models}
                </span>
              </div>
            </div>
          ))}
        </HorizontalCardScroller>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECTION 6: FINAL EDITORIAL INVITATION CALL TO ACTION                   */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative p-8 sm:p-14 rounded-3xl bg-[#1F2421] text-[#FAF7F2] overflow-hidden shadow-2xl text-center space-y-8">
          {/* Subtle Decorative Arch in Card Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <IndianArchOutline className="w-96 h-96 text-gold-400" />
          </div>

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-gold-400">
              <StarFlourish className="w-2.5 h-2.5 text-gold-400" />
              SAFAR Wedding Mobility
              <StarFlourish className="w-2.5 h-2.5 text-gold-400" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight leading-tight">
              Your celebration is the destination. <br />
              <span className="italic text-gold-400 font-light">
                We’ll take care of the journey.
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-[#D4C4B0] leading-relaxed max-w-lg mx-auto">
              Set up your wedding functions in minutes, import your guest spreadsheet, and offer your family the timeless luxury of effortless travel.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openAuthWithRole(UserRole.EVENT_ORGANIZER)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold uppercase tracking-[0.16em] shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Plan Your Safar →
            </button>

            <button
              onClick={() => setJoinModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-gold-400/40 hover:bg-white/10 text-xs font-semibold text-gold-300 uppercase tracking-[0.14em] transition-all"
            >
              Join an Existing Event
            </button>
          </div>

          <div className="relative z-10 text-[11px] text-[#A89885] italic pt-2">
            Production-ready backend • Scoped to authenticated host • Real-time dispatching
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER: WEDDING STATIONERY ELEGANCE                                    */}
      {/* ========================================================================= */}
      <footer className="pt-12 pb-10 border-t border-[#E5DACB]/80 text-xs text-charcoal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#E5DACB]/60">
            <div className="space-y-1">
              <SafarLogo size="md" variant="editorial" showTagline={false} />
              <p className="text-[11px] text-charcoal-500 font-serif italic">
                Regal event mobility platform for celebrations and wedding journeys.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              <a href="#functions" className="hover:text-terracotta-600">The Functions</a>
              <a href="#journey" className="hover:text-terracotta-600">The Journey</a>
              <a href="#families" className="hover:text-terracotta-600">Families</a>
              <a href="#fleet" className="hover:text-terracotta-600">Fleet</a>
              <button
                onClick={() => openAuthWithRole(UserRole.DRIVER)}
                className="hover:text-terracotta-600"
              >
                Chauffeur Portal
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-charcoal-500">
            <div>
              © 2026 SAFAR Mobility Inc. All rights reserved. Handcrafted for bespoke Indian weddings.
            </div>
            <div className="flex items-center gap-4">
              <span>Ahmedabad</span>
              <span>•</span>
              <span>Jaipur</span>
              <span>•</span>
              <span>Udaipur</span>
              <span>•</span>
              <span>Delhi NCR</span>
              <span>•</span>
              <span>Mumbai</span>
              <span>•</span>
              <span>Goa</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 9. JOIN EVENT CODE POPUP MODAL                                            */}
      {/* ========================================================================= */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl border border-[#C49E64]/50 shadow-2xl max-w-sm w-full p-6 space-y-4 invitation-frame">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarFlourish className="w-3 h-3 text-gold-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-700">
                  Guest Invitation Access
                </span>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-serif font-bold text-charcoal-900">Enter Wedding Code</h3>
              <p className="text-xs text-charcoal-600 mt-1">
                Enter the 6-character code from your wedding invitation card to view your itinerary and assigned chauffeur.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gold-600 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  maxLength={8}
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SGT26X"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D5C7B5] bg-white font-mono text-center tracking-widest text-sm font-bold text-charcoal-900 focus:ring-2 focus:ring-terracotta-500 focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all"
              >
                View Itinerary & Ride
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Authentication Modal with Role Switching */}
      <AuthModal
        isOpen={authModalOpen}
        defaultRole={authRole}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
