/**
 * SAFAR Cursor Pagination Engine
 * 
 * Provides stable, scalable cursor-based pagination for large datasets
 * (Location History, Audit Logs, Trip History).
 * 
 * Avoids slow SQL OFFSET queries on deep pages.
 */

import { PaginationParams, PaginatedResult } from './types';

export function encodeCursor(id: string, timestamp?: Date | number): string {
  const ts = timestamp instanceof Date ? timestamp.getTime() : (timestamp || Date.now());
  const raw = `${id}:${ts}`;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(raw).toString('base64url');
  }
  return btoa(raw);
}

export function decodeCursor(cursor: string): { id: string; timestamp: number } | null {
  try {
    let raw = '';
    if (typeof Buffer !== 'undefined') {
      raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    } else {
      raw = atob(cursor);
    }
    const [id, tsStr] = raw.split(':');
    const timestamp = parseInt(tsStr, 10);
    if (!id || isNaN(timestamp)) return null;
    return { id, timestamp };
  } catch {
    return null;
  }
}

/**
 * Transforms an array slice into a standard PaginatedResult.
 */
export function paginateArray<T extends { id: string; createdAt?: Date | string; timestamp?: Date | string }>(
  items: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;
  if (hasMore && sliced.length > 0) {
    const lastItem = sliced[sliced.length - 1];
    const ts = lastItem.timestamp || lastItem.createdAt || Date.now();
    nextCursor = encodeCursor(lastItem.id, new Date(ts).getTime());
  }

  return {
    items: sliced,
    nextCursor,
    hasMore,
  };
}
