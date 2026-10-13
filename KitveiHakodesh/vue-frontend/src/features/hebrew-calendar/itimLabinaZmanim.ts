import { buildComplexZmanimCalendar } from './kosherZmanim/buildCalendar'
import { GEOMETRIC_ZENITH } from './kosherZmanim/calendars/astronomicalCalendar'
import type { ComplexZmanimCalendar } from './kosherZmanim/calendars/complexZmanimCalendar'
import type { Instant } from './kosherZmanim/instant'
import type { CalendarZmanim, City } from './calendarTypes'
import { CITY_CLIMATES } from './cityClimates'
import { luachRowsOf, ZMANIM, type ZmanId } from './itimLabinaLuachot'
import { formatItimLabinaTime } from './itimLabinaTimeFormat'

/** One row of the day: the instant, and how the Itim Labina luach prints it. */
export interface ItimLabinaZman {
  time: Date
  printed: string
}

/** The app's zmanim rows as the city's Itim Labina luach prints them; null where the sun never gets there. */
export type DayZmanim = Record<keyof CalendarZmanim, ItimLabinaZman | null>

function calendarOn(city: City, date: Date): ComplexZmanimCalendar {
  return buildComplexZmanimCalendar({
    lat: city.lat,
    lng: city.lng,
    elevation: city.elevation,
    tzid: city.tzid,
    date: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
    calculator: 'itimLabina',
    useElevation: false,
    climate: CITY_CLIMATES[city.key],
  })
}

function epochMs(instant: Instant | null): number | null {
  return instant === null ? null : instant.toEpochMilliseconds()
}

/** Computes Itim Labina zmanim by id for one city and date, each at most once. */
class ZmanEvaluator {
  private readonly today: ComplexZmanimCalendar
  private readonly yesterday: ComplexZmanimCalendar
  private readonly computed = new Map<ZmanId, number | null>()

  constructor(city: City, date: Date) {
    this.today = calendarOn(city, date)
    this.yesterday = calendarOn(city, new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))
  }

  /** Epoch milliseconds of the zman, null where the sun never gets there. */
  timeOf(id: ZmanId): number | null {
    if (!this.computed.has(id)) this.computed.set(id, this.compute(id))
    return this.computed.get(id)!
  }

  private compute(id: ZmanId): number | null {
    const rule = ZMANIM[id]!.rule
    const day = this.today
    switch (rule.kind) {
      case 'belowHorizon':
        return epochMs(rule.morning
          ? day.getSunriseOffsetByDegreesBelowHorizon(rule.degrees)
          : day.getSunsetOffsetByDegreesBelowHorizon(rule.degrees))
      case 'geometric':
        return epochMs(rule.morning
          ? day.getSunriseOffsetByDegrees(GEOMETRIC_ZENITH + rule.degrees)
          : day.getSunsetOffsetByDegrees(GEOMETRIC_ZENITH + rule.degrees))
      case 'sunsetFromHeight':
        return epochMs(day.sunset)
      case 'transit':
        return epochMs(day.chatzos)
      case 'midnight':
        // KosherKotlin's solarMidnight is the one AFTER its date; the night that opens the day is yesterday's.
        return epochMs(this.yesterday.solarMidnight)
      case 'zmanit': {
        const start = this.timeOf(rule.start)
        const end = this.timeOf(rule.end)
        return start === null || end === null ? null : start + (end - start) * rule.hours / 12
      }
      case 'latest': {
        const times = rule.of.map((zman) => this.timeOf(zman))
        return times.includes(null) ? null : Math.max(...(times as number[]))
      }
      case 'minutesAfter': {
        const base = this.timeOf(rule.of)
        return base === null ? null : base + rule.minutes * 60_000
      }
    }
  }
}

/** A day costs tens of ms (Itim Labina bisects the sun's position), so recent days are kept. */
const DAY_CACHE_SIZE = 64
const dayCache = new Map<string, DayZmanim>()

export function itimLabinaDayZmanim(city: City, date: Date): DayZmanim {
  const cacheKey = `${city.key}|${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const cached = dayCache.get(cacheKey)
  if (cached) return cached
  const day = computeDayZmanim(city, date)
  if (dayCache.size >= DAY_CACHE_SIZE) dayCache.delete(dayCache.keys().next().value!)
  dayCache.set(cacheKey, day)
  return day
}

function computeDayZmanim(city: City, date: Date): DayZmanim {
  const evaluator = new ZmanEvaluator(city, date)
  const rows = luachRowsOf(city.key)
  const day = {} as DayZmanim
  for (const row of Object.keys(rows) as Array<keyof CalendarZmanim>) {
    const id = rows[row]
    const ms = evaluator.timeOf(id)
    const time = ms === null ? null : new Date(ms)
    day[row] = time && { time, printed: formatItimLabinaTime(time, ZMANIM[id]!.roundType, city.tzid) }
  }
  return day
}
