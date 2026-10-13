// Public entry of the KosherKotlin port (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904.
// Times are epoch milliseconds, floored like Kotlin's `Instant.toEpochMilliseconds()`; null where the sun never
// gets there that day.
import { buildComplexZmanimCalendar, type KosherZmanimOptions } from './buildCalendar'

export type { KosherCalculatorName, KosherZmanimOptions } from './buildCalendar'
export { demoModeRows } from './demoModeRows'
export type { DayGroup, DemoDay, DemoRow, DemoRowId, LuachMode } from './demoModeRows'

/** The zmanim the calendar exposes, named after their KosherKotlin getters. */
export const ZMAN_GETTER_NAMES = [
  'alosHashachar',
  'alos72',
  'alos72Zmanis',
  'alos72ItimLabina',
  'alos90ItimLabina',
  'misheyakir11Point5Degrees',
  'misheyakir66MinutesZmanis',
  'sunrise',
  'seaLevelSunrise',
  'sofZmanShmaGRA',
  'sofZmanShmaMGA',
  'sofZmanShmaMGA72Minutes',
  'sofZmanShmaMGA72MinutesZmanis',
  'sofZmanTfilaGRA',
  'sofZmanTfilaMGA',
  'sofZmanTfilaMGA72MinutesZmanis',
  'chatzos',
  'minchaGedola',
  'minchaGedolaOhrHaChaim',
  'minchaKetana',
  'plagHamincha',
  'plagHaminchaYalkutYosef',
  'candleLighting',
  'sunset',
  'seaLevelSunset',
  'tzais',
  'tzais13Point5MinutesZmanis',
  'tzais20',
  'tzaisGeonim18MinutesItimLabina',
  'tzais72',
  'tzais72Zmanis',
  'tzais72ItimLabina',
  'solarMidnight',
] as const

export type ZmanGetterName = (typeof ZMAN_GETTER_NAMES)[number]

/** Each getter computes on call, like the Kotlin properties. */
export type KosherZmanimCalendar = Record<ZmanGetterName, () => number | null>

/** A calendar for one place and date, with the chosen calculator. */
export function createKosherZmanimCalendar(options: KosherZmanimOptions): KosherZmanimCalendar {
  const calendar = buildComplexZmanimCalendar(options)
  const getters = {} as KosherZmanimCalendar
  for (const name of ZMAN_GETTER_NAMES) {
    getters[name] = () => calendar[name]?.toEpochMilliseconds() ?? null
  }
  return getters
}
