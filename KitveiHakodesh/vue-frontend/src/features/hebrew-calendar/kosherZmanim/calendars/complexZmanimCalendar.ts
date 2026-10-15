// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/ComplexZmanimCalendar.kt
// Only the zmanim the KosherKotlin demo app's two luach modes print, and what they call. The `jewishCalendar` the
// Kotlin class keeps in step with the date is not ported: none of these zmanim reads it.
import 'temporal-polyfill/global'
import type { Instant } from '../instant'
import { doubleToLong, integerDivide, LONG_MIN_VALUE } from '../kotlinNumbers'
import type { GeoLocation } from '../location/geoLocation'
import { GEOMETRIC_ZENITH, getTimeOffset, MINUTE_MILLIS, plusDaysInZone } from './astronomicalCalendar'
import { ZmanimCalendar } from './zmanimCalendar'

/** The sun 11.5 degrees below the geometric horizon: misheyakir. */
export const ZENITH_11_POINT_5 = GEOMETRIC_ZENITH + 11.5

/**
 * Degrees below the apparent horizon of the Itim Labina zmanim. Kotlin declares them as `Float` literals and
 * widens them with `toDouble()`, so they are the nearest floats, not the decimals as written.
 */
const ITIM_LABINA_72_MINUTES = Math.fround(15.2193)
const ITIM_LABINA_90_MINUTES = Math.fround(18.9712)
const ITIM_LABINA_GEONIM_18_MINUTES = Math.fround(3.8217)

export class ComplexZmanimCalendar extends ZmanimCalendar {
  /**
   * Kotlin's secondary constructor: the date at the current wall time in the place's zone, as
   * `LocalDateTime(date, localDateTime.time)` does.
   */
  static forDate(
    location: GeoLocation,
    date: Temporal.PlainDate,
    useElevation: boolean,
    candleLightingOffset: number,
  ): ComplexZmanimCalendar {
    const calendar = new ComplexZmanimCalendar(location)
    calendar.localDateTime = date.toPlainDateTime(calendar.localDateTime.toPlainTime())
    calendar.isUseElevation = useElevation
    calendar.candleLightingOffset = candleLightingOffset
    return calendar
  }

  get alos72Zmanis(): Instant | null {
    return this.getZmanisBasedOffset(-1.2)
  }

  get misheyakir11Point5Degrees(): Instant | null {
    return this.getSunriseOffsetByDegrees(ZENITH_11_POINT_5)
  }

  get sofZmanShmaMGA72Minutes(): Instant | null {
    return this.sofZmanShmaMGA
  }

  get sofZmanShmaMGA72MinutesZmanis(): Instant | null {
    return this.getSofZmanShma(this.alos72Zmanis, this.tzais72Zmanis)
  }

  get sofZmanTfilaMGA72MinutesZmanis(): Instant | null {
    return this.getSofZmanTfila(this.alos72Zmanis, this.tzais72Zmanis)
  }

  get tzais72Zmanis(): Instant | null {
    return this.getZmanisBasedOffset(1.2)
  }

  /** [hours] of the GRA's shaos zmaniyos after sunset (positive) or before sunrise (negative). */
  private getZmanisBasedOffset(hours: number): Instant | null {
    const shaahZmanis = this.getTemporalHour(this.elevationAdjustedSunrise, this.elevationAdjustedSunset)
    if (shaahZmanis === LONG_MIN_VALUE || hours === 0.0) return null
    return getTimeOffset(
      hours > 0 ? this.elevationAdjustedSunset : this.elevationAdjustedSunrise,
      doubleToLong(shaahZmanis * hours),
    )
  }

  /**
   * The calculator's own solar midnight when it has one (Itim Labina); otherwise halfway between this chatzos and
   * tomorrow's, halving the exact nanosecond distance before cutting it to whole milliseconds.
   */
  get solarMidnight(): Instant | null {
    const calculatorMidnight = this.astronomicalCalculator.getUTCMidnight(this.adjustedLocalDate.toPlainDate(), this.geoLocation)
    if (!Number.isNaN(calculatorMidnight)) return this.getDateFromTime(calculatorMidnight, false)

    const clonedCal = new ComplexZmanimCalendar(this.geoLocation)
    clonedCal.astronomicalCalculator = this.astronomicalCalculator.copy()
    clonedCal.localDateTime = plusDaysInZone(this.localDateTime, 1, this.geoLocation.timeZoneId)
    const tomorrowChatzos = clonedCal.chatzos
    const thisChatzos = this.chatzos
    if (tomorrowChatzos === null || thisChatzos === null) return null
    // Duration.div(2) truncates the nanoseconds; inWholeMilliseconds truncates toward zero.
    const halfNanoseconds = tomorrowChatzos.nanosecondsSince(thisChatzos) / 2n
    return getTimeOffset(thisChatzos, Number(halfNanoseconds / 1_000_000n))
  }

  /** [degrees] below the calculator's apparent horizon, morning ([isSunrise]) or evening. */
  private itimLabina(degrees: number, isSunrise: boolean): Instant | null {
    return isSunrise
      ? this.getSunriseOffsetByDegreesBelowHorizon(degrees)
      : this.getSunsetOffsetByDegreesBelowHorizon(degrees)
  }

  get alos72ItimLabina(): Instant | null {
    return this.itimLabina(ITIM_LABINA_72_MINUTES, true)
  }

  get alos90ItimLabina(): Instant | null {
    return this.itimLabina(ITIM_LABINA_90_MINUTES, true)
  }

  get tzais72ItimLabina(): Instant | null {
    return this.itimLabina(ITIM_LABINA_72_MINUTES, false)
  }

  get tzaisGeonim18MinutesItimLabina(): Instant | null {
    return this.itimLabina(ITIM_LABINA_GEONIM_18_MINUTES, false)
  }

  get misheyakir66MinutesZmanis(): Instant | null {
    return this.getZmanisBasedOffset(-1.1)
  }

  get tzais13Point5MinutesZmanis(): Instant | null {
    return this.getZmanisBasedOffset(0.225)
  }

  get tzais20(): Instant | null {
    return getTimeOffset(this.elevationAdjustedSunset, 20 * MINUTE_MILLIS)
  }

  /** Half a shaah zmanis after chatzos, but never less than 30 minutes. */
  get minchaGedolaOhrHaChaim(): Instant | null {
    const halfShaahZmanis = integerDivide(this.shaahZmanisGra, 2)
    return getTimeOffset(this.chatzos, halfShaahZmanis > 30 * MINUTE_MILLIS ? halfShaahZmanis : 30 * MINUTE_MILLIS)
  }

  /** A shaah zmanis and a quarter (75 minutes zmaniyos) before tzais of 13.5 minutes zmaniyos. */
  get plagHaminchaYalkutYosef(): Instant | null {
    const shaahZmanis = this.shaahZmanisGra
    return getTimeOffset(this.tzais13Point5MinutesZmanis, -(shaahZmanis + 15 * integerDivide(shaahZmanis, 60)))
  }
}
