import { TripStatus } from '@safar/types';

export const SAFAR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBbEiDaywf9ZjjIBpCv5co6DzdFuZ6_Kl8",
  authDomain: "safar-production-6fa71.firebaseapp.com",
  projectId: "safar-production-6fa71",
  storageBucket: "safar-production-6fa71.firebasestorage.app",
  messagingSenderId: "149397631342",
  appId: "1:149397631342:web:b50da262b5e6cab191917f",
  measurementId: "G-28YVPSE0YY"
};

export const SAFAR_THEME = {
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      500: '#14b8a6',
      600: '#0d9488', // SAFAR Refined Teal Accent
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    neutral: {
      background: '#fcfbf9', // Warm White
      card: '#ffffff',
      dark: '#111827',       // Deep Charcoal Typography
      muted: '#6b7280',
      border: '#e5e7eb',
      borderSubtle: '#f3f4f6',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      purple: '#8b5cf6',
    }
  },
  typography: {
    fontFamilySans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
  }
};

/**
 * Strict Trip State Transition Matrix
 * Validates permitted next steps for state machine
 */
export const ALLOWED_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.SCHEDULED]: [TripStatus.ASSIGNED, TripStatus.CANCELLED],
  [TripStatus.ASSIGNED]: [TripStatus.DRIVER_ACCEPTED, TripStatus.SCHEDULED, TripStatus.CANCELLED],
  [TripStatus.DRIVER_ACCEPTED]: [TripStatus.EN_ROUTE_TO_PICKUP, TripStatus.CANCELLED, TripStatus.ASSIGNED],
  [TripStatus.EN_ROUTE_TO_PICKUP]: [TripStatus.ARRIVED, TripStatus.FAILED, TripStatus.CANCELLED],
  [TripStatus.ARRIVED]: [TripStatus.BOARDING, TripStatus.NO_SHOW, TripStatus.CANCELLED],
  [TripStatus.BOARDING]: [TripStatus.IN_TRANSIT, TripStatus.NO_SHOW, TripStatus.CANCELLED],
  [TripStatus.IN_TRANSIT]: [TripStatus.COMPLETED, TripStatus.FAILED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
  [TripStatus.NO_SHOW]: [],
  [TripStatus.FAILED]: [],
};

export function isValidTripTransition(current: TripStatus, target: TripStatus): boolean {
  const allowed = ALLOWED_TRIP_TRANSITIONS[current] || [];
  return allowed.includes(target);
}
