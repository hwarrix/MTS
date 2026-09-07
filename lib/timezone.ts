import { DateTime } from 'luxon'

/**
 * Convert a UTC ISO timestamp string to the device's local time zone.
 * All datetimes are stored as UTC in Supabase; this converts for display.
 */
export function utcToLocal(utcIso: string): DateTime {
  return DateTime.fromISO(utcIso, { zone: 'utc' }).toLocal()
}

/**
 * Format a UTC ISO string to a readable local date+time string.
 * e.g. "Mon, Sep 9 · 3:00 PM (GMT+3)"
 */
export function formatAppointmentTime(utcIso: string): string {
  const local = utcToLocal(utcIso)
  return local.toFormat("EEE, MMM d · h:mm a (z)")
}

/**
 * Format a UTC ISO string to a short time only.
 * e.g. "3:00 PM"
 */
export function formatTime(utcIso: string): string {
  return utcToLocal(utcIso).toFormat('h:mm a')
}

/**
 * Format a UTC ISO string to a short date only.
 * e.g. "Sep 9, 2026"
 */
export function formatDate(utcIso: string): string {
  return utcToLocal(utcIso).toFormat('MMM d, yyyy')
}

/**
 * Format a date as a day heading.
 * e.g. "Monday, September 9"
 */
export function formatDayHeading(utcIso: string): string {
  return utcToLocal(utcIso).toFormat('EEEE, MMMM d')
}

/**
 * Convert a local Date object to a UTC ISO string for saving to DB.
 */
export function localToUtcIso(date: Date): string {
  return DateTime.fromJSDate(date).toUTC().toISO()!
}

/**
 * Return the current device timezone name.
 * e.g. "Africa/Cairo", "America/New_York"
 */
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Check if an appointment is in the past.
 */
export function isInPast(utcIso: string): boolean {
  return utcToLocal(utcIso) < DateTime.now()
}

/**
 * Get relative time string.
 * e.g. "in 2 hours", "3 days ago"
 */
export function relativeTime(utcIso: string): string {
  return utcToLocal(utcIso).toRelative() ?? ''
}

/**
 * Format a date range for slot display.
 * e.g. "3:00 PM – 3:30 PM"
 */
export function formatSlotRange(startUtc: string, endUtc: string): string {
  return `${formatTime(startUtc)} – ${formatTime(endUtc)}`
}
