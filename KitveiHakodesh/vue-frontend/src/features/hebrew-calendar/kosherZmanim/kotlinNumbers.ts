// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904.
// Not a file of its own there: the JVM number conversions the ported code relies on, spelled out once.

/** `Long.MIN_VALUE` (-2^63), the "no value" marker of `getTemporalHour` / `getTimeOffset`. Exact as a double. */
export const LONG_MIN_VALUE = -9223372036854775808

/** `Long.MAX_VALUE` rounded to the nearest double (2^63); only ever a saturation bound. */
const LONG_MAX_VALUE = 9223372036854775807

const INT_MIN_VALUE = -2147483648
const INT_MAX_VALUE = 2147483647

/** Kotlin `Double.toLong()`: truncates toward zero, NaN is 0, out-of-range values saturate. */
export function doubleToLong(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value <= LONG_MIN_VALUE) return LONG_MIN_VALUE
  if (value >= LONG_MAX_VALUE) return LONG_MAX_VALUE
  return Math.trunc(value)
}

/** Kotlin `Double.toInt()`: truncates toward zero, NaN is 0, out-of-range values saturate. */
export function doubleToInt(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value <= INT_MIN_VALUE) return INT_MIN_VALUE
  if (value >= INT_MAX_VALUE) return INT_MAX_VALUE
  return Math.trunc(value)
}

/** Kotlin `Long / Long` and `Int / Int`: integer division truncating toward zero. */
export function integerDivide(dividend: number, divisor: number): number {
  return Math.trunc(dividend / divisor)
}
