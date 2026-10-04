'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QrCode, CheckCircle2, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function DriverVerificationPage() {
  const [code, setCode] = useState('');
  const [verifiedPassenger, setVerifiedPassenger] = useState<any>(null);
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (code.length < 4) {
      const nextCode = code + num;
      setCode(nextCode);
      if (nextCode.length === 4) {
        verify(nextCode);
      }
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
    setError(false);
  };

  const verify = (c: string) => {
    if (c === '4827' || c === '1234') {
      setVerifiedPassenger({
        name: 'Aarav Patel',
        partySize: 4,
        group: 'Groom Immediate Family',
        room: 'Hotel Suite 402',
        dropoff: 'The Celebration Venue (North Lawn)',
        status: 'CONFIRMED_VALID',
      });
      setError(false);
    } else {
      setError(true);
      setVerifiedPassenger(null);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 font-sans">
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-2xl bg-terracotta-50 border border-terracotta-200/70 text-terracotta-700 mx-auto flex items-center justify-center">
          <QrCode className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-terracotta-700 block">
          Guest Boarding
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 font-serif">
          Verify Boarding Code
        </h1>
        <p className="text-xs text-charcoal-500">
          Request the 4-digit verification code from the guest&apos;s mobile pass.
        </p>
      </div>

      {/* Code Display */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_4px_20px_-4px_rgba(70,50,40,0.04)] text-center space-y-5">
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-mono font-bold transition-all ${
                code[idx]
                  ? 'border-terracotta-600 bg-terracotta-50/50 text-terracotta-900 shadow-xs'
                  : 'border-[#E8E2D9] bg-[#FDFBF7] text-charcoal-400'
              }`}
            >
              {code[idx] || '•'}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Invalid code. (Expected test code: 4827 or 1234)</span>
          </div>
        )}

        {/* Verified Passenger Details Card */}
        {verifiedPassenger && (
          <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-left space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Boarding Authorized
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>

            <div>
              <h3 className="font-bold text-base text-charcoal-900 font-serif">{verifiedPassenger.name}</h3>
              <p className="text-xs text-charcoal-700 font-medium">
                Party of {verifiedPassenger.partySize} &bull; {verifiedPassenger.group}
              </p>
              <p className="text-[11px] text-charcoal-500 mt-1">
                Destination: {verifiedPassenger.dropoff}
              </p>
            </div>

            <Link
              href="/driver"
              className="w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              <span>Confirm Boarding &amp; Return</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Numeric Keypad */}
        {!verifiedPassenger && (
          <div className="grid grid-cols-3 gap-2.5 pt-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'C') {
                    setCode('');
                    setError(false);
                  } else if (key === '⌫') {
                    handleBackspace();
                  } else {
                    handleKeyPress(key);
                  }
                }}
                className="py-3.5 rounded-2xl border border-[#E8E2D9] bg-[#FDFBF7] hover:bg-warm-100 text-base font-bold text-charcoal-800 active:scale-[0.95] transition-all shadow-2xs"
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
