import { z } from 'zod';
import { TripStatus, VehicleCategory, DutyStatus } from '@safar/types';

// Accept both MongoDB 24-hex ObjectId and standard UUID formats
const IdSchema = z.string().min(1);

export const JoinEventCodeSchema = z.object({
  code: z.string().trim().min(4).max(12).toUpperCase(),
});

export const CreateEventSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters'),
  city: z.string().min(2, 'City is required'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().optional(),
});

export const CreatePlaceSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: z.enum(['HOTEL', 'VENUE', 'AIRPORT', 'TRAIN_STATION', 'RESIDENCE', 'OTHER']),
});

export const CreateFunctionSchema = z.object({
  name: z.string().min(2),
  placeId: IdSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const CreateVehicleSchema = z.object({
  model: z.string().min(2),
  plateNumber: z.string().min(3).toUpperCase(),
  category: z.nativeEnum(VehicleCategory),
  capacity: z.number().int().min(1).max(60),
});

export const InviteDriverSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10),
  licenseNumber: z.string().min(4),
  assignedVehicleId: IdSchema.optional(),
});

export const CreateTripSchema = z.object({
  originPlaceId: IdSchema,
  destinationPlaceId: IdSchema,
  scheduledPickupTime: z.string().datetime(),
  vehicleId: IdSchema.optional(),
  driverId: IdSchema.optional(),
});

export const UpdateTripStatusSchema = z.object({
  status: z.nativeEnum(TripStatus),
  reason: z.string().optional(),
});

export const CreateBookingSchema = z.object({
  pickupPlaceId: IdSchema,
  destinationPlaceId: IdSchema,
  requestedPickupTime: z.string().datetime(),
  passengerCount: z.number().int().min(1).max(12),
  requestedCategory: z.nativeEnum(VehicleCategory),
});

export const VerifyBoardingSchema = z.object({
  tripId: IdSchema,
  boardingCode: z.string().length(4, 'Boarding code must be exactly 4 digits'),
});

export const LocationPingSchema = z.object({
  tripId: IdSchema.optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional().nullable(),
  speed: z.number().min(0).optional().nullable(),
  accuracy: z.number().optional().nullable(),
  timestamp: z.string().datetime(),
});

export const UpdateDutyStatusSchema = z.object({
  dutyStatus: z.nativeEnum(DutyStatus),
});
