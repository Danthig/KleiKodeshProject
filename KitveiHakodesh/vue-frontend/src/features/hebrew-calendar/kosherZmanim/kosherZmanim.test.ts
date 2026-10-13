// Compares the port with values produced by the real KosherKotlin library (commit 582e904) on the JVM.
// Point KK_REFERENCE at the reference JSON: an array of
// { city, lat, lng, elevation, tzid, date, mode, useElevation, hasCandleLighting, values, nanosOfMilli }.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ComplexZmanimCalendar } from './calendars/complexZmanimCalendar'
import { demoCalendar, demoModeRows, horizonSunrise, horizonSunset, luachAlos, luachTzais, type LuachMode } from './demoModeRows'
import type { Instant } from './instant'

interface ReferenceRecord {
  city: string
  lat: number
  lng: number
  elevation: number
  tzid: string
  date: string
  mode: LuachMode
  useElevation: boolean
  hasCandleLighting: boolean
  /** Kotlin `toEpochMilliseconds()`, floored. */
  values: Record<string, number | null>
  /** The sub-millisecond nanoseconds the Kotlin instant carries. */
  nanosOfMilli: Record<string, number>
}

/** The demo's summary keys of the reference, resolved the way ZmanimRepository picks them. */
function momentOf(key: string, mode: LuachMode, calendar: ComplexZmanimCalendar): Instant | null {
  switch (key) {
    case 'luachAlos': return luachAlos(mode, calendar)
    case 'luachTzais': return luachTzais(mode, calendar)
    case 'luachTzaisRabeinuTam': return mode === 'ITIM_LABINA' ? calendar.tzais72ItimLabina : calendar.tzais72Zmanis
    case 'horizonSunrise': return horizonSunrise(calendar)
    case 'horizonSunset': return horizonSunset(calendar)
    default:
      if (!(key in calendar)) throw new Error(`No getter for reference key '${key}'`)
      return (calendar as unknown as Record<string, Instant | null>)[key]!
  }
}

function optionsOf(record: ReferenceRecord) {
  const [year, month, day] = record.date.split('-').map(Number) as [number, number, number]
  return {
    lat: record.lat,
    lng: record.lng,
    elevation: record.elevation,
    tzid: record.tzid,
    date: { year, month, day },
    useElevation: record.useElevation,
    candleLightingOffset: 18,
  }
}

interface GetterStats {
  compared: number
  exactNanoseconds: number
  sameMillisecond: number
  maxAbsDiffNanoseconds: bigint
  examples: string[]
}

const referencePath = process.env.KK_REFERENCE

describe('KosherKotlin port against the JVM reference', () => {
  if (!referencePath) {
    it.skip('set KK_REFERENCE to the reference JSON path to run this comparison', () => {})
    return
  }

  const records = JSON.parse(readFileSync(referencePath, 'utf8')) as ReferenceRecord[]

  it(`matches all ${records.length} records`, () => {
    const stats = new Map<string, GetterStats>()
    const nullMismatches: string[] = []
    const demoMismatches: string[] = []

    for (const record of records) {
      const options = optionsOf(record)
      const calendar = demoCalendar(record.mode, options)
      const label = `${record.city} ${record.date} ${record.mode} elev=${record.useElevation}`

      for (const [key, expectedMs] of Object.entries(record.values)) {
        const actual = momentOf(key, record.mode, calendar)
        if (expectedMs === null || actual === null) {
          if (expectedMs !== null || actual !== null) nullMismatches.push(`${label} ${key}: expected ${expectedMs}, got ${actual?.toEpochMilliseconds() ?? null}`)
          continue
        }
        const expectedNs = BigInt(expectedMs) * 1_000_000n + BigInt(record.nanosOfMilli[key] ?? 0)
        const diff = actual.epochNanoseconds - expectedNs
        const absDiff = diff < 0n ? -diff : diff
        const entry = stats.get(key) ?? { compared: 0, exactNanoseconds: 0, sameMillisecond: 0, maxAbsDiffNanoseconds: 0n, examples: [] }
        entry.compared++
        if (diff === 0n) entry.exactNanoseconds++
        if (actual.toEpochMilliseconds() === expectedMs) entry.sameMillisecond++
        else if (entry.examples.length < 3) entry.examples.push(`${label}: expected ${expectedNs}ns, got ${actual.epochNanoseconds}ns`)
        if (absDiff > entry.maxAbsDiffNanoseconds) entry.maxAbsDiffNanoseconds = absDiff
        stats.set(key, entry)
      }

      // The demo listing must carry the same moments as the reference picks.
      const demo = demoModeRows(record.mode, options, record.hasCandleLighting)
      const summaryKeys = ['luachAlos', 'horizonSunrise', 'chatzos', 'horizonSunset', 'luachTzais', 'solarMidnight'] as const
      for (const key of summaryKeys) {
        if (demo.summary[key] !== record.values[key]) demoMismatches.push(`${label} summary ${key}`)
      }
      for (const { rows } of demo.groups) {
        for (const row of rows) {
          if (row.epochMs !== momentOf(row.id, record.mode, calendar)?.toEpochMilliseconds()) demoMismatches.push(`${label} row ${row.id}`)
        }
      }
    }

    const lines = [...stats].map(([key, s]) =>
      `${key.padEnd(32)} n=${s.compared} exactNs=${s.exactNanoseconds} sameMs=${s.sameMillisecond} maxAbsDiffNs=${s.maxAbsDiffNanoseconds}` +
      (s.examples.length > 0 ? `\n    ${s.examples.join('\n    ')}` : ''))
    console.log(lines.join('\n'))

    expect(nullMismatches).toEqual([])
    expect(demoMismatches).toEqual([])
    // Exact to the nanosecond the Kotlin instant carries, not only to the floored millisecond.
    const inexactGetters = [...stats].filter(([, s]) => s.exactNanoseconds !== s.compared).map(([key]) => key)
    expect(inexactGetters).toEqual([])
  }, 600_000)
})
