'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { UserRole } from '@safar/types';
import { AuthView } from '../auth/auth-view';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  targetRedirect?: string;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({
  isOpen,
  onClose,
  defaultRole = UserRole.EVENT_ORGANIZER,
  targetRedirect,
  initialMode = 'signin',
}: AuthModalProps) {
  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SAFAR Authentication"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-charcoal-950/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      {/* Background click to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg lg:max-w-4xl xl:max-w-5xl my-auto animate-in zoom-in-95 duration-200">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute -top-3 -right-2 sm:-top-3.5 sm:-right-3 z-30 p-2 sm:p-2.5 rounded-full bg-white border border-[#E8E2D9] text-charcoal-600 hover:text-charcoal-900 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Embedded Auth View */}
        <AuthView
          defaultRole={defaultRole}
          initialMode={initialMode}
          targetRedirect={targetRedirect}
          onSuccess={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
}
