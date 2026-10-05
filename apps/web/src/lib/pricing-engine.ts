import { VehicleCategory } from '@safar/types';

export interface PricingRule {
  vehicleCategory: VehicleCategory;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  waitingRatePerMinute: number;
}

export const DEFAULT_PRICING_RULES: Record<VehicleCategory, PricingRule> = {
  [VehicleCategory.SEDAN]: {
    vehicleCategory: VehicleCategory.SEDAN,
    baseFare: 250,
    perKmRate: 16,
    perMinuteRate: 2.5,
    minimumFare: 300,
    waitingRatePerMinute: 2.0,
  },
  [VehicleCategory.SUV]: {
    vehicleCategory: VehicleCategory.SUV,
    baseFare: 450,
    perKmRate: 24,
    perMinuteRate: 3.5,
    minimumFare: 500,
    waitingRatePerMinute: 3.0,
  },
  [VehicleCategory.TEMPO_TRAVELLER]: {
    vehicleCategory: VehicleCategory.TEMPO_TRAVELLER,
    baseFare: 800,
    perKmRate: 35,
    perMinuteRate: 5.0,
    minimumFare: 900,
    waitingRatePerMinute: 4.5,
  },
  [VehicleCategory.LUXURY_SEDAN]: {
    vehicleCategory: VehicleCategory.LUXURY_SEDAN,
    baseFare: 900,
    perKmRate: 45,
    perMinuteRate: 6.0,
    minimumFare: 1100,
    waitingRatePerMinute: 5.5,
  },
  [VehicleCategory.BUS]: {
    vehicleCategory: VehicleCategory.BUS,
    baseFare: 1500,
    perKmRate: 65,
    perMinuteRate: 8.0,
    minimumFare: 1800,
    waitingRatePerMinute: 7.0,
  },
};

export interface TripCostCalculationParams {
  vehicleCategory?: VehicleCategory | string;
  distanceKm: number;
  durationMinutes?: number;
  waitingMinutes?: number;
}

export interface TripCostBreakdown {
  vehicleCategory: VehicleCategory;
  distanceKm: number;
  durationMinutes: number;
  waitingMinutes: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  waitingCharge: number;
  subtotal: number;
  totalCost: number;
  isMinimumFareApplied: boolean;
}

/**
 * Calculates deterministic, distance-based transportation cost.
 * Never generates random or fake pricing.
 */
export function calculateTripCost({
  vehicleCategory = VehicleCategory.SEDAN,
  distanceKm,
  durationMinutes = 0,
  waitingMinutes = 0,
}: TripCostCalculationParams): TripCostBreakdown {
  const categoryKey = (vehicleCategory in DEFAULT_PRICING_RULES
    ? vehicleCategory
    : VehicleCategory.SEDAN) as VehicleCategory;

  const rule = DEFAULT_PRICING_RULES[categoryKey];

  const safeDistance = Math.max(0, distanceKm);
  const safeDuration = Math.max(0, durationMinutes);
  const safeWaiting = Math.max(0, waitingMinutes);

  const baseFare = rule.baseFare;
  const distanceCharge = Math.round(safeDistance * rule.perKmRate * 100) / 100;
  const timeCharge = Math.round(safeDuration * rule.perMinuteRate * 100) / 100;
  const waitingCharge = Math.round(safeWaiting * rule.waitingRatePerMinute * 100) / 100;

  const subtotal = Math.round((baseFare + distanceCharge + timeCharge + waitingCharge) * 100) / 100;
  const isMinimumFareApplied = subtotal < rule.minimumFare;
  const totalCost = Math.max(subtotal, rule.minimumFare);

  return {
    vehicleCategory: categoryKey,
    distanceKm: safeDistance,
    durationMinutes: safeDuration,
    waitingMinutes: safeWaiting,
    baseFare,
    distanceCharge,
    timeCharge,
    waitingCharge,
    subtotal,
    totalCost,
    isMinimumFareApplied,
  };
}
