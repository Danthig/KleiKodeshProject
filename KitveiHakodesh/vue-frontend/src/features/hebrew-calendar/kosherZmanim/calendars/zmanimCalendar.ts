// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/ZmanimCalendar.kt
// Kotlin wraps each zman in a `Zman.DateBased` carrying metadata; here a getter returns the instant itself.
// Only the zmanim the facade exposes are ported (plus `shaahZmanisGra`, which ComplexZmanimCalendar reads).
import type { Instant } from '../instant'
import {
  AstronomicalCalendar,
  GEOMETRIC_ZENITH,
  getTimeOffset,
  getTimeOffsetByDouble,
  MINUTE_MILLIS,
} from './astronomicalCalendar'

/** The sun 16.1 degrees below the geometric horizon: alos. */
export const ZENITH_16_POINT_1 = GEOMETRIC_ZENITH + 16.1

/** The sun 8.5 degrees below the geometric horizon: tzais. */
export const ZENITH_8_POINT_5 = GEOMETRIC_ZENITH + 8.5

export class ZmanimCalendar extends AstronomicalCalendar {
  /** Whether sunrise and sunset based zmanim use the elevation-adjusted sun. */
  isUseElevation = false

  /** Minutes before sea-level sunset. */
  candleLightingOffset = 18.0

  protected get elevationAdjustedSunrise(): Instant | null {
    return this.isUseElevation ? this.sunrise : this.seaLevelSunrise
  }

  protected get elevationAdjustedSunset(): Instant | null {
    return this.isUseElevation ? this.sunset : this.seaLevelSunset
  }

  get tzais(): Instant | null {
    return this.getSunsetOffsetByDegrees(ZENITH_8_POINT_5)
  }

  get alosHashachar(): Instant | null {
    return this.getSunriseOffsetByDegrees(ZENITH_16_POINT_1)
  }

  get alos72(): Instant | null {
    return getTimeOffset(this.elevationAdjustedSunrise, -72 * MINUTE_MILLIS)
  }

  get chatzos(): Instant | null {
    return this.sunTransit
  }

  getSofZmanShma(startOfDay: Instant | null, endOfDay: Instant | null): Instant | null {
    return this.getShaahZmanisBasedZman(startOfDay, endOfDay, 3.0)
  }

  get sofZmanShmaGRA(): Instant | null {
    return this.getSofZmanShma(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  get sofZmanShmaMGA(): Instant | null {
    return this.getSofZmanShma(this.alos72, this.tzais72)
  }

  get tzais72(): Instant | null {
    return getTimeOffset(this.elevationAdjustedSunset, 72 * MINUTE_MILLIS)
  }

  get candleLighting(): Instant | null {
    return getTimeOffsetByDouble(this.seaLevelSunset, -this.candleLightingOffset * MINUTE_MILLIS)
  }

  getSofZmanTfila(startOfDay: Instant | null, endOfDay: Instant | null): Instant | null {
    return this.getShaahZmanisBasedZman(startOfDay, endOfDay, 4.0)
  }

  get sofZmanTfilaGRA(): Instant | null {
    return this.getSofZmanTfila(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  get sofZmanTfilaMGA(): Instant | null {
    return this.getSofZmanTfila(this.alos72, this.tzais72)
  }

  getMinchaGedola(startOfDay: Instant | null, endOfDay: Instant | null): Instant | null {
    return this.getShaahZmanisBasedZman(startOfDay, endOfDay, 6.5)
  }

  get minchaGedola(): Instant | null {
    return this.getMinchaGedola(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  getMinchaKetana(startOfDay: Instant | null, endOfDay: Instant | null): Instant | null {
    return this.getShaahZmanisBasedZman(startOfDay, endOfDay, 9.5)
  }

  get minchaKetana(): Instant | null {
    return this.getMinchaKetana(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  getPlagHamincha(startOfDay: Instant | null, endOfDay: Instant | null): Instant | null {
    return this.getShaahZmanisBasedZman(startOfDay, endOfDay, 10.75)
  }

  get plagHamincha(): Instant | null {
    return this.getPlagHamincha(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  /**
   * The GRA's shaah zmanis in milliseconds. Kotlin returns `temporalHour.milliseconds` and callers read
   * `inWholeMilliseconds`, a round trip that gives back the same `Long` (`Long.MIN_VALUE` included).
   */
  get shaahZmanisGra(): number {
    return this.getTemporalHour(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
  }

  /** [hours] shaos zmaniyos of the day from [startOfDay] to [endOfDay], counted from [startOfDay]. */
  getShaahZmanisBasedZman(startOfDay: Instant | null, endOfDay: Instant | null, hours: number): Instant | null {
    return getTimeOffsetByDouble(startOfDay, this.getTemporalHour(startOfDay, endOfDay) * hours)
  }
}
