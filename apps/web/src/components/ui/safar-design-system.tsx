'use client';

import React from 'react';
import Link from 'next/link';
import { StarFlourish, MarigoldFlower, OliveBranch } from './botanical-ornaments';

/* =========================================================================
   1. SAFAR BUTTON
   ========================================================================= */
export interface SafarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const SafarButton = React.forwardRef<HTMLButtonElement, SafarButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      isLoading,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed';

    const sizes = {
      sm: 'px-3.5 py-1.5 text-xs rounded-full gap-1.5',
      md: 'px-5 py-2.5 text-xs md:text-sm rounded-full gap-2 shadow-2xs hover:shadow-xs active:scale-[0.99]',
      lg: 'px-7 py-3.5 text-sm md:text-base rounded-full gap-2.5 shadow-xs hover:shadow-sm active:scale-[0.99]',
    };

    const variants = {
      primary:
        'bg-charcoal-900 text-warm-50 hover:bg-charcoal-800 hover:text-white border border-charcoal-900 shadow-charcoal-900/10',
      secondary:
        'bg-white/90 text-charcoal-800 hover:bg-warm-100/80 border border-warm-300 hover:border-warm-400 text-charcoal-800',
      outline:
        'bg-white text-charcoal-800 hover:bg-warm-100/80 border border-warm-300 hover:border-warm-400 text-charcoal-800 shadow-2xs',
      accent:
        'bg-terracotta-600 text-white hover:bg-terracotta-700 border border-terracotta-700 shadow-terracotta-600/20',
      danger:
        'bg-burgundy-50 text-burgundy-800 hover:bg-burgundy-100 border border-burgundy-200',
      ghost:
        'bg-transparent text-charcoal-700 hover:bg-warm-100/70 hover:text-charcoal-900 border border-transparent',
      glass:
        'apple-glass-floating text-charcoal-900 hover:bg-white/90 border border-white/80',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {!isLoading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
        {!isLoading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);
SafarButton.displayName = 'SafarButton';

/* =========================================================================
   2. SAFAR CARD (CORE FOUNDATION)
   ========================================================================= */
export interface SafarCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'paper' | 'parchment' | 'outlined' | 'glass';
  elevation?: 'none' | 'subtle' | 'botanical' | 'elevated';
  interactive?: boolean;
}

export function SafarCard({
  children,
  variant = 'surface',
  elevation = 'subtle',
  interactive = false,
  className = '',
  ...props
}: SafarCardProps) {
  const variantStyles = {
    surface: 'bg-white border border-[#E8E2D9] text-charcoal-900',
    paper: 'paper-texture border border-warm-300/80 text-charcoal-900',
    parchment: 'bg-[#FDFBF7] border border-[#E8E2D9] text-charcoal-900',
    outlined: 'bg-transparent border border-warm-300/80 text-charcoal-900',
    glass: 'apple-glass-floating text-charcoal-900',
  };

  const elevationStyles = {
    none: '',
    subtle: 'shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)]',
    elevated: 'shadow-[0_12px_36px_-6px_rgba(70,50,40,0.09),0_4px_12px_-2px_rgba(70,50,40,0.04)]',
    botanical: 'botanical-shadow',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:border-gold-400/60 hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.985]'
    : '';

  return (
    <div
      className={`rounded-3xl p-5 md:p-6 ${variantStyles[variant]} ${elevationStyles[elevation]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* =========================================================================
   3. SAFAR GLASS CARD
   ========================================================================= */
export function SafarGlassCard({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`apple-glass-floating rounded-3xl p-5 md:p-6 text-charcoal-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* =========================================================================
   4. SAFAR BADGE
   ========================================================================= */
export interface SafarBadgeProps {
  children: React.ReactNode;
  variant?:
    | 'sangeet'
    | 'mehndi'
    | 'haldi'
    | 'wedding'
    | 'reception'
    | 'custom'
    | 'neutral'
    | 'sage'
    | 'terracotta'
    | 'gold'
    | 'burgundy'
    | 'teal';
  size?: 'sm' | 'md';
  className?: string;
}

export function SafarBadge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}: SafarBadgeProps) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    sangeet: 'bg-terracotta-50 text-terracotta-800 border border-terracotta-200/80',
    mehndi: 'bg-sage-50 text-sage-800 border border-sage-200/80',
    haldi: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    wedding: 'bg-burgundy-50 text-burgundy-800 border border-burgundy-200/80',
    reception: 'bg-warm-100 text-charcoal-800 border border-warm-300/80',
    custom: 'bg-warm-50 text-charcoal-700 border border-warm-200',
    neutral: 'bg-warm-50 text-charcoal-700 border border-warm-200',
    sage: 'bg-sage-50 text-sage-800 border border-sage-200',
    terracotta: 'bg-terracotta-50 text-terracotta-800 border border-terracotta-200',
    gold: 'bg-amber-50 text-gold-700 border border-gold-300',
    burgundy: 'bg-burgundy-50 text-burgundy-800 border border-burgundy-200',
    teal: 'bg-safar-50 text-safar-800 border border-safar-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/* =========================================================================
   5. SAFAR STATUS INDICATOR
   ========================================================================= */
export type OperationalStatusType =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'OFFLINE'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'PENDING';

export function SafarStatus({
  status,
  label,
  className = '',
}: {
  status: OperationalStatusType | string;
  label?: string;
  className?: string;
}) {
  const norm = (status || '').toUpperCase();

  let dotColor = 'bg-charcoal-400';
  let badgeClasses = 'bg-warm-100 text-charcoal-700 border-warm-200';
  let displayLabel = label || status;

  switch (norm) {
    case 'AVAILABLE':
    case 'CONFIRMED':
      dotColor = 'bg-sage-600';
      badgeClasses = 'bg-sage-50 text-sage-800 border-sage-200/80';
      break;
    case 'ASSIGNED':
    case 'SCHEDULED':
      dotColor = 'bg-gold-500';
      badgeClasses = 'bg-amber-50 text-gold-700 border-gold-300/80';
      break;
    case 'EN_ROUTE':
    case 'EN_ROUTE_TO_PICKUP':
    case 'ARRIVED':
    case 'IN_TRANSIT':
    case 'ACTIVE':
      dotColor = 'bg-terracotta-600 animate-pulse';
      badgeClasses = 'bg-terracotta-50 text-terracotta-800 border-terracotta-200/80';
      break;
    case 'COMPLETED':
      dotColor = 'bg-charcoal-800';
      badgeClasses = 'bg-warm-100 text-charcoal-800 border-warm-300/80';
      break;
    case 'OFFLINE':
    case 'CANCELLED':
    case 'PENDING':
      dotColor = 'bg-burgundy-600';
      badgeClasses = 'bg-burgundy-50 text-burgundy-800 border-burgundy-200/80';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
}

/* =========================================================================
   6. SAFAR PAGE HEADER
   ========================================================================= */
export interface SafarPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  ornament?: boolean;
}

export function SafarPageHeader({
  eyebrow,
  title,
  subtitle,
  children,
  breadcrumbs,
  ornament = true,
}: SafarPageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-warm-200/70 pb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-xs text-charcoal-400 mb-2 font-medium">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-charcoal-800 transition-colors">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-charcoal-700 font-semibold">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {eyebrow && (
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-gold-700 mb-1.5">
            {ornament && <StarFlourish className="w-2.5 h-2.5 text-gold-600" />}
            <span>{eyebrow}</span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-extrabold text-charcoal-900 tracking-tight leading-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 text-xs sm:text-sm text-charcoal-600 max-w-2xl font-sans">
            {subtitle}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}

/* =========================================================================
   7. SAFAR EMPTY STATE
   ========================================================================= */
export interface SafarEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function SafarEmptyState({
  title,
  description,
  actionText,
  onAction,
  icon,
}: SafarEmptyStateProps) {
  return (
    <div className="p-8 md:p-12 rounded-3xl paper-texture border border-warm-200 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-warm-100/90 border border-warm-200/80 text-gold-700 flex items-center justify-center mx-auto mb-4 shadow-2xs">
        {icon || <MarigoldFlower className="w-7 h-7" />}
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
        <h3 className="text-lg font-serif font-bold text-charcoal-900">{title}</h3>
        <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
      </div>

      <p className="text-xs sm:text-sm text-charcoal-600 max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <SafarButton variant="primary" size="md" onClick={onAction}>
          {actionText}
        </SafarButton>
      )}
    </div>
  );
}

/* =========================================================================
   8. SAFAR FORM CONTROLS (Input, Select)
   ========================================================================= */
export interface SafarInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const SafarInput = React.forwardRef<HTMLInputElement, SafarInputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-xs font-semibold text-charcoal-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/60 border border-warm-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 transition-all ${
              error ? 'border-burgundy-400 focus:ring-burgundy-500/20' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-burgundy-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-charcoal-500">{hint}</p>}
      </div>
    );
  }
);
SafarInput.displayName = 'SafarInput';

export interface SafarSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const SafarSelect = React.forwardRef<HTMLSelectElement, SafarSelectProps>(
  ({ label, error, hint, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-xs font-semibold text-charcoal-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-warm-50/60 border border-warm-300 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 transition-all ${
            error ? 'border-burgundy-400 focus:ring-burgundy-500/20' : ''
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[11px] text-burgundy-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-charcoal-500">{hint}</p>}
      </div>
    );
  }
);
SafarSelect.displayName = 'SafarSelect';

/* =========================================================================
   9. REUSABLE HORIZONTAL CARD SCROLLER (MOBILE SWIPE + DESKTOP GRID)
   ========================================================================= */
export interface HorizontalCardScrollerProps {
  children: React.ReactNode;
  className?: string;
  gridCols?: string;
}

export function HorizontalCardScroller({
  children,
  className = '',
  gridCols = 'md:grid-cols-2 lg:grid-cols-3',
}: HorizontalCardScrollerProps) {
  return (
    <div className={`relative w-full ${className}`}>
      {/* 
        Mobile: native touch momentum swipe, scroll-snap-type: x mandatory, hidden scrollbar, 
        ~10-18% of next card visible (w-[82vw] on mobile, sm:w-[340px]).
        Desktop (md+): transforms into standard responsive grid.
      */}
      <div
        className={`flex md:grid overflow-x-auto md:overflow-visible scrollbar-none snap-x snap-mandatory gap-4 sm:gap-5 md:gap-6 -mx-4 px-4 pb-4 pt-1 md:mx-0 md:px-0 md:pb-0 md:pt-0 ${gridCols}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return (
            <div className="shrink-0 snap-start w-[82vw] sm:w-[340px] md:w-auto h-full flex flex-col">
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   10. REUSABLE SECTION HEADER
   ========================================================================= */
export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  highlightedTitle?: string;
  description?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  highlightedTitle,
  description,
  align = 'center',
  action,
  icon,
  className = '',
}: SectionHeaderProps) {
  const isCenter = align === 'center';
  return (
    <div className={`space-y-3 ${isCenter ? 'text-center max-w-2xl mx-auto' : 'max-w-xl'} ${className}`}>
      {eyebrow && (
        <div
          className={`inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta-700 bg-white/90 px-3.5 py-1.5 rounded-full border border-terracotta-200/80 shadow-2xs ${
            isCenter ? 'mx-auto' : ''
          }`}
        >
          {icon || <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />}
          <span>{eyebrow}</span>
          {icon || <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />}
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal font-serif text-charcoal-900 tracking-tight leading-[1.12]">
        {title}{' '}
        {highlightedTitle && (
          <span className="italic font-light text-terracotta-600 block sm:inline">
            {highlightedTitle}
          </span>
        )}
      </h2>

      {description && (
        <p className="text-xs sm:text-sm text-charcoal-600 font-sans leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/* =========================================================================
   11. PREMIUM CARD (GOLD FLOURISH & ELEVATED SURFACE)
   ========================================================================= */
export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  flourish?: boolean;
  interactive?: boolean;
}

export function PremiumCard({
  children,
  flourish = false,
  interactive = true,
  className = '',
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] ${
        interactive
          ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-gold-400/60 active:scale-[0.985] cursor-pointer'
          : ''
      } relative overflow-hidden flex flex-col justify-between ${className}`}
      {...props}
    >
      {flourish && (
        <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
          <StarFlourish className="w-8 h-8 text-gold-600" />
        </div>
      )}
      {children}
    </div>
  );
}

/* =========================================================================
   12. FEATURE CARD (CEREMONIES & HIGHLIGHTS)
   ========================================================================= */
export interface FeatureCardProps {
  eyebrow?: string;
  badge?: React.ReactNode;
  timing?: string;
  title: string;
  description: string;
  fleetType?: string;
  details?: string;
  actionText?: string;
  onAction?: () => void;
  accentBorder?: string;
  className?: string;
}

export function FeatureCard({
  eyebrow,
  badge,
  timing,
  title,
  description,
  fleetType,
  details,
  actionText = 'Configure',
  onAction,
  accentBorder = 'border-[#E8E2D9]',
  className = '',
}: FeatureCardProps) {
  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 bg-white border ${accentBorder} shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(70,50,40,0.1)] hover:border-gold-400/60 transition-all duration-200 flex flex-col justify-between h-full group active:scale-[0.985] ${className}`}
    >
      <div className="space-y-4">
        {/* Eyebrow / Tag & Timing */}
        <div className="flex items-center justify-between gap-2">
          {badge ? (
            badge
          ) : eyebrow ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full bg-warm-50 border border-warm-200 text-charcoal-700">
              {eyebrow}
            </span>
          ) : null}
          {timing && (
            <span className="text-xs font-mono font-medium text-charcoal-500 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
              {timing}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-2xl font-serif font-normal text-charcoal-900 group-hover:text-terracotta-600 transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-xs text-charcoal-600 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* Fleet / Metadata Strip */}
        {(fleetType || details) && (
          <div className="p-3.5 rounded-2xl bg-warm-50/70 border border-warm-200/80 space-y-1.5">
            {fleetType && (
              <div className="text-xs font-semibold text-charcoal-800">
                {fleetType}
              </div>
            )}
            {details && (
              <div className="text-[11px] text-charcoal-500 italic">
                {details}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      {actionText && (
        <div className="mt-6 pt-4 border-t border-warm-100 flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-charcoal-400">
            Dedicated Manifest
          </span>
          <button
            onClick={onAction}
            className="font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1 transition-colors"
          >
            <span>{actionText}</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   13. STAT CARD (DASHBOARDS & METRICS)
   ========================================================================= */
export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  bgColor?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  accentColor = 'text-terracotta-800',
  bgColor = 'bg-terracotta-50 border-terracotta-200/80',
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.05)] hover:shadow-md hover:border-warm-300 transition-all flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider truncate font-sans">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${bgColor} ${accentColor}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
          {value}
        </div>
        {trend && (
          <div className="mt-1 text-[11px] text-charcoal-500 truncate font-medium font-sans">
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   14. DASHBOARD CARD (SECTION CONTAINER WITH HEADER)
   ========================================================================= */
export interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
  ...props
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] p-5 sm:p-6 space-y-4 ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between pb-3 border-b border-warm-100">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-terracotta-600 shrink-0">{icon}</span>}
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-serif font-bold text-charcoal-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-charcoal-500 font-sans mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* =========================================================================
   15. VEHICLE CARD
   ========================================================================= */
export interface VehicleCardProps {
  model: string;
  plateNumber: string;
  category: string;
  capacity?: string | number;
  driverName?: string;
  status?: string;
  action?: React.ReactNode;
  className?: string;
}

export function VehicleCard({
  model,
  plateNumber,
  category,
  capacity,
  driverName,
  status = 'AVAILABLE',
  action,
  className = '',
}: VehicleCardProps) {
  return (
    <div
      className={`rounded-3xl p-5 bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-md hover:border-gold-400/60 transition-all flex flex-col justify-between space-y-4 ${className}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-warm-50 border border-warm-200 text-charcoal-700">
            {category}
          </span>
          <SafarStatus status={status} />
        </div>

        <div>
          <h4 className="text-base font-serif font-bold text-charcoal-900">{model}</h4>
          <span className="text-xs font-mono text-terracotta-600 font-medium block mt-0.5">
            {plateNumber}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-warm-50/70 border border-warm-200/80 space-y-1 text-xs">
          {capacity && (
            <div className="text-charcoal-600 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Capacity</span>
              <span className="font-semibold text-charcoal-800">{capacity} Passengers</span>
            </div>
          )}
          {driverName && (
            <div className="text-charcoal-600 flex items-center justify-between pt-1 border-t border-warm-200/50">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Chauffeur</span>
              <span className="font-semibold text-charcoal-800">{driverName}</span>
            </div>
          )}
        </div>
      </div>

      {action && <div className="pt-2 border-t border-warm-100">{action}</div>}
    </div>
  );
}

/* =========================================================================
   16. GUEST / FAMILY CARD
   ========================================================================= */
export interface GuestCardProps {
  familyName: string;
  category?: string;
  memberCount: number;
  pickupOrigin?: string;
  destination?: string;
  chauffeur?: string;
  vehicle?: string;
  statusBadge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function GuestCard({
  familyName,
  category = 'Wedding Guests',
  memberCount,
  pickupOrigin,
  destination,
  chauffeur,
  vehicle,
  statusBadge,
  action,
  className = '',
}: GuestCardProps) {
  const initial = familyName.charAt(0).toUpperCase() || 'F';
  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] hover:shadow-md hover:border-gold-400/60 transition-all space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-warm-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 flex items-center justify-center font-serif font-bold text-base shrink-0 shadow-2xs">
            {initial}
          </div>
          <div>
            <h4 className="text-base font-serif font-bold text-charcoal-900">{familyName}</h4>
            <span className="text-[11px] text-charcoal-500 font-sans">
              {category} • {memberCount} {memberCount === 1 ? 'Guest' : 'Members'}
            </span>
          </div>
        </div>
        {statusBadge}
      </div>

      {(pickupOrigin || destination || chauffeur) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
          {pickupOrigin && (
            <div className="p-3 rounded-xl bg-warm-50/70 border border-warm-200/80">
              <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Pickup Origin</span>
              <span className="font-bold text-charcoal-800">{pickupOrigin}</span>
            </div>
          )}
          {destination && (
            <div className="p-3 rounded-xl bg-warm-50/70 border border-warm-200/80">
              <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Destination</span>
              <span className="font-bold text-charcoal-800">{destination}</span>
            </div>
          )}
          {chauffeur && (
            <div className="p-3 rounded-xl bg-warm-50/70 border border-warm-200/80">
              <span className="text-[10px] text-charcoal-400 font-semibold block uppercase">Assigned Chauffeur</span>
              <span className="font-bold text-charcoal-800">{chauffeur}</span>
              {vehicle && (
                <span className="text-[11px] text-terracotta-600 block font-medium mt-0.5">
                  {vehicle}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {action && <div className="pt-2 border-t border-warm-100">{action}</div>}
    </div>
  );
}

/* =========================================================================
   17. REUSABLE IMAGE + TEXT SECTION (EDITORIAL RESPONSIVE COMPOSITION)
   ========================================================================= */
export interface ImageTextSectionProps {
  eyebrow?: string;
  title: string;
  highlightedTitle?: string;
  description: string;
  features?: { text: string }[];
  action?: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean; // Alternates layout (Text|Image vs Image|Text)
  className?: string;
}

export function ImageTextSection({
  eyebrow,
  title,
  highlightedTitle,
  description,
  features,
  action,
  visual,
  reverse = false,
  className = '',
}: ImageTextSectionProps) {
  return (
    <section className={`py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {/* 
        Desktop: 2 proportional columns (col-span-5 / col-span-7), with alternating reverse support.
        Mobile: responsive proportional layout where text and visual remain visually connected
        without huge vertical gaps or microscopic text.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Narrative Text Column */}
        <div
          className={`space-y-6 lg:col-span-5 ${
            reverse ? 'lg:order-2' : 'lg:order-1'
          }`}
        >
          {eyebrow && (
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-terracotta-700 bg-white/90 px-3.5 py-1.5 rounded-full border border-terracotta-200/80 shadow-2xs">
              <StarFlourish className="w-2.5 h-2.5 text-terracotta-600" />
              <span>{eyebrow}</span>
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal font-serif text-charcoal-900 tracking-tight leading-[1.14]">
            {title}{' '}
            {highlightedTitle && (
              <span className="italic font-light text-terracotta-600 block sm:inline">
                {highlightedTitle}
              </span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-charcoal-600 font-sans leading-relaxed">
            {description}
          </p>

          {features && features.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {features.map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-charcoal-700">
                  <div className="w-4 h-4 rounded-full bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    ✓
                  </div>
                  <span>{feat.text}</span>
                </div>
              ))}
            </div>
          )}

          {action && <div className="pt-2">{action}</div>}
        </div>

        {/* Visual / Image / Cards Column */}
        <div
          className={`lg:col-span-7 ${
            reverse ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          {visual}
        </div>
      </div>
    </section>
  );
}

