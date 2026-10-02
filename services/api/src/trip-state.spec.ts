import { TripStatus } from '@safar/types';
import { isValidTripTransition, ALLOWED_TRIP_TRANSITIONS } from '@safar/config';

describe('Trip Lifecycle State Machine Verification', () => {
  it('should permit valid linear progression: SCHEDULED -> ASSIGNED -> DRIVER_ACCEPTED -> EN_ROUTE_TO_PICKUP -> ARRIVED -> BOARDING -> IN_TRANSIT -> COMPLETED', () => {
    expect(isValidTripTransition(TripStatus.SCHEDULED, TripStatus.ASSIGNED)).toBe(true);
    expect(isValidTripTransition(TripStatus.ASSIGNED, TripStatus.DRIVER_ACCEPTED)).toBe(true);
    expect(isValidTripTransition(TripStatus.DRIVER_ACCEPTED, TripStatus.EN_ROUTE_TO_PICKUP)).toBe(true);
    expect(isValidTripTransition(TripStatus.EN_ROUTE_TO_PICKUP, TripStatus.ARRIVED)).toBe(true);
    expect(isValidTripTransition(TripStatus.ARRIVED, TripStatus.BOARDING)).toBe(true);
    expect(isValidTripTransition(TripStatus.BOARDING, TripStatus.IN_TRANSIT)).toBe(true);
    expect(isValidTripTransition(TripStatus.IN_TRANSIT, TripStatus.COMPLETED)).toBe(true);
  });

  it('should reject illegal state skips (e.g. SCHEDULED directly to COMPLETED or BOARDING)', () => {
    expect(isValidTripTransition(TripStatus.SCHEDULED, TripStatus.COMPLETED)).toBe(false);
    expect(isValidTripTransition(TripStatus.SCHEDULED, TripStatus.BOARDING)).toBe(false);
    expect(isValidTripTransition(TripStatus.ARRIVED, TripStatus.COMPLETED)).toBe(false);
  });

  it('should allow terminal cancellation from active states', () => {
    expect(isValidTripTransition(TripStatus.SCHEDULED, TripStatus.CANCELLED)).toBe(true);
    expect(isValidTripTransition(TripStatus.ASSIGNED, TripStatus.CANCELLED)).toBe(true);
    expect(isValidTripTransition(TripStatus.ARRIVED, TripStatus.NO_SHOW)).toBe(true);
  });

  it('should not allow transitions out of terminal COMPLETED or CANCELLED status', () => {
    expect(isValidTripTransition(TripStatus.COMPLETED, TripStatus.SCHEDULED)).toBe(false);
    expect(isValidTripTransition(TripStatus.COMPLETED, TripStatus.IN_TRANSIT)).toBe(false);
    expect(isValidTripTransition(TripStatus.CANCELLED, TripStatus.ASSIGNED)).toBe(false);
  });
});
