// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// app/composeApp/src/commonMain/kotlin/app/domain/ZmanimRepository.kt (`calendarFor`).
import 'temporal-polyfill/global'
import type { AstronomicalCalculator } from './calculators/astronomicalCalculator'
import { type ItimLabinaClimate, STANDARD_CLIMATE } from './calculators/horizonRefraction'
import { ItimLabinaCalculator } from './calculators/itimLabinaCalculator'
import { NOAACalculator } from './calculators/noaaCalculator'
import { ComplexZmanimCalendar } from './calendars/complexZmanimCalendar'
import { GeoLocation } from './location/geoLocation'

export type KosherCalculatorName = 'itimLabina' | 'noaa'

export interface KosherZmanimOptions {
  /** Degrees, north positive. */
  lat: number
  /** Degrees, east positive. */
  lng: number
  /** Meters. */
  elevation: number
  /** IANA time zone id; it must be one KosherKotlin knows the raw offset of. */
  tzid: string
  /** The civil date, month 1-12. */
  date: { year: number, month: number, day: number }
  calculator: KosherCalculatorName
  useElevation: boolean
  /** Minutes before sea-level sunset; 18 when left out. */
  candleLightingOffset?: number
  /** The place's monthly temperatures, for the Itim Labina calculator's refraction; the standard 15 C when left out. */
  climate?: ItimLabinaClimate
}

function calculatorNamed(name: KosherCalculatorName, climate: ItimLabinaClimate | undefined): AstronomicalCalculator {
  return name === 'itimLabina' ? new ItimLabinaCalculator(climate ?? STANDARD_CLIMATE) : new NOAACalculator()
}

/** The calendar as the demo app builds it: location, date, elevation choice, candle lighting, calculator. */
export function buildComplexZmanimCalendar(options: KosherZmanimOptions): ComplexZmanimCalendar {
  const calendar = ComplexZmanimCalendar.forDate(
    new GeoLocation(options.lat, options.lng, options.elevation, options.tzid),
    Temporal.PlainDate.from(options.date, { overflow: 'reject' }),
    options.useElevation,
    options.candleLightingOffset ?? 18.0,
  )
  calendar.astronomicalCalculator = calculatorNamed(options.calculator, options.climate)
  return calendar
}
