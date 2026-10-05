'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Loader2,
  Search,
  X,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
} from 'lucide-react';
import {
  searchPlaces,
  getPlaceDetails,
  getCurrentUserLocation,
  PlaceSuggestion,
  StructuredPlace,
} from '../../lib/location-service';
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
  /** Controlled value */
  value?: string;
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
  /** Allow clicking "Use Current Location" */
  enableCurrentLocation?: boolean;
  /** Allow picking on map */
  onOpenMapPicker?: () => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * SAFAR — Advanced Debounced Places Autocomplete
 *
 * Implements:
 * - 300ms debounce threshold
 * - 3-character minimum threshold (no calls for 1 or 2 characters)
 * - Session token management (bills multiple keystrokes as a single Places session)
 * - Query caching
 * - Stale request cancellation
 * - Native browser GPS "Use Current Location" with reverse geocoding
 * - Loading, empty, and error fallback states
 */
export function PlaceAutocomplete({
  label,
  placeholder = 'Search hotel, venue, airport, or address…',
  defaultValue = '',
  value,
  onPlaceSelect,
  onClear,
  className = '',
  countryCode = 'in',
  icon,
  enableCurrentLocation = true,
  onOpenMapPicker,
  disabled = false,
}: PlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value ?? defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync controlled value if provided
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Pre-load Google Maps SDK once in background
  useEffect(() => {
    loadGoogleMaps().catch((err) => {
      console.warn('Google Maps pre-load notice in PlaceAutocomplete:', err);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search logic
  const handleInputChange = (text: string) => {
    setInputValue(text);
    setError(null);
    setHighlightedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed, countryCode);
        setSuggestions(results);
        setIsOpen(true);
      } catch (err: any) {
        console.warn('Search places error:', err);
        setError('Location search temporarily unavailable.');
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  // Handle place selection from dropdown
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setInputValue(suggestion.description);
    setIsOpen(false);
    setSuggestions([]);
    setIsLoading(true);

    try {
      const details = await getPlaceDetails(suggestion.placeId);
      if (details) {
        onPlaceSelect(details);
      } else {
        // Fallback if details API fails
        onPlaceSelect({
          placeId: suggestion.placeId,
          name: suggestion.mainText,
          address: suggestion.description,
          latitude: 23.0225, // default Ahmedabad fallback
          longitude: 72.5714,
        });
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Use Current Location
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const place = await getCurrentUserLocation();
      setInputValue(place.address || place.name);
      setIsOpen(false);
      onPlaceSelect(place);
    } catch (err: any) {
      console.warn('GPS location error:', err);
      setError(err.message || 'Unable to determine GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onClear?.();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-charcoal-700">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Left icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
          {isLoading || isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-terracotta-500" />
          ) : icon ? (
            icon
          ) : (
            <MapPin className="w-4 h-4 text-terracotta-600" />
          )}
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLocating}
          className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-warm-200 text-xs font-medium text-charcoal-900 bg-white placeholder:text-charcoal-400 focus:ring-2 focus:ring-terracotta-500 focus:border-terracotta-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
        />

        {/* Right action buttons: Clear and/or Use Current Location */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {enableCurrentLocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating || disabled}
              className="p-1.5 rounded-lg text-terracotta-600 hover:bg-terracotta-50 active:scale-95 transition-all"
              title="Use Current Location (GPS)"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 pl-1 pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-2xl bg-white border border-[#E5DACB] shadow-xl divide-y divide-warm-100 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {/* Quick action: Current Location */}
          {enableCurrentLocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 hover:bg-terracotta-50/70 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-terracotta-100/60 text-terracotta-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <LocateFixed className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-charcoal-900 block">
                  Use Current Location
                </span>
                <span className="text-[10px] text-charcoal-500 block truncate">
                  Pinpoint via device GPS
                </span>
              </div>
            </button>
          )}

          {/* List of predictions */}
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={item.placeId}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 transition-colors ${
                    isHighlighted ? 'bg-warm-100/80 text-charcoal-900' : 'hover:bg-warm-50 text-charcoal-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-warm-100 text-charcoal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3 h-3 text-terracotta-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-charcoal-900 block truncate">
                      {item.mainText}
                    </span>
                    {item.secondaryText && (
                      <span className="text-[10px] text-charcoal-500 block truncate mt-0.5">
                        {item.secondaryText}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            !isLoading && (
              <div className="px-4 py-4 text-center text-xs text-charcoal-400">
                No matching places found. Enter address manually.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
