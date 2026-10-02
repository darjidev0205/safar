import { ApiResponse, UserProfile, EventModel, VehicleModel, DriverModel, TripModel, BookingModel, DashboardStats, LocationPingModel } from '@safar/types';

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
}

export class SafarApiClient {
  private baseUrl: string;
  private getAuthToken?: () => Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAuthToken = config.getAuthToken;
  }

  public setTokenGetter(getter: () => Promise<string | null>) {
    this.getAuthToken = getter;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (err) {
        console.warn('Failed to retrieve auth token:', err);
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await response.json();

    if (!response.ok || !json.success) {
      const err = new Error(json.error?.message || `HTTP ${response.status}`);
      (err as any).code = json.error?.code || 'UNKNOWN_ERROR';
      (err as any).details = json.error?.details;
      throw err;
    }

    return json.data as T;
  }

  // Auth & Profile
  public auth = {
    getMe: () => this.request<UserProfile>('/api/v1/me'),
    syncProfile: (data: { fullName: string; role?: string }) =>
      this.request<UserProfile>('/api/v1/auth/sync', { method: 'POST', body: JSON.stringify(data) }),
  };

  // Events
  public events = {
    list: () => this.request<EventModel[]>('/api/v1/events'),
    get: (id: string) => this.request<EventModel>(`/api/v1/events/${id}`),
    create: (data: any) => this.request<EventModel>('/api/v1/events', { method: 'POST', body: JSON.stringify(data) }),
    findByCode: (code: string) => this.request<EventModel>(`/api/v1/events/code/${code}`),
    join: (code: string) => this.request<{ joined: boolean; event: EventModel }>('/api/v1/events/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
    getStats: (eventId: string) => this.request<DashboardStats>(`/api/v1/events/${eventId}/stats`),
  };

  // Fleet & Drivers
  public fleet = {
    getVehicles: (eventId?: string) =>
      this.request<VehicleModel[]>(`/api/v1/vehicles${eventId ? `?eventId=${eventId}` : ''}`),
    createVehicle: (data: any) =>
      this.request<VehicleModel>('/api/v1/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    getDrivers: (eventId?: string) =>
      this.request<DriverModel[]>(`/api/v1/drivers${eventId ? `?eventId=${eventId}` : ''}`),
    inviteDriver: (data: any) =>
      this.request<DriverModel>('/api/v1/drivers/invite', { method: 'POST', body: JSON.stringify(data) }),
    updateDutyStatus: (driverId: string, dutyStatus: string) =>
      this.request<DriverModel>(`/api/v1/drivers/${driverId}/duty`, {
        method: 'PATCH',
        body: JSON.stringify({ dutyStatus }),
      }),
  };

  // Trips & State Machine
  public trips = {
    list: (eventId: string) => this.request<TripModel[]>(`/api/v1/trips?eventId=${eventId}`),
    get: (tripId: string) => this.request<TripModel>(`/api/v1/trips/${tripId}`),
    create: (eventId: string, data: any) =>
      this.request<TripModel>(`/api/v1/trips?eventId=${eventId}`, { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (tripId: string, status: string, reason?: string) =>
      this.request<TripModel>(`/api/v1/trips/${tripId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    verifyBoarding: (tripId: string, boardingCode: string) =>
      this.request<{ verified: boolean; bookingId: string }>(`/api/v1/trips/${tripId}/verify-boarding`, {
        method: 'POST',
        body: JSON.stringify({ boardingCode }),
      }),
    getDriverNextTrip: () => this.request<TripModel | null>('/api/v1/trips/driver/current'),
  };

  // Bookings
  public bookings = {
    list: (eventId: string) => this.request<BookingModel[]>(`/api/v1/bookings?eventId=${eventId}`),
    getMyBookings: () => this.request<BookingModel[]>('/api/v1/bookings/my'),
    create: (eventId: string, data: any) =>
      this.request<BookingModel>(`/api/v1/bookings?eventId=${eventId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => this.request<BookingModel>(`/api/v1/bookings/${id}`),
  };

  // Live GPS Tracking
  public tracking = {
    sendPing: (ping: any) =>
      this.request<LocationPingModel>('/api/v1/tracking/ping', { method: 'POST', body: JSON.stringify(ping) }),
    getFleetPings: (eventId: string) =>
      this.request<LocationPingModel[]>(`/api/v1/tracking/fleet?eventId=${eventId}`),
  };
}
