/**
 * SAFAR — Smooth Driver Marker Animation Engine
 *
 * Provides smooth, non-teleporting interpolation for live driver vehicle markers
 * on Google Maps using client-side requestAnimationFrame.
 *
 * Implements:
 * - Spherical / linear coordinate interpolation (gliding rather than jumping)
 * - Shortest-path rotational angle interpolation for vehicle heading
 * - Seamless animation interruption when new GPS packets arrive mid-glide
 * - Teleport outlier safeguard
 */

import { LatLng, calculateHaversineDistanceKm } from './location-service';

export interface MarkerAnimationOptions {
  durationMs?: number;
  easing?: (t: number) => number;
}

/** Linear easing for constant speed vehicle motion */
const linearEasing = (t: number) => t;

/** Quadratic ease-out for smooth stopping */
const easeOutQuad = (t: number) => t * (2 - t);

export class AnimatedDriverMarker {
  private marker: any = null;
  private map: any = null;
  private currentLat: number | null = null;
  private currentLng: number | null = null;
  private currentHeading: number = 0;
  private animationFrameId: number | null = null;
  private vehicleTitle: string = 'Driver';
  private iconColor: string = '#0f172a';

  constructor({
    map,
    initialPosition,
    initialHeading = 0,
    vehicleTitle = 'Driver',
    iconColor = '#0f172a',
  }: {
    map: any;
    initialPosition?: LatLng | null;
    initialHeading?: number;
    vehicleTitle?: string;
    iconColor?: string;
  }) {
    this.map = map;
    this.vehicleTitle = vehicleTitle;
    this.iconColor = iconColor;
    this.currentHeading = initialHeading;

    if (initialPosition) {
      this.currentLat = initialPosition.lat;
      this.currentLng = initialPosition.lng;
      this.initMarker(initialPosition, initialHeading);
    }
  }

  private initMarker(pos: LatLng, heading: number) {
    if (typeof window === 'undefined') return;
    const goog = (window as any).google;
    if (!goog?.maps?.Marker || !this.map) return;

    const icon = {
      path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7.5,
      rotation: heading,
      fillColor: this.iconColor,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2.5,
    };

    this.marker = new goog.maps.Marker({
      position: { lat: pos.lat, lng: pos.lng },
      map: this.map,
      title: this.vehicleTitle,
      icon,
      zIndex: 100,
    });
  }

  /**
   * Smoothly animate the marker to target coordinates and heading.
   * If new coordinates arrive mid-flight, seamlessly redirects from current position.
   */
  public moveTo(
    target: LatLng,
    targetHeading?: number | null,
    options: MarkerAnimationOptions = {}
  ) {
    if (typeof window === 'undefined') return;
    const goog = (window as any).google;
    if (!goog?.maps) return;

    const duration = options.durationMs ?? 2000;
    const easing = options.easing ?? easeOutQuad;

    // First coordinate ever: initialize marker instantly
    if (this.currentLat === null || this.currentLng === null) {
      this.currentLat = target.lat;
      this.currentLng = target.lng;
      this.currentHeading = targetHeading ?? 0;
      if (!this.marker) {
        this.initMarker(target, this.currentHeading);
      } else {
        this.marker.setPosition({ lat: target.lat, lng: target.lng });
        this.updateIcon(this.currentHeading);
      }
      return;
    }

    // Cancel any active animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const startLat = this.currentLat;
    const startLng = this.currentLng;
    const endLat = target.lat;
    const endLng = target.lng;

    // Check distance in km: if outlier teleport (> 5km), jump directly without animation
    const jumpDistanceKm = calculateHaversineDistanceKm(startLat, startLng, endLat, endLng);
    if (jumpDistanceKm > 5) {
      this.currentLat = endLat;
      this.currentLng = endLng;
      this.currentHeading = targetHeading ?? this.currentHeading;
      this.marker?.setPosition({ lat: endLat, lng: endLng });
      this.updateIcon(this.currentHeading);
      return;
    }

    // Heading calculation: compute shortest rotational path (-180 to +180)
    let endHeading = targetHeading !== null && targetHeading !== undefined
      ? targetHeading
      : this.calculateBearing(startLat, startLng, endLat, endLng);

    const startHeading = this.currentHeading;
    const headingDelta = ((endHeading - startHeading + 540) % 360) - 180;

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easing(progress);

      // Interpolate lat and lng
      const currentLat = startLat + (endLat - startLat) * easedProgress;
      const currentLng = startLng + (endLng - startLng) * easedProgress;
      const currentHeading = (startHeading + headingDelta * easedProgress + 360) % 360;

      this.currentLat = currentLat;
      this.currentLng = currentLng;
      this.currentHeading = currentHeading;

      if (this.marker) {
        this.marker.setPosition({ lat: currentLat, lng: currentLng });
        this.updateIcon(currentHeading);
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  private updateIcon(heading: number) {
    if (!this.marker) return;
    const goog = (window as any).google;
    if (!goog?.maps?.SymbolPath) return;

    this.marker.setIcon({
      path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7.5,
      rotation: Math.round(heading),
      fillColor: this.iconColor,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2.5,
    });
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
  }

  public getPosition(): LatLng | null {
    if (this.currentLat === null || this.currentLng === null) return null;
    return { lat: this.currentLat, lng: this.currentLng };
  }

  public getHeading(): number {
    return this.currentHeading;
  }
}
