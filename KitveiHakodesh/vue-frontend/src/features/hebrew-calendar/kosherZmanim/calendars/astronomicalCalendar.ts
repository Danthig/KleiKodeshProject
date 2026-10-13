// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/AstronomicalCalendar.kt
// Only the members the ported zmanim reach; twilight getters, solar-dip search and equals/hashCode are left out.
import 'temporal-polyfill/global'
import type { AstronomicalCalculator } from '../calculators/astronomicalCalculator'
import { NOAACalculator } from '../calculators/noaaCalculator'
import { Instant } from '../instant'
import { doubleToInt, doubleToLong, integerDivide, LONG_MIN_VALUE } from '../kotlinNumbers'
import type { GeoLocation } from '../location/geoLocation'
import { DAY_MILLIS, utcMidnightEpochMillis } from '../utcMidnight'

export const GEOMETRIC_ZENITH = 90.0
export const MINUTE_MILLIS = 60 * 1000

/**
 * `getTimeOffset(time, offset: Long)`: [time] moved by [offset] milliseconds, null when either is missing
 * (`Long.MIN_VALUE` is the missing offset). The `Double` overload is this after `offset.toLong()`: call
 * [getTimeOffsetByDouble].
 */
export function getTimeOffset(time: Instant | null, offset: number): Instant | null {
  if (time === null || offset === LONG_MIN_VALUE) return null
  return time.plusMilliseconds(offset)
}

/** `getTimeOffset(time, offset: Double)`: the offset truncated to a `Long` first. */
export function getTimeOffsetByDouble(time: Instant | null, offset: number): Instant | null {
  return getTimeOffset(time, doubleToLong(offset))
}

/**
 * Sun times of one civil date at one place. Kotlin keeps a `LocalDateTime` (the date asked for, at the wall time
 * of construction in the place's zone); only its date is ever used, except across the antimeridian where the
 * wall time takes part in rolling the date.
 */
export class AstronomicalCalendar {
  astronomicalCalculator: AstronomicalCalculator = new NOAACalculator()

  constructor(
    readonly geoLocation: GeoLocation,
    public localDateTime: Temporal.PlainDateTime = Temporal.Now.plainDateTimeISO(geoLocation.timeZoneId),
  ) {}

  /** Sunrise adjusted for elevation (the calculator decides how). */
  get sunrise(): Instant | null {
    return this.getDateFromTime(this.getUTCSunrise(GEOMETRIC_ZENITH), true)
  }

  get seaLevelSunrise(): Instant | null {
    return this.getDateFromTime(this.getUTCSeaLevelSunrise(GEOMETRIC_ZENITH), true)
  }

  /** Sunset adjusted for elevation (the calculator decides how). */
  get sunset(): Instant | null {
    return this.getDateFromTime(this.getUTCSunset(GEOMETRIC_ZENITH), false)
  }

  get seaLevelSunset(): Instant | null {
    return this.getDateFromTime(this.getUTCSeaLevelSunset(GEOMETRIC_ZENITH), false)
  }

  getSunriseOffsetByDegrees(offsetZenith: number): Instant | null {
    return this.getDateFromTime(this.getUTCSunrise(offsetZenith), true)
  }

  getSunsetOffsetByDegrees(offsetZenith: number): Instant | null {
    return this.getDateFromTime(this.getUTCSunset(offsetZenith), false)
  }

  /** When the sun is [degrees] below the calculator's apparent sea-level horizon of the morning. */
  getSunriseOffsetByDegreesBelowHorizon(degrees: number): Instant | null {
    const horizon = this.astronomicalCalculator.horizonZenith(this.adjustedLocalDate.toPlainDate(), this.geoLocation, true, false)
    return this.getSunriseOffsetByDegrees(horizon + degrees)
  }

  /** When the sun is [degrees] below the calculator's apparent sea-level horizon of the evening. */
  getSunsetOffsetByDegreesBelowHorizon(degrees: number): Instant | null {
    const horizon = this.astronomicalCalculator.horizonZenith(this.adjustedLocalDate.toPlainDate(), this.geoLocation, false, false)
    return this.getSunsetOffsetByDegrees(horizon + degrees)
  }

  getUTCSunrise(zenith: number): number {
    return this.astronomicalCalculator.getUTCSunrise(this.adjustedLocalDate.toPlainDate(), this.geoLocation, zenith, true)
  }

  getUTCSeaLevelSunrise(zenith: number): number {
    return this.astronomicalCalculator.getUTCSunrise(this.adjustedLocalDate.toPlainDate(), this.geoLocation, zenith, false)
  }

  getUTCSunset(zenith: number): number {
    return this.astronomicalCalculator.getUTCSunset(this.adjustedLocalDate.toPlainDate(), this.geoLocation, zenith, true)
  }

  getUTCSeaLevelSunset(zenith: number): number {
    return this.astronomicalCalculator.getUTCSunset(this.adjustedLocalDate.toPlainDate(), this.geoLocation, zenith, false)
  }

  /** A twelfth of the day from [startOfday] to [endOfDay] in milliseconds (a `Long`), `Long.MIN_VALUE` if either is missing. */
  getTemporalHour(startOfday: Instant | null, endOfDay: Instant | null): number {
    if (startOfday === null || endOfDay === null) return LONG_MIN_VALUE
    return integerDivide(endOfDay.toEpochMilliseconds() - startOfday.toEpochMilliseconds(), 12)
  }

  /** Solar noon as the calculator computes it. */
  get sunTransit(): Instant | null {
    return this.getDateFromTime(this.astronomicalCalculator.getUTCNoon(this.adjustedLocalDate.toPlainDate(), this.geoLocation), false)
  }

  /**
   * The instant of [time] (UTC hours) on the calendar's date, moved a day back or forward when the event in fact
   * falls on the neighbouring UTC date. Hours, minutes and seconds are cut off one by one; what is left becomes
   * nanoseconds through Kotlin's `(ms).milliseconds`, which rounds to the nearest nanosecond.
   */
  protected getDateFromTime(time: number, isSunrise: boolean): Instant | null {
    if (Number.isNaN(time)) return null
    let calculatedTime = time
    let cal = utcMidnightEpochMillis(this.adjustedLocalDate.toPlainDate())
    const hours = doubleToInt(calculatedTime) // retain only the hours
    calculatedTime -= hours

    calculatedTime *= 60 // retain only the minutes
    const minutes = doubleToInt(calculatedTime)
    calculatedTime -= minutes

    calculatedTime *= 60 // retain only the seconds
    const seconds = doubleToInt(calculatedTime)
    calculatedTime -= seconds // remaining milliseconds

    // A date transition has occurred, or is about to: the event is on the day before or after the target date.
    const localTimeHours = doubleToInt(this.geoLocation.longitude / 15)
    if (isSunrise && localTimeHours + hours > 18) cal -= DAY_MILLIS
    else if (!isSunrise && localTimeHours + hours < 6) cal += DAY_MILLIS

    const nanoseconds = Math.round(calculatedTime * 1000 * 1_000_000)
    const periodNanoseconds = BigInt(hours) * 3_600_000_000_000n + BigInt(minutes) * 60_000_000_000n +
      BigInt(seconds) * 1_000_000_000n + BigInt(nanoseconds)
    return Instant.fromEpochMilliseconds(cal).plusNanoseconds(periodNanoseconds)
  }

  /** The date-time rolled a day for zones across the antimeridian (see `GeoLocation.antimeridianAdjustment`). */
  get adjustedLocalDate(): Temporal.PlainDateTime {
    const offset = this.geoLocation.antimeridianAdjustment
    if (offset === 0) return this.localDateTime
    return plusDaysInZone(this.localDateTime, offset, this.geoLocation.timeZoneId)
  }
}

/** kotlinx `localDateTime.toInstant(zone).plus(DatePeriod(days = days), zone).toLocalDateTime(zone)`. */
export function plusDaysInZone(localDateTime: Temporal.PlainDateTime, days: number, timeZoneId: string): Temporal.PlainDateTime {
  return localDateTime.toZonedDateTime(timeZoneId).add({ days }).toPlainDateTime()
}
