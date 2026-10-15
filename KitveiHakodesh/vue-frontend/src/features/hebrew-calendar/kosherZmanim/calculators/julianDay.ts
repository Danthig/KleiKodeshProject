// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/DateUtils.kt (`getJulianDay`)
import { integerDivide } from '../kotlinNumbers'

/** The Julian day number at the start (0:00 UT) of [date]. */
export function getJulianDay(date: Temporal.PlainDate): number {
  let year = date.year
  let month = date.month
  const day = date.day
  if (month <= 2) {
    year -= 1
    month += 12
  }
  const a = integerDivide(year, 100)
  const b = 2 - a + integerDivide(a, 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5
}
