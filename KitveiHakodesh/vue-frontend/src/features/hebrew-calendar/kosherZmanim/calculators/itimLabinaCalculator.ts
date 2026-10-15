// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/ItimLabinaCalculator.kt
import 'temporal-polyfill/global'
import type { GeoLocation } from '../location/geoLocation'
import type { AstronomicalCalculator } from './astronomicalCalculator'
import { horizonDipDegrees, horizonRefractionDegrees, ItimLabinaClimate, STANDARD_CLIMATE } from './horizonRefraction'
import { sunAt } from './solarPosition'
import { SolarDay, SpaCalculator } from './spaCalculator'

/** The lower transit is taken this early (seconds): constant, cos, sin, cos 2, sin 2 of the day of the year. */
const MIDNIGHT_LAG = [0.1963, 0.0318, 0.0009, 0.0180, -0.0073] as const

/**
 * The calculator of the Itim Labina luach. On top of the [SpaCalculator]'s sun:
 *
 * - The horizon of sunrise and sunset ([horizonZenith]) is the sun's semidiameter plus a refraction traced through
 *   a model atmosphere and corrected by the place's [climate], for the month, morning or evening, at the observer's
 *   elevation; seen from an elevation the dip of the horizon is added. The fixed [refraction] and [solarRadius] are
 *   not used.
 * - Solar midnight ([getUTCMidnight]) is noon + 12 h minus whole seconds, found by stepping from noon + 12 h past
 *   the lower transit.
 */
export class ItimLabinaCalculator extends SpaCalculator {
  /** Monthly temperatures of the place; refracted times depend on them by a few seconds. */
  constructor(readonly climate: ItimLabinaClimate = STANDARD_CLIMATE) {
    super()
  }

  override copy(): AstronomicalCalculator {
    const copied = new ItimLabinaCalculator(this.climate)
    this.copyTo(copied)
    return copied
  }

  override horizonZenith(date: Temporal.PlainDate, geoLocation: GeoLocation, isSunrise: boolean, adjustForElevation: boolean): number {
    const month = date.month - 1
    const semidiameter = sunAt(new SolarDay(date, geoLocation.longitude).noon).semidiameter
    const refraction = horizonRefractionDegrees(
      geoLocation.latitude, geoLocation.longitude, this.climate, month, isSunrise, geoLocation.elevation,
    )
    const dip = adjustForElevation ? horizonDipDegrees(geoLocation.latitude, this.climate, month, geoLocation.elevation) : 0.0
    return 90 + semidiameter + refraction + dip
  }

  override getUTCMidnight(date: Temporal.PlainDate, geoLocation: GeoLocation): number {
    const tomorrow = date.add({ days: 1 })
    const noon = new SolarDay(tomorrow, geoLocation.longitude).noon
    const lowerTransit = new SolarDay(date, geoLocation.longitude).midnightAfter
    const lead = (noon - lowerTransit) * 86_400 - 43_200
    const w = 2 * Math.PI * (tomorrow.dayOfYear - 1) / 365.25
    const lagged = lead + MIDNIGHT_LAG[0] + MIDNIGHT_LAG[1] * Math.cos(w) + MIDNIGHT_LAG[2] * Math.sin(w) +
      MIDNIGHT_LAG[3] * Math.cos(2 * w) + MIDNIGHT_LAG[4] * Math.sin(2 * w)
    const seconds = lagged > 0 ? Math.ceil(lagged) : Math.floor(lagged)
    return this.utcHours(date, noon - 0.5 - seconds / 86_400)
  }
}
