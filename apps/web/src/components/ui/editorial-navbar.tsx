'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SafarLogo } from './safar-logo';
import { UserRole } from '@safar/types';
import { AuthStatus } from '../../context/auth-context';
import {
  MarigoldFlower,
  OliveBranch,
  JasmineBloom,
  StarFlourish,
  FloralDivider,
  IndianArchOutline,
} from './botanical-ornaments';
import {
  ArrowRight,
  LogOut,
  Menu,
  X,
  KeyRound,
  Calendar,
  Compass,
  Users,
  Car,
  Shield,
  HeartHandshake,
} from 'lucide-react';

interface EditorialNavbarProps {
  authStatus: AuthStatus;
  profile: any;
  role: UserRole | null;
  onOpenAuth: (role: UserRole) => void;
  onOpenJoinModal: () => void;
  onLogout: () => void;
  getRoleDashboard: (role?: UserRole | null) => string;
}

export function EditorialNavbar({
  authStatus,
  profile,
  role,
  onOpenAuth,
  onOpenJoinModal,
  onLogout,
  getRoleDashboard,
}: EditorialNavbarProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  // Lock body scroll and listen to Escape key when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  // High-performance scroll listener with requestAnimationFrame
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          // Float progressively past 20px
          setIsFloating(currentY > 20);

          // Update active section
          const sections = ['events', 'functions', 'how-it-works', 'journey', 'hosts', 'families', 'guests', 'fleet'];
          for (const sectionId of sections) {
            const el = document.getElementById(sectionId);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= 260 && rect.bottom >= 200) {
                if (sectionId === 'functions' || sectionId === 'events') setActiveSection('events');
                else if (sectionId === 'journey' || sectionId === 'how-it-works') setActiveSection('how-it-works');
                else if (sectionId === 'families' || sectionId === 'hosts') setActiveSection('hosts');
                else if (sectionId === 'fleet' || sectionId === 'guests') setActiveSection('guests');
                break;
              }
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    {
      name: 'Events',
      subtitle: 'The Functions: Sangeet, Mehndi, Haldi & Pheras',
      href: '#events',
      id: 'events',
      icon: Calendar,
    },
    {
      name: 'How It Works',
      subtitle: 'The 5-Stage Ceremonial Journey',
      href: '#how-it-works',
      id: 'how-it-works',
      icon: Compass,
    },
    {
      name: 'For Hosts',
      subtitle: 'Host Dashboard & Fleet Management',
      href: '#hosts',
      id: 'hosts',
      icon: Users,
    },
    {
      name: 'For Guests',
      subtitle: 'Guest Manifest & Arrival Convoys',
      href: '#guests',
      id: 'guests',
      icon: Car,
    },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = href;
    }
  };

  const handleStartPlanning = () => {
    setMobileMenuOpen(false);
    if (authStatus === 'AUTHENTICATED') {
      window.location.href = getRoleDashboard(role);
    } else {
      onOpenAuth(UserRole.EVENT_ORGANIZER);
    }
  };

  const handleJoinClick = () => {
    setMobileMenuOpen(false);
    onOpenJoinModal();
  };

  const handleLoginClick = () => {
    setMobileMenuOpen(false);
    onOpenAuth(UserRole.EVENT_ORGANIZER);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FIXED NAVBAR CONTAINER (MOBILE-FIRST ARCHITECTURE)                     */}
      {/* ========================================================================= */}
      <header
        role="banner"
        className="fixed inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{
          top: isFloating ? 'max(env(safe-area-inset-top, 0px) + 8px, 12px)' : '0px',
        }}
      >
        <div
          className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none flex items-center justify-between ${
            isFloating
              ? 'w-[calc(100%-2rem)] sm:w-[calc(100%-2.5rem)] md:w-[90%] lg:w-[84%] max-w-5xl lg:max-w-6xl h-14 sm:h-16 px-3.5 sm:px-6 rounded-full apple-glass-floating shadow-[0_10px_32px_-4px_rgba(31,36,33,0.08),0_2px_8px_0_rgba(31,36,33,0.02),inset_0_1px_1px_0_rgba(255,255,255,0.95)]'
              : 'w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 rounded-none bg-transparent border-b border-transparent'
          }`}
          style={{
            paddingTop: isFloating ? undefined : 'max(env(safe-area-inset-top, 0px), 14px)',
          }}
        >
          {/* Left: SAFAR Monogram & Wordmark */}
          <Link
            href="/"
            className="group flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 rounded-full"
            aria-label="SAFAR Home"
          >
            <SafarLogo
              size={isFloating ? 'sm' : 'md'}
              variant="editorial"
              showTagline={false}
              className="transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Center: Desktop Navigation Links (Progressively Enhanced for md/lg) */}
          <nav
            aria-label="Ceremony Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-1.5 p-1 rounded-full"
          >
            {navLinks.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`relative px-3 lg:px-3.5 py-1.5 rounded-full text-xs font-medium tracking-[0.14em] uppercase transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'text-terracotta-700 font-semibold bg-white/70 shadow-2xs'
                      : 'text-charcoal-700 hover:text-terracotta-700 hover:bg-white/40'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-terracotta-500" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right: Actions for Desktop & Tablet */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Join Event Button */}
            <button
              onClick={handleJoinClick}
              className={`px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                isFloating
                  ? 'bg-white/80 hover:bg-white text-charcoal-800 border border-white/80 shadow-2xs active:scale-95'
                  : 'bg-white/60 hover:bg-white text-charcoal-800 border border-charcoal-300/60 shadow-2xs active:scale-95'
              }`}
              title="Enter digital guest pass code"
            >
              <KeyRound className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Join Event</span>
            </button>

            {/* Auth / Dashboard Controls */}
            {authStatus === 'AUTHENTICATED' && profile ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href={getRoleDashboard(role)}
                  className="px-4 py-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold tracking-wider uppercase shadow-xs flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-warm-300" />
                </Link>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-full text-charcoal-500 hover:text-charcoal-900 hover:bg-white/60 transition-colors cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoginClick}
                  className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-charcoal-600 hover:text-charcoal-900 transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={handleStartPlanning}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-700 hover:to-terracotta-800 text-white text-xs font-bold tracking-wider uppercase shadow-xs flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <span>Start Planning</span>
                  <ArrowRight className="w-3.5 h-3.5 text-warm-200" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Mobile Menu Button (Minimal 44x44px Touch Target) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-full text-charcoal-800 hover:bg-white/60 active:bg-white/80 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 cursor-pointer"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-charcoal-800" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. FULL-SCREEN EDITORIAL MOBILE MENU                                      */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Main Navigation Menu"
          className="fixed inset-0 z-50 md:hidden bg-[#FAF7F2] paper-texture flex flex-col justify-between overflow-y-auto animate-in fade-in duration-300"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
          }}
        >
          {/* Subtle Handcrafted Botanical Watermarks */}
          <div className="absolute top-4 right-4 pointer-events-none opacity-40">
            <MarigoldFlower className="w-16 h-16 text-terracotta-500" />
          </div>
          <div className="absolute top-12 right-14 pointer-events-none opacity-30">
            <OliveBranch className="w-12 h-12 text-sage-600" />
          </div>
          <div className="absolute bottom-8 left-4 pointer-events-none opacity-35">
            <JasmineBloom className="w-10 h-10 text-gold-600" />
          </div>
          <div className="absolute bottom-16 left-12 pointer-events-none opacity-20">
            <IndianArchOutline className="w-20 h-20 text-gold-500" />
          </div>

          {/* Top Bar inside Menu */}
          <div className="relative z-10 px-6 sm:px-8 py-3 flex items-center justify-between border-b border-[#E5DACB]/60">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-2"
              aria-label="SAFAR Home"
            >
              <SafarLogo size="sm" variant="editorial" showTagline={false} />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="min-w-[44px] min-h-[44px] p-2 rounded-full text-charcoal-700 hover:text-charcoal-950 hover:bg-warm-100 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-6 h-6 text-charcoal-800" />
            </button>
          </div>

          {/* Main Navigation Links (Large Elegant Serif) */}
          <div className="relative z-10 px-6 sm:px-8 py-8 sm:py-10 flex-1 flex flex-col justify-center space-y-6">
            <nav aria-label="Mobile Navigation Links" className="space-y-4 sm:space-y-5">
              {navLinks.map((item, idx) => {
                return (
                  <div
                    key={item.id}
                    className="border-b border-[#E5DACB]/40 pb-3 transition-all duration-300"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <a
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className="group flex items-baseline justify-between py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 rounded-lg cursor-pointer"
                    >
                      <div>
                        <span className="font-serif text-2xl sm:text-3xl tracking-[0.12em] font-medium text-charcoal-900 group-hover:text-terracotta-600 transition-colors uppercase block">
                          {item.name}
                        </span>
                        <span className="text-[11px] sm:text-xs text-charcoal-500 tracking-wider block mt-0.5 font-sans">
                          {item.subtitle}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-terracotta-600 group-hover:translate-x-1 transition-all" />
                    </a>
                  </div>
                );
              })}

              {/* Join Event code row */}
              <div className="border-b border-[#E5DACB]/40 pb-3">
                <button
                  onClick={handleJoinClick}
                  className="w-full text-left group flex items-baseline justify-between py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 rounded-lg cursor-pointer"
                >
                  <div>
                    <span className="font-serif text-2xl sm:text-3xl tracking-[0.12em] font-medium text-charcoal-900 group-hover:text-terracotta-600 transition-colors uppercase block">
                      Join Event
                    </span>
                    <span className="text-[11px] sm:text-xs text-charcoal-500 tracking-wider block mt-0.5 font-sans">
                      Enter Digital Wedding Invitation Code
                    </span>
                  </div>
                  <KeyRound className="w-4 h-4 text-terracotta-600 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </nav>

            {/* Editorial Divider */}
            <div className="pt-2">
              <FloralDivider className="w-full max-w-xs mx-auto text-gold-500/80" />
            </div>
          </div>

          {/* Bottom Actions & Role Handling */}
          <div className="relative z-10 px-6 sm:px-8 pt-4 pb-2 space-y-3">
            {authStatus === 'AUTHENTICATED' && profile ? (
              <div className="space-y-2.5">
                <Link
                  href={getRoleDashboard(role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3.5 rounded-full bg-charcoal-900 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-transform"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-warm-300" />
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 text-center text-xs font-medium tracking-wider text-charcoal-500 hover:text-charcoal-800 transition-colors cursor-pointer"
                >
                  Sign Out of Account
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleStartPlanning}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-700 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-transform cursor-pointer"
                >
                  <span>Start Planning</span>
                  <ArrowRight className="w-4 h-4 text-warm-200" />
                </button>
                <button
                  onClick={handleLoginClick}
                  className="w-full py-2 text-center text-xs font-medium tracking-wider uppercase text-charcoal-600 hover:text-charcoal-900 transition-colors cursor-pointer"
                >
                  Login to Existing Account
                </button>
              </div>
            )}

            {/* Editorial Footer Tagline */}
            <p className="text-center text-[10px] sm:text-[11px] text-charcoal-400 tracking-widest uppercase font-sans pt-2">
              SAFAR • The Wedding Mobility House
            </p>
          </div>
        </div>
      )}
    </>
  );
}
