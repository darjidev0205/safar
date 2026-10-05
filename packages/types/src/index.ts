export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
  GUEST = 'GUEST',
}

export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  ASSIGNED = 'ASSIGNED',
  DRIVER_ACCEPTED = 'DRIVER_ACCEPTED',
  EN_ROUTE_TO_PICKUP = 'EN_ROUTE_TO_PICKUP',
  ARRIVED = 'ARRIVED',
  BOARDING = 'BOARDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  FAILED = 'FAILED',
}

export enum DutyStatus {
  OFF_DUTY = 'OFF_DUTY',
  AVAILABLE = 'AVAILABLE',
  ON_DUTY = 'ON_DUTY',
  ON_TRIP = 'ON_TRIP',
  BREAK = 'BREAK',
}

export enum VehicleCategory {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TEMPO_TRAVELLER = 'TEMPO_TRAVELLER',
  LUXURY_SEDAN = 'LUXURY_SEDAN',
  BUS = 'BUS',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  BOARDED = 'BOARDED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum FunctionType {
  MEHENDI = 'MEHENDI',
  HALDI = 'HALDI',
  SANGEET = 'SANGEET',
  WEDDING = 'WEDDING',
  RECEPTION = 'RECEPTION',
  ENGAGEMENT = 'ENGAGEMENT',
  PHERAS = 'PHERAS',
  VIDAAI = 'VIDAAI',
  BRUNCH = 'BRUNCH',
  DINNER = 'DINNER',
  OTHER = 'OTHER',
  CUSTOM = 'CUSTOM',
}

export enum DriverEventStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REMOVED',
  REMOVED = 'REMOVED',
}

export enum GuestFunctionStatus {
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  REMOVED = 'REMOVED',
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventModel {
  id: string;
  accountId: string;
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  joinCode: string;
  guestAccessCode?: string;
  driverAccessCode?: string;
  bannerUrl?: string | null;
  description?: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  functions?: FunctionModel[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaceModel {
  id: string;
  eventId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'HOTEL' | 'VENUE' | 'AIRPORT' | 'TRAIN_STATION' | 'RESIDENCE' | 'OTHER';
}

export interface FunctionModel {
  id: string;
  eventId: string;
  placeId?: string | null;
  name: string;
  type?: string;
  date?: string | null;
  startTime: string;
  endTime: string;
  venueName?: string | null;
  venueAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  guestRules?: string | null;
  transportRules?: string | null;
  description?: string | null;
  status?: string;
  guestCount?: number;
  tripsCount?: number;
  place?: PlaceModel;
}

export interface VehicleModel {
  id: string;
  accountId: string;
  eventId?: string | null;
  model: string;
  plateNumber: string;
  category: VehicleCategory;
  capacity: number;
  isActive: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastPingAt?: string | null;
}

export interface DriverModel {
  id: string;
  accountId: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  licenseNumber: string;
  dutyStatus: DutyStatus;
  currentVehicleId?: string | null;
  currentVehicle?: VehicleModel | null;
}

export interface DriverEventModel {
  id: string;
  driverId: string;
  eventId: string;
  status: DriverEventStatus;
  requestedAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  approvedBy?: string | null;
  driver?: DriverModel;
  event?: EventModel;
}

export interface GuestModel {
  id: string;
  eventId: string;
  userId?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  groupName?: string | null;
  hotelPlaceId?: string | null;
  arrivalDate?: string | null;
  notes?: string | null;
}

export interface GuestFunctionModel {
  id: string;
  guestId: string;
  functionId: string;
  status: GuestFunctionStatus;
  isAttending: boolean;
  assignedAt: string;
  guest?: GuestModel;
  function?: FunctionModel;
}

export interface TripModel {
  id: string;
  eventId: string;
  functionId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  originPlaceId?: string;
  destinationPlaceId?: string;
  pickupLocation?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  destination?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  scheduledPickupTime: string;
  estimatedArrivalTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  status: TripStatus;
  plannedDistanceKm?: number | null;
  actualDistanceKm?: number | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  boardingCode?: string | null;
  origin?: PlaceModel;
  destinationLocation?: PlaceModel;
  driver?: DriverModel;
  vehicle?: VehicleModel;
  function?: FunctionModel;
  bookingsCount?: number;
  totalPassengers?: number;
  passengerCapacity?: number;
}

export interface BookingModel {
  id: string;
  eventId: string;
  tripId?: string | null;
  guestId: string;
  pickupPlaceId: string;
  destinationPlaceId: string;
  requestedPickupTime: string;
  passengerCount: number;
  requestedCategory: VehicleCategory;
  status: BookingStatus;
  boardingCode: string;
  qrCodeUrl?: string | null;
  guest?: GuestModel;
  trip?: TripModel;
  pickupPlace?: PlaceModel;
  destinationPlace?: PlaceModel;
}

export interface LocationPingModel {
  id: string;
  tripId?: string | null;
  driverId: string;
  vehicleId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

export interface PricingRule {
  vehicleCategory: VehicleCategory;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  waitingRatePerMinute: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
}

export interface DashboardStats {
  totalGuests: number;
  totalBookings: number;
  activeTrips: number;
  vehiclesOnDuty: number;
  totalVehicles: number;
}
