'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/google-maps';

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PlaceAutocompleteProps {
  /** Input label shown above the field */
  label?: string;
  /** Placeholder text inside the input */
  placeholder?: string;
  /** Pre-populated value (display text only) */
  defaultValue?: string;
  /** Called when user selects a valid place */
  onPlaceSelect: (place: PlaceResult) => void;
  /** Called when user clears the input */
  onClear?: () => void;
  /** Additional tailwind classes for the wrapper div */
  className?: string;
  /** Restrict results to a country code e.g. "in" for India */
  countryCode?: string;
  /** Icon to show on the left of the input */
  icon?: React.ReactNode;
}

/**
 * SAFAR — Google Places Autocomplete Input
 *
 * Uses the Places Autocomplete API (legacy Autocomplete widget)
 * loaded via the central loadGoogleMaps() promise.
 * Stores structured PlaceResult (placeId, address, lat, lng).
 */
export function PlaceAutocomplete({
  label,
  placeholder = 'Search hotel, venue, airport…',
  defaultValue = '',
  onPlaceSelect,
  onClear,
  className = '',
  countryCode = 'in',
  icon,
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [inputValue, setInputValue] = useState(defaultValue);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current) return;
    const goog = (window as any).google;

    const autocomplete = new goog.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: countryCode },
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place?.geometry?.location) return;

      const result: PlaceResult = {
        placeId: place.place_id ?? '',
        name: place.name ?? place.formatted_address ?? '',
        address: place.formatted_address ?? '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      };

      setInputValue(result.address);
      onPlaceSelect(result);
    });

    setStatus('ready');
  }, [countryCode, onPlaceSelect]);

  useEffect(() => {
    setStatus('loading');
    loadGoogleMaps()
      .then(() => initAutocomplete())
      .catch(() => setStatus('error'));
  }, [initAutocomplete]);

  const handleClear = () => {
    setInputValue('');
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-charcoal-700">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Left icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">
          {status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin text-terracotta-500" />
          ) : icon ? (
            icon
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={status === 'error' ? 'Places search unavailable' : placeholder}
          disabled={status === 'loading'}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-warm-200 text-xs font-medium focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-wait bg-white"
        />

        {/* Clear button */}
        {inputValue && status === 'ready' && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {status === 'error' && (
        <p className="text-[11px] text-amber-600 font-medium">
          Location search unavailable. Enter address manually.
        </p>
      )}
    </div>
  );
}
