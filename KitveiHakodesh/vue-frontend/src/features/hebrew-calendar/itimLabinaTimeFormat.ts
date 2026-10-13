// A time printed the way the Itim Labina client prints it (their `roundedTime`), in the place's time zone:
// - '15sc': rounded to the nearest 15 seconds (half up), shown with seconds, e.g. 5:33:15.
// - 'plusminus': cut to the minute, prefixed '.' when 1-30 seconds were cut and ':' when more, e.g. .3:42.
// - 'candle1': like 'plusminus', except that past 52.5 seconds it is rounded up to the next minute, unprefixed.
// Hours are 1-24 ('he' with hourCycle h24), so the hour after midnight prints as 24.
import type { RoundType } from './itimLabinaLuachot'

const MINUTE_MS = 60_000

const formatters = new Map<string, Intl.DateTimeFormat>()

function clockFormat(timeZone: string, withSeconds: boolean): Intl.DateTimeFormat {
  const key = `${timeZone}|${withSeconds}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat('he', {
      hour: 'numeric',
      minute: 'numeric',
      second: withSeconds ? 'numeric' : undefined,
      hourCycle: 'h24',
      timeZone,
    })
    formatters.set(key, format)
  }
  return format
}

function clock(ms: number, timeZone: string, withSeconds: boolean): string {
  return clockFormat(timeZone, withSeconds)
    .formatToParts(ms)
    .map((part) => (part.type === 'dayPeriod' ? '' : part.value.trim()))
    .join('')
}

/** '.' for 1-30 seconds past the minute, ':' for more, nothing on the minute. */
function secondsMark(seconds: number): string {
  if (seconds === 0) return ''
  return seconds > 30 ? ':' : '.'
}

export function formatItimLabinaTime(time: Date, roundType: RoundType, timeZone: string): string {
  const ms = time.getTime()
  const intoMinute = ((ms % MINUTE_MS) + MINUTE_MS) % MINUTE_MS
  const seconds = intoMinute / 1000
  switch (roundType) {
    case '15sc':
      return clock(ms - intoMinute + Math.round(intoMinute / 15_000) * 15_000, timeZone, true)
    case 'plusminus':
      return secondsMark(seconds) + clock(ms, timeZone, false)
    case 'candle1':
      return seconds > 52.5
        ? clock(ms - intoMinute + MINUTE_MS, timeZone, false)
        : secondsMark(seconds) + clock(ms, timeZone, false)
  }
}
