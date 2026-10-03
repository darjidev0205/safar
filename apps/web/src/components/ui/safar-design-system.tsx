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
   2. SAFAR CARD
   ========================================================================= */
export interface SafarCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'paper' | 'parchment' | 'outlined' | 'glass';
  elevation?: 'none' | 'subtle' | 'botanical';
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
    surface: 'bg-white border border-warm-200/90 text-charcoal-900',
    paper: 'paper-texture border border-warm-300/80 text-charcoal-900',
    parchment: 'bg-warm-100/70 border border-warm-200 text-charcoal-900',
    outlined: 'bg-transparent border border-warm-300/80 text-charcoal-900',
    glass: 'apple-glass-floating text-charcoal-900',
  };

  const elevationStyles = {
    none: '',
    subtle: 'shadow-2xs',
    botanical: 'botanical-shadow',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:border-warm-400 hover:shadow-sm transition-all duration-200 transform hover:-translate-y-0.5'
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
