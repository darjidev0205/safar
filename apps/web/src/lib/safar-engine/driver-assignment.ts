/**
 * SAFAR Driver Assignment Scoring & Ranking Engine
 * 
 * Multi-factor algorithmic model to match the optimal chauffeur & vehicle to a trip:
 * 1. Hard Eligibility Filter:
 *    - Active driver status
 *    - Duty status (AVAILABLE / ON_DUTY)
 *    - Vehicle capacity >= requested passenger count
 *    - Active vehicle registration
 * 
 * 2. Weighted Scoring Model (0 - 100 points):
 *    - Proximity Score (40 pts): Closer to pickup point gets higher points (decay function)
 *    - Capacity Match Score (25 pts): Rewards right-sized vehicles over empty buses
 *    - Duty Readiness Score (15 pts): Available vs On-Duty
 *    - Category Match Score (10 pts): Sedan vs SUV requested vs available
 *    - Workload Distribution (10 pts): Equalizes driver assignments across the fleet
 * 
 * Time Complexity: O(N) filtering + O(N log N) or O(N log K) ranking
 * Space Complexity: O(N)
 */

import {
  DriverCandidate,
  TripRequirement,
  ScoredDriverCandidate,
} from './types';
import { calculateHaversineDistanceKm } from './distance-engine';

export interface AssignmentWeightConfig {
  proximityWeight: number; // default: 40
  capacityFitWeight: number; // default: 25
  dutyStatusWeight: number; // default: 15
  categoryMatchWeight: number; // default: 10
  workloadWeight: number; // default: 10
  maxProximityThresholdKm: number; // default: 50 km
}

export const DEFAULT_ASSIGNMENT_WEIGHTS: AssignmentWeightConfig = {
  proximityWeight: 40,
  capacityFitWeight: 25,
  dutyStatusWeight: 15,
  categoryMatchWeight: 10,
  workloadWeight: 10,
  maxProximityThresholdKm: 50,
};

export class DriverAssignmentEngine {
  private weights: AssignmentWeightConfig;

  constructor(customWeights?: Partial<AssignmentWeightConfig>) {
    this.weights = { ...DEFAULT_ASSIGNMENT_WEIGHTS, ...customWeights };
  }

  /**
   * Scores and ranks candidate drivers for a trip requirement.
   * 
   * @param candidates Array of candidate drivers in the account/event
   * @param trip Target trip requirements
   * @returns Sorted list of candidates from highest score to lowest
   */
  public rankCandidates(
    candidates: DriverCandidate[],
    trip: TripRequirement
  ): ScoredDriverCandidate[] {
    const scoredList: ScoredDriverCandidate[] = [];

    for (const candidate of candidates) {
      const evaluation = this.evaluateCandidate(candidate, trip);
      scoredList.push(evaluation);
    }

    // Sort: Eligible first, then descending by totalScore
    return scoredList.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.totalScore - a.totalScore;
    });
  }

  /**
   * Selects the single best candidate driver for automated dispatch.
   */
  public selectBestCandidate(
    candidates: DriverCandidate[],
    trip: TripRequirement
  ): ScoredDriverCandidate | null {
    const ranked = this.rankCandidates(candidates, trip);
    const top = ranked[0];
    return top && top.isEligible ? top : null;
  }

  private evaluateCandidate(
    candidate: DriverCandidate,
    trip: TripRequirement
  ): ScoredDriverCandidate {
    // --- 1. Hard Eligibility Filter ---
    if (candidate.dutyStatus === 'OFF_DUTY' || candidate.dutyStatus === 'BREAK') {
      return this.createIneligibleResult(candidate, `Driver is ${candidate.dutyStatus}`);
    }

    if (!candidate.currentVehicle || !candidate.currentVehicle.isActive) {
      return this.createIneligibleResult(candidate, 'No active vehicle assigned to driver');
    }

    const vehicleCapacity = candidate.currentVehicle.capacity || 4;
    if (vehicleCapacity < trip.passengerCount) {
      return this.createIneligibleResult(
        candidate,
        `Vehicle capacity (${vehicleCapacity}) is less than required passengers (${trip.passengerCount})`
      );
    }

    // --- 2. Calculate Distance to Pickup ---
    let distanceToPickupKm = 10; // default assumption if GPS unavailable
    if (candidate.currentLocation) {
      distanceToPickupKm = calculateHaversineDistanceKm(
        candidate.currentLocation.latitude,
        candidate.currentLocation.longitude,
        trip.originLat,
        trip.originLng
      );
    }

    if (distanceToPickupKm > this.weights.maxProximityThresholdKm) {
      return this.createIneligibleResult(
        candidate,
        `Driver is too far (${Math.round(distanceToPickupKm)} km > ${this.weights.maxProximityThresholdKm} km)`
      );
    }

    // --- 3. Compute Sub-Scores ---
    // A. Proximity Score (Decay function: closer = more points)
    // Score = 40 * max(0, 1 - distance / maxThreshold)
    const proximityRatio = Math.max(0, 1 - distanceToPickupKm / this.weights.maxProximityThresholdKm);
    const proximityScore = Math.round(this.weights.proximityWeight * Math.pow(proximityRatio, 1.5) * 10) / 10;

    // B. Capacity Fit Score (25 pts: reward tight fit, penalize huge empty buses for 1 passenger)
    const capacityDifference = vehicleCapacity - trip.passengerCount;
    let capacityFitScore = 0;
    if (capacityDifference === 0) {
      capacityFitScore = this.weights.capacityFitWeight; // Perfect fit
    } else if (capacityDifference <= 2) {
      capacityFitScore = this.weights.capacityFitWeight * 0.9;
    } else if (capacityDifference <= 4) {
      capacityFitScore = this.weights.capacityFitWeight * 0.7;
    } else {
      capacityFitScore = Math.max(5, this.weights.capacityFitWeight * 0.4);
    }

    // C. Duty Readiness Score (15 pts)
    let dutyStatusScore = 0;
    if (candidate.dutyStatus === 'AVAILABLE') {
      dutyStatusScore = this.weights.dutyStatusWeight;
    } else if (candidate.dutyStatus === 'ON_DUTY') {
      dutyStatusScore = this.weights.dutyStatusWeight * 0.8;
    } else {
      dutyStatusScore = this.weights.dutyStatusWeight * 0.3;
    }

    // D. Vehicle Category Match Score (10 pts)
    let categoryMatchScore = 0;
    if (trip.requestedCategory) {
      if (candidate.currentVehicle.category === trip.requestedCategory) {
        categoryMatchScore = this.weights.categoryMatchWeight;
      } else {
        categoryMatchScore = this.weights.categoryMatchWeight * 0.5;
      }
    } else {
      categoryMatchScore = this.weights.categoryMatchWeight;
    }

    // E. Workload Distribution Score (10 pts: fewer trips today = higher priority)
    const tripsToday = candidate.activeTripsCountToday || 0;
    const workloadScore = Math.max(0, Math.round((this.weights.workloadWeight - tripsToday * 1.5) * 10) / 10);

    // Total Normalized Score (0 - 100)
    const totalScore = Math.round(
      (proximityScore + capacityFitScore + dutyStatusScore + categoryMatchScore + workloadScore) * 10
    ) / 10;

    const estimatedTimeToPickupMin = Math.max(3, Math.round((distanceToPickupKm / 30) * 60));

    return {
      driver: candidate,
      isEligible: true,
      totalScore,
      scoreBreakdown: {
        proximityScore,
        capacityFitScore,
        dutyStatusScore,
        categoryMatchScore,
        workloadScore,
      },
      distanceToPickupKm: Math.round(distanceToPickupKm * 10) / 10,
      estimatedTimeToPickupMin,
    };
  }

  private createIneligibleResult(
    candidate: DriverCandidate,
    reason: string
  ): ScoredDriverCandidate {
    return {
      driver: candidate,
      isEligible: false,
      ineligibilityReason: reason,
      totalScore: 0,
      scoreBreakdown: {
        proximityScore: 0,
        capacityFitScore: 0,
        dutyStatusScore: 0,
        categoryMatchScore: 0,
        workloadScore: 0,
      },
    };
  }
}

export const defaultDriverAssignmentEngine = new DriverAssignmentEngine();
