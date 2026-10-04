/**
 * SAFAR Algorithm Engine Hub
 * 
 * Reusable domain algorithm layer for SAFAR:
 * - GPS Validation & Noise Rejection Pipeline
 * - Sliding-Window Telemetry Deduplication
 * - Incremental Haversine Distance Accumulation
 * - Cross-Track Route Deviation & Spatial Analysis
 * - Google Maps Cost Optimization & Route Decision Engine
 * - Deterministic ETA Calculation
 * - Multi-Factor Driver Candidate Scoring & Ranking
 * - In-Memory Realtime State Registry (with TTL Eviction)
 * - Authoritative Trip State Machine
 * - Cursor Pagination Engine
 * - Access Code Security & Privacy Sanitization
 */

export * from './types';
export * from './distance-engine';
export * from './deduplication-engine';
export * from './gps-engine';
export * from './route-deviation';
export * from './cost-optimizer';
export * from './eta-engine';
export * from './driver-assignment';
export * from './realtime-state';
export * from './trip-state-machine';
export * from './pagination';
export * from './access-engine';
