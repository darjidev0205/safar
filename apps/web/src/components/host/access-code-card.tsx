'use client';

import React, { useState } from 'react';
import { Copy, Check, RefreshCw, KeyRound, ShieldCheck, Users } from 'lucide-react';

interface AccessCodeCardProps {
  eventName: string;
  driverCode: string;
  guestCode: string;
  onManageCodes?: () => void;
  onRegenerate?: (type: 'DRIVER' | 'GUEST') => Promise<void> | void;
  className?: string;
}

export function AccessCodeCard({
  eventName,
  driverCode,
  guestCode,
  onManageCodes,
  onRegenerate,
  className = '',
}: AccessCodeCardProps) {
  const [copiedType, setCopiedType] = useState<'DRIVER' | 'GUEST' | null>(null);

  const handleCopy = (code: string, type: 'DRIVER' | 'GUEST') => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div
      className={`p-5 rounded-3xl bg-white border border-[#E8E2D9] shadow-card flex flex-col justify-between font-sans ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-300/80 flex items-center justify-center text-charcoal-700">
              <KeyRound className="w-4 h-4 text-gold-600" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-charcoal-900 tracking-tight">
                Event Access Passcodes
              </h3>
              <p className="text-[11px] text-charcoal-500 font-sans">
                {eventName || 'Master Celebration'}
              </p>
            </div>
          </div>
          {onManageCodes && (
            <button
              onClick={onManageCodes}
              className="text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors flex items-center gap-1"
            >
              <span>Manage Codes</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {/* Driver Code Box */}
          <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                <ShieldCheck className="w-3 h-3 text-terracotta-600" />
                <span>Driver Passcode</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-charcoal-900 tracking-wider">
                {driverCode || '—'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(driverCode, 'DRIVER')}
                disabled={!driverCode}
                className="p-2 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-100 transition-colors disabled:opacity-40"
                title="Copy Driver Code"
              >
                {copiedType === 'DRIVER' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate('DRIVER')}
                  className="p-2 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-100 transition-colors"
                  title="Regenerate Driver Code"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Guest Code Box */}
          <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                <Users className="w-3 h-3 text-gold-600" />
                <span>Guest Passcode</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-charcoal-900 tracking-wider">
                {guestCode || '—'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(guestCode, 'GUEST')}
                disabled={!guestCode}
                className="p-2 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-100 transition-colors disabled:opacity-40"
                title="Copy Guest Code"
              >
                {copiedType === 'GUEST' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate('GUEST')}
                  className="p-2 rounded-xl text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-100 transition-colors"
                  title="Regenerate Guest Code"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
