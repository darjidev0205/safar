/**
 * SAFAR Access & Security Policy Engine
 * 
 * Enforces:
 * 1. Unambiguous 6-character access code format & cryptographic generation
 * 2. Role-based event access boundaries (Host, Driver, Guest)
 * 3. Data minimization & Guest privacy isolation
 */

import crypto from 'crypto';

// Unambiguous 28-character alphabet excluding 0, O, 1, I, S, 5 (prevents misreading on physical cards)
export const SAFAR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

export class AccessEngine {
  /**
   * Generates a cryptographically strong 6-character access code.
   */
  public generateCode(): string {
    let result = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      result += SAFAR_CODE_ALPHABET[bytes[i] % SAFAR_CODE_ALPHABET.length];
    }
    return result;
  }

  /**
   * Validates if a code string matches SAFAR format standards.
   */
  public isValidCodeFormat(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return false;
    for (let i = 0; i < clean.length; i++) {
      if (!SAFAR_CODE_ALPHABET.includes(clean[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Enforces Guest Data Privacy Boundaries.
   * Strips out internal dispatch, driver financials, other guests, and private host data.
   */
  public sanitizeTripForGuest(trip: any): any {
    if (!trip) return null;

    return {
      id: trip.id,
      status: trip.status,
      scheduledPickupTime: trip.scheduledPickupTime,
      estimatedArrivalTime: trip.estimatedArrivalTime,
      actualStartTime: trip.actualStartTime,
      actualEndTime: trip.actualEndTime,
      origin: trip.originPlace ? {
        name: trip.originPlace.name,
        address: trip.originPlace.address,
        lat: trip.originPlace.latitude,
        lng: trip.originPlace.longitude,
      } : undefined,
      destination: trip.destinationPlace ? {
        name: trip.destinationPlace.name,
        address: trip.destinationPlace.address,
        lat: trip.destinationPlace.latitude,
        lng: trip.destinationPlace.longitude,
      } : undefined,
      vehicle: trip.vehicle ? {
        model: trip.vehicle.model,
        plateNumber: trip.vehicle.plateNumber,
        category: trip.vehicle.category,
        capacity: trip.vehicle.capacity,
        currentLat: trip.currentLat || trip.vehicle.currentLat,
        currentLng: trip.currentLng || trip.vehicle.currentLng,
      } : undefined,
      driver: trip.driver?.user ? {
        name: trip.driver.user.fullName,
        phone: trip.driver.user.phoneNumber,
        avatarUrl: trip.driver.user.avatarUrl,
      } : undefined,
      telemetry: {
        currentLat: trip.currentLat,
        currentLng: trip.currentLng,
        heading: trip.currentHeading,
        speedKmh: trip.currentSpeed,
        actualDistanceKm: trip.actualDistanceKm,
        remainingDistanceKm: trip.remainingDistanceKm,
        lastPingAt: trip.lastPingAt,
      },
    };
  }
}

export const defaultAccessEngine = new AccessEngine();
