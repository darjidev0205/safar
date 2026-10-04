/**
 * SAFAR Trip State Machine & Lifecycle Engine
 * 
 * Enforces valid state transitions, atomic updates, and actor authorization:
 * 
 * Standard Lifecycle:
 * SCHEDULED -> ASSIGNED -> DRIVER_ACCEPTED -> EN_ROUTE_TO_PICKUP -> ARRIVED -> BOARDING -> IN_TRANSIT -> COMPLETED
 * 
 * Terminal States (no further transitions allowed):
 * COMPLETED, CANCELLED, NO_SHOW, FAILED
 */

export type SafarTripStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED'
  | 'BOARDING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'FAILED';

export interface StateTransitionValidation {
  isValid: boolean;
  isTerminal: boolean;
  error?: string;
}

export const TRIP_TRANSITION_MATRIX: Record<SafarTripStatus, SafarTripStatus[]> = {
  SCHEDULED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DRIVER_ACCEPTED', 'SCHEDULED', 'CANCELLED'],
  DRIVER_ACCEPTED: ['EN_ROUTE_TO_PICKUP', 'ARRIVED', 'ASSIGNED', 'CANCELLED'],
  EN_ROUTE_TO_PICKUP: ['ARRIVED', 'FAILED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['BOARDING', 'IN_TRANSIT', 'NO_SHOW', 'CANCELLED'],
  BOARDING: ['IN_TRANSIT', 'NO_SHOW', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  NO_SHOW: [],   // Terminal
  FAILED: [],    // Terminal
};

export class TripStateMachine {
  /**
   * Validates whether moving from currentStatus to targetStatus is permitted.
   */
  public validateTransition(
    currentStatus: SafarTripStatus,
    targetStatus: SafarTripStatus,
    actorRole?: string
  ): StateTransitionValidation {
    if (currentStatus === targetStatus) {
      return { isValid: true, isTerminal: this.isTerminal(currentStatus) };
    }

    // Terminal states cannot transition to anything
    if (this.isTerminal(currentStatus)) {
      return {
        isValid: false,
        isTerminal: true,
        error: `Cannot transition from terminal state ${currentStatus} to ${targetStatus}`,
      };
    }

    const allowedTargets = TRIP_TRANSITION_MATRIX[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        isValid: false,
        isTerminal: false,
        error: `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed: [${allowedTargets.join(', ')}]`,
      };
    }

    // Role-specific transition rules
    if (actorRole === 'DRIVER') {
      const driverProhibitedTargets: SafarTripStatus[] = ['SCHEDULED'];
      if (driverProhibitedTargets.includes(targetStatus)) {
        return {
          isValid: false,
          isTerminal: false,
          error: `Drivers are not permitted to transition trips to ${targetStatus}`,
        };
      }
    }

    return {
      isValid: true,
      isTerminal: this.isTerminal(targetStatus),
    };
  }

  public isTerminal(status: SafarTripStatus): boolean {
    const allowed = TRIP_TRANSITION_MATRIX[status];
    return Array.isArray(allowed) && allowed.length === 0;
  }

  public getAllowedNextStates(status: SafarTripStatus): SafarTripStatus[] {
    return TRIP_TRANSITION_MATRIX[status] || [];
  }
}

export const defaultTripStateMachine = new TripStateMachine();
