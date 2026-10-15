// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// app/composeApp/src/commonMain/kotlin/app/domain/ZmanimRepository.kt (`day()`: the plan per luach, the
// grouping and sorting, and the summary picks).
import 'temporal-polyfill/global'
import { buildComplexZmanimCalendar, type KosherZmanimOptions } from './buildCalendar'
import type { ComplexZmanimCalendar } from './calendars/complexZmanimCalendar'
import type { Instant } from './instant'

/** The demo's two luach modes; each picks its calculator: Itim Labina's own, or NOAA for Ohr HaChaim. */
export type LuachMode = 'ITIM_LABINA' | 'OHR_HACHAIM'

export type DayGroup = 'night' | 'morning' | 'noon' | 'evening'

/**
 * A row of the day list. [id] is the KosherKotlin getter, except `horizonSunrise` / `horizonSunset`: the demo's
 * sunrise and sunset rows, elevation-adjusted only when `useElevation` is on.
 */
export type DemoRowId =
  | 'solarMidnight' | 'alos90ItimLabina' | 'alos72ItimLabina' | 'misheyakir11Point5Degrees' | 'horizonSunrise'
  | 'sofZmanShmaMGA72Minutes' | 'sofZmanShmaGRA' | 'sofZmanTfilaGRA' | 'chatzos' | 'minchaGedola' | 'minchaKetana'
  | 'plagHamincha' | 'candleLighting' | 'horizonSunset' | 'tzaisGeonim18MinutesItimLabina' | 'tzais72ItimLabina'
  | 'alos72Zmanis' | 'misheyakir66MinutesZmanis' | 'sofZmanShmaMGA72MinutesZmanis' | 'sofZmanTfilaMGA72MinutesZmanis'
  | 'minchaGedolaOhrHaChaim' | 'plagHaminchaYalkutYosef' | 'tzais13Point5MinutesZmanis' | 'tzais20' | 'tzais72Zmanis'

export interface DemoRow {
  id: DemoRowId
  epochMs: number
  /** Hour * 60 + minute in the place's zone: the sort key within a group. */
  minuteOfDay: number
}

export interface DemoDay {
  /** Non-empty groups in display order (night, morning, noon, evening), rows sorted by minute of day. */
  groups: { group: DayGroup, rows: DemoRow[] }[]
  /** The picks shown outside the list (pillars and labels); null where the zman does not occur. */
  summary: {
    luachAlos: number | null
    horizonSunrise: number | null
    chatzos: number | null
    horizonSunset: number | null
    luachTzais: number | null
    solarMidnight: number | null
  }
}

interface PlanRow {
  group: DayGroup
  id: DemoRowId
}

/** The order the demo lists each luach in, before null rows are dropped and each group is sorted. */
const PLANS: Record<LuachMode, readonly PlanRow[]> = {
  ITIM_LABINA: [
    { group: 'night', id: 'solarMidnight' },
    { group: 'morning', id: 'alos90ItimLabina' },
    { group: 'morning', id: 'alos72ItimLabina' },
    { group: 'morning', id: 'misheyakir11Point5Degrees' },
    { group: 'morning', id: 'horizonSunrise' },
    { group: 'morning', id: 'sofZmanShmaMGA72Minutes' },
    { group: 'morning', id: 'sofZmanShmaGRA' },
    { group: 'morning', id: 'sofZmanTfilaGRA' },
    { group: 'noon', id: 'chatzos' },
    { group: 'noon', id: 'minchaGedola' },
    { group: 'noon', id: 'minchaKetana' },
    { group: 'evening', id: 'plagHamincha' },
    { group: 'evening', id: 'candleLighting' },
    { group: 'evening', id: 'horizonSunset' },
    { group: 'evening', id: 'tzaisGeonim18MinutesItimLabina' },
    { group: 'evening', id: 'tzais72ItimLabina' },
  ],
  // The order the Ohr HaChaim luach prints, all of it zmaniyos minutes off the GRA day.
  OHR_HACHAIM: [
    { group: 'night', id: 'solarMidnight' },
    { group: 'morning', id: 'alos72Zmanis' },
    { group: 'morning', id: 'misheyakir66MinutesZmanis' },
    { group: 'morning', id: 'horizonSunrise' },
    { group: 'morning', id: 'sofZmanShmaMGA72MinutesZmanis' },
    { group: 'morning', id: 'sofZmanShmaGRA' },
    { group: 'morning', id: 'sofZmanTfilaMGA72MinutesZmanis' },
    { group: 'morning', id: 'sofZmanTfilaGRA' },
    { group: 'noon', id: 'chatzos' },
    { group: 'noon', id: 'minchaGedolaOhrHaChaim' },
    { group: 'noon', id: 'minchaKetana' },
    { group: 'evening', id: 'plagHaminchaYalkutYosef' },
    { group: 'evening', id: 'candleLighting' },
    { group: 'evening', id: 'horizonSunset' },
    { group: 'evening', id: 'tzais13Point5MinutesZmanis' },
    { group: 'evening', id: 'tzais20' },
    { group: 'evening', id: 'tzais72Zmanis' },
  ],
}

const GROUP_ORDER: readonly DayGroup[] = ['night', 'morning', 'noon', 'evening']

/** The calendar of [mode]: the caller's place, date and settings, with the mode's calculator. */
export function demoCalendar(mode: LuachMode, options: Omit<KosherZmanimOptions, 'calculator'>): ComplexZmanimCalendar {
  return buildComplexZmanimCalendar({ ...options, calculator: mode === 'ITIM_LABINA' ? 'itimLabina' : 'noaa' })
}

/** The demo's `horizonSunrise` / `horizonSunset`: the library's protected elevation-adjusted sun, mirrored. */
export function horizonSunrise(calendar: ComplexZmanimCalendar): Instant | null {
  return calendar.isUseElevation ? calendar.sunrise : calendar.seaLevelSunrise
}

export function horizonSunset(calendar: ComplexZmanimCalendar): Instant | null {
  return calendar.isUseElevation ? calendar.sunset : calendar.seaLevelSunset
}

/** Alos as the chosen luach prints it. */
export function luachAlos(mode: LuachMode, calendar: ComplexZmanimCalendar): Instant | null {
  return mode === 'ITIM_LABINA' ? calendar.alos72ItimLabina : calendar.alos72Zmanis
}

/** Tzais as the chosen luach prints it. */
export function luachTzais(mode: LuachMode, calendar: ComplexZmanimCalendar): Instant | null {
  return mode === 'ITIM_LABINA' ? calendar.tzaisGeonim18MinutesItimLabina : calendar.tzais13Point5MinutesZmanis
}

function rowMoment(id: DemoRowId, calendar: ComplexZmanimCalendar): Instant | null {
  if (id === 'horizonSunrise') return horizonSunrise(calendar)
  if (id === 'horizonSunset') return horizonSunset(calendar)
  return calendar[id]
}

function minuteOfDay(epochMs: number, timeZoneId: string): number {
  const local = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(timeZoneId)
  return local.hour * 60 + local.minute
}

/**
 * What the demo's day screen shows for [mode]. [hasCandleLighting] is the Jewish calendar's
 * `hasCandleLighting` for the date (erev Shabbos / Yom Tov), left to the caller: candle lighting is computable
 * every day but only listed when it applies.
 */
export function demoModeRows(
  mode: LuachMode,
  options: Omit<KosherZmanimOptions, 'calculator'>,
  hasCandleLighting: boolean,
): DemoDay {
  const calendar = demoCalendar(mode, options)
  const resolved: (DemoRow & { group: DayGroup })[] = []
  for (const planRow of PLANS[mode]) {
    if (planRow.id === 'candleLighting' && !hasCandleLighting) continue
    const moment = rowMoment(planRow.id, calendar)
    if (moment === null) continue
    const epochMs = moment.toEpochMilliseconds()
    resolved.push({ group: planRow.group, id: planRow.id, epochMs, minuteOfDay: minuteOfDay(epochMs, options.tzid) })
  }

  const groups = GROUP_ORDER.flatMap((group) => {
    const rows = resolved
      .filter(row => row.group === group)
      .map(({ id, epochMs, minuteOfDay }) => ({ id, epochMs, minuteOfDay }))
      .sort((a, b) => a.minuteOfDay - b.minuteOfDay)
    return rows.length === 0 ? [] : [{ group, rows }]
  })

  const epochMsOf = (moment: Instant | null) => moment?.toEpochMilliseconds() ?? null
  return {
    groups,
    summary: {
      luachAlos: epochMsOf(luachAlos(mode, calendar)),
      horizonSunrise: epochMsOf(horizonSunrise(calendar)),
      chatzos: epochMsOf(calendar.chatzos),
      horizonSunset: epochMsOf(horizonSunset(calendar)),
      luachTzais: epochMsOf(luachTzais(mode, calendar)),
      solarMidnight: epochMsOf(calendar.solarMidnight),
    },
  }
}
