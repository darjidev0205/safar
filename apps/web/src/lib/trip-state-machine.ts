import { TripStatus } from '@prisma/client';

export class InvalidTripStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: TripStatus | string,
    public readonly targetStatus: TripStatus | string,
    public readonly reason: string
  ) {
    super(`Cannot transition trip from ${currentStatus} to ${targetStatus}: ${reason}`);
    this.name = 'InvalidTripStateTransitionError';
  }
}

/**
 * Strict state transition graph for SAFAR trips.
 */
export const ALLOWED_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.SCHEDULED]: [
    TripStatus.ASSIGNED,
    TripStatus.DRIVER_ACCEPTED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.ASSIGNED]: [
    TripStatus.DRIVER_ACCEPTED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.DRIVER_ACCEPTED]: [
    TripStatus.EN_ROUTE_TO_PICKUP,
    TripStatus.CANCELLED,
  ],
  [TripStatus.EN_ROUTE_TO_PICKUP]: [
    TripStatus.ARRIVED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.ARRIVED]: [
    TripStatus.BOARDING,
    TripStatus.IN_TRANSIT,
    TripStatus.NO_SHOW,
    TripStatus.CANCELLED,
  ],
  [TripStatus.BOARDING]: [
    TripStatus.IN_TRANSIT,
    TripStatus.NO_SHOW,
    TripStatus.CANCELLED,
  ],
  [TripStatus.IN_TRANSIT]: [
    TripStatus.COMPLETED,
    TripStatus.FAILED,
    TripStatus.CANCELLED,
  ],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
  [TripStatus.NO_SHOW]: [],
  [TripStatus.FAILED]: [],
};

export function canTransitionTrip(
  currentStatus: TripStatus,
  targetStatus: TripStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRIP_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateTripTransition(
  currentStatus: TripStatus,
  targetStatus: TripStatus
): void {
  if (currentStatus === targetStatus) return;

  const allowed = ALLOWED_TRIP_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidTripStateTransitionError(
      currentStatus,
      targetStatus,
      `Allowed transitions from ${currentStatus} are: [${allowed.join(', ')}]`
    );
  }
}
