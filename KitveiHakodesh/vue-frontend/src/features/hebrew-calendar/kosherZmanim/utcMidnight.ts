// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904.
// `date.atStartOfDayIn(TimeZone.UTC).toEpochMilliseconds()`, used by SpaCalculator.kt and AstronomicalCalendar.kt.

export const DAY_MILLIS = 86_400_000

/** Epoch milliseconds of 0:00 UTC of [date]. */
export function utcMidnightEpochMillis(date: Temporal.PlainDate): number {
  // setUTCFullYear rather than Date.UTC, which reads years 0-99 as 1900-1999.
  return new Date(0).setUTCFullYear(date.year, date.month - 1, date.day)
}
