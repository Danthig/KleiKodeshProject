// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/SpaCalculator.kt
import type { GeoLocation } from '../location/geoLocation'
import { AstronomicalCalculator } from './astronomicalCalculator'
import { julianDayOfEpochMillis, sunAt } from './solarPosition'
import { utcMidnightEpochMillis } from '../utcMidnight'

/**
 * A calculator after the NREL Solar Position Algorithm (Reda & Andreas, 2004). Times are solved for, not
 * interpolated: the sun's altitude is bisected between the lower transit and solar noon.
 *
 * Sunrise and sunset (a zenith of exactly 90) use [horizonZenith]; any other zenith is geometric.
 */
export class SpaCalculator extends AstronomicalCalculator {
  copy(): AstronomicalCalculator {
    const copied = new SpaCalculator()
    this.copyTo(copied)
    return copied
  }

  protected copyTo(other: AstronomicalCalculator): void {
    other.refraction = this.refraction
    other.solarRadius = this.solarRadius
    other.earthRadius = this.earthRadius
  }

  getUTCSunrise(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number {
    return this.event(date, geoLocation, zenith, adjustForElevation, true)
  }

  getUTCSunset(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number {
    return this.event(date, geoLocation, zenith, adjustForElevation, false)
  }

  getUTCNoon(date: Temporal.PlainDate, geoLocation: GeoLocation): number {
    return this.utcHours(date, new SolarDay(date, geoLocation.longitude).noon)
  }

  private event(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean, isSunrise: boolean): number {
    const target = zenith === 90.0 ? this.horizonZenith(date, geoLocation, isSunrise, adjustForElevation) : zenith
    const jd = new SolarDay(date, geoLocation.longitude).crossing(geoLocation.latitude, 90 - target, isSunrise)
    return Number.isNaN(jd) ? Number.NaN : this.utcHours(date, jd)
  }

  /** Hours after 0:00 UTC of [date], in [0, 24), as the calendars expect. */
  protected utcHours(date: Temporal.PlainDate, julianDay: number): number {
    const midnight = julianDayOfEpochMillis(utcMidnightEpochMillis(date))
    return (((julianDay - midnight) * 24) % 24 + 24) % 24
  }
}

/** Solar noon and the neighbouring lower transits of [date] at [longitude], as Julian days. */
export class SolarDay {
  /** Midday of the date in local mean solar time: anchors the day whatever the time zone. */
  private readonly anchor: number
  private noonCache: number | undefined
  private midnightBeforeCache: number | undefined
  private midnightAfterCache: number | undefined

  constructor(date: Temporal.PlainDate, private readonly longitude: number) {
    this.anchor = julianDayOfEpochMillis(utcMidnightEpochMillis(date)) + 0.5 - longitude / 360
  }

  get noon(): number {
    return (this.noonCache ??= this.hourAngleCrossing(this.anchor, 0.0))
  }

  get midnightBefore(): number {
    return (this.midnightBeforeCache ??= this.hourAngleCrossing(this.noon - 0.5, 180.0))
  }

  get midnightAfter(): number {
    return (this.midnightAfterCache ??= this.hourAngleCrossing(this.noon + 0.5, 180.0))
  }

  /**
   * When the sun's geocentric altitude crosses [altitude], rising between the previous lower transit and noon or
   * setting between noon and the next one; NaN when it never gets there.
   */
  crossing(latitude: number, altitude: number, rising: boolean): number {
    const f = (jd: number) => sunAt(jd).altitude(latitude, this.longitude) - altitude
    let low = rising ? this.midnightBefore : this.noon
    let high = rising ? this.noon : this.midnightAfter
    const fLow = f(low)
    if (fLow * f(high) > 0) return Number.NaN
    const increasing = fLow < 0
    for (let step = 0; step < 40; step++) {
      const mid = (low + high) / 2
      if ((f(mid) < 0) === increasing) low = mid
      else high = mid
    }
    return (low + high) / 2
  }

  /** Refines the moment the local hour angle equals [target] (0: noon, 180: midnight), starting near [guess]. */
  private hourAngleCrossing(guess: number, target: number): number {
    let jd = guess
    for (let step = 0; step < 4; step++) {
      const h = sunAt(jd).hourAngle(this.longitude)
      jd -= (((h - target) % 360 + 540) % 360 - 180) / 360
    }
    return jd
  }
}
