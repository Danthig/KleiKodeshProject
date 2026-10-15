// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/AstronomicalCalculator.kt
import type { GeoLocation } from '../location/geoLocation'

/** Taken from java.lang.Math: multiply degrees by this to get radians. */
const DEGREES_TO_RADIANS = 0.017453292519943295

/** Taken from java.lang.Math: multiply radians by this to get degrees. */
const RADIANS_TO_DEGREES = 57.29577951308232

/** The zenith of astronomical sunrise and sunset: the sun is 90 degrees from the vertical. */
const GEOMETRIC_ZENITH = 90.0

export function toDegrees(angrad: number): number {
  return angrad * RADIANS_TO_DEGREES
}

export function toRadians(angdeg: number): number {
  return angdeg * DEGREES_TO_RADIANS
}

/**
 * The base of every sun-time algorithm. Times are UTC hours of the given date, NaN when the sun never reaches
 * the zenith asked for.
 */
export abstract class AstronomicalCalculator {
  /** Refraction at the horizon, in degrees (34 arc minutes). */
  refraction = 34 / 60.0

  /** The sun's apparent radius, in degrees (16 arc minutes). */
  solarRadius = 16 / 60.0

  /** Earth radius in km; only affects the elevation adjustment. */
  earthRadius = 6356.9

  abstract getUTCSunrise(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number

  abstract getUTCSunset(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number

  /** Solar noon, UTC hours. */
  abstract getUTCNoon(date: Temporal.PlainDate, geoLocation: GeoLocation): number

  abstract copy(): AstronomicalCalculator

  /** How far below the sea-level horizon an observer at [elevation] meters sees, in degrees. */
  getElevationAdjustment(elevation: number): number {
    return toDegrees(Math.acos(this.earthRadius / (this.earthRadius + (elevation / 1000))))
  }

  /** Adds solar radius, refraction and elevation to a zenith of exactly 90 degrees; any other zenith is returned as is. */
  adjustZenith(zenith: number, elevation: number): number {
    if (zenith !== GEOMETRIC_ZENITH) return zenith
    return zenith + (this.solarRadius + this.refraction + this.getElevationAdjustment(elevation))
  }

  /**
   * The zenith of the apparent horizon at sunrise ([isSunrise]) or sunset: where the sun's center is when its upper
   * limb touches the horizon. Calculators with a finer model of the horizon override it.
   */
  horizonZenith(_date: Temporal.PlainDate, geoLocation: GeoLocation, _isSunrise: boolean, adjustForElevation: boolean): number {
    return GEOMETRIC_ZENITH + this.solarRadius + this.refraction +
      (adjustForElevation ? this.getElevationAdjustment(geoLocation.elevation) : 0.0)
  }

  /** Solar midnight, UTC hours, or NaN to let the calendar take it as halfway between two solar noons. */
  getUTCMidnight(_date: Temporal.PlainDate, _geoLocation: GeoLocation): number {
    return Number.NaN
  }
}
