/**
 * SAFAR Time-Based Dynamic Greeting Utility
 * 
 * Generates dynamic time-based greetings based on the user's local browser/device time.
 * Rules:
 * - 05:00–11:59 → Good morning
 * - 12:00–16:59 → Good afternoon
 * - 17:00–20:59 → Good evening
 * - 21:00–04:59 → Good night
 */

export type GreetingPeriod = 'Good morning' | 'Good afternoon' | 'Good evening' | 'Good night';

export function getTimeBasedGreeting(date: Date = new Date()): GreetingPeriod {
  const hours = date.getHours();

  if (hours >= 5 && hours < 12) {
    return 'Good morning';
  } else if (hours >= 12 && hours < 17) {
    return 'Good afternoon';
  } else if (hours >= 17 && hours < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}

/**
 * Returns a personalized greeting for the user, strictly avoiding using their email as display name.
 * 
 * @param displayName User's saved full/display name
 * @param date Optional date for testing time boundaries
 * @returns Formatted greeting string e.g. "Good morning, Dev 👋" or safe fallback "Welcome back 👋"
 */
export function formatHostGreeting(displayName?: string | null, date: Date = new Date()): string {
  const greeting = getTimeBasedGreeting(date);

  // Safety: never show email as display name, never show undefined/null/[object Object]
  if (!displayName || !displayName.trim() || displayName.includes('@')) {
    return 'Welcome back 👋';
  }

  const cleanName = displayName.trim();
  return `${greeting}, ${cleanName} 👋`;
}
