// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904.
// Stands in for `kotlin.time.Instant` as the calendars use it.

const NANOSECONDS_PER_MILLISECOND = 1_000_000n

/**
 * A moment with nanosecond precision, like `kotlin.time.Instant`. The precision matters: `getDateFromTime` builds
 * instants with sub-millisecond nanoseconds, and solar midnight halves the nanosecond distance between two of them
 * before anything is cut to milliseconds. Reading out ([toEpochMilliseconds]) floors, as Kotlin does.
 */
export class Instant {
  private constructor(readonly epochNanoseconds: bigint) {}

  static fromEpochMilliseconds(epochMilliseconds: number): Instant {
    return new Instant(BigInt(epochMilliseconds) * NANOSECONDS_PER_MILLISECOND)
  }

  /** `this + nanoseconds.nanoseconds`. */
  plusNanoseconds(nanoseconds: bigint): Instant {
    return new Instant(this.epochNanoseconds + nanoseconds)
  }

  /** `this + milliseconds.milliseconds`; [milliseconds] is a Kotlin `Long`, so a whole number. */
  plusMilliseconds(milliseconds: number): Instant {
    return this.plusNanoseconds(BigInt(milliseconds) * NANOSECONDS_PER_MILLISECOND)
  }

  /** `this - other` as a nanosecond `Duration`. */
  nanosecondsSince(other: Instant): bigint {
    return this.epochNanoseconds - other.epochNanoseconds
  }

  /** Kotlin `Instant.toEpochMilliseconds()`: floors toward the past. */
  toEpochMilliseconds(): number {
    const truncated = this.epochNanoseconds / NANOSECONDS_PER_MILLISECOND
    const flooredDown = this.epochNanoseconds < 0n && truncated * NANOSECONDS_PER_MILLISECOND !== this.epochNanoseconds
    return Number(flooredDown ? truncated - 1n : truncated)
  }
}
