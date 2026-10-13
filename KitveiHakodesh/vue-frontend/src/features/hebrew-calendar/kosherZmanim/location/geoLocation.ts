// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/GeoLocation.kt
// Only what the calculators and calendars read: the geodesic / rhumb-line half of the class is never called by them.
import { doubleToLong } from '../kotlinNumbers'
import { rawOffsetMilliseconds } from './timeZoneRawOffsets'

const MINUTE_MILLIS = 60 * 1000
const HOUR_MILLIS = MINUTE_MILLIS * 60

/**
 * A place: latitude and longitude in degrees (east positive), elevation in meters and an IANA time zone id.
 * KosherKotlin's latitude/longitude setters validate the previous value rather than the new one, so they never
 * reject anything at construction; no validation is ported.
 */
export class GeoLocation {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
    readonly elevation: number,
    readonly timeZoneId: string,
  ) {}

  /** Local mean time minus the zone's standard time, in milliseconds (a Kotlin `Long`). */
  get localMeanTimeOffset(): number {
    return doubleToLong(this.longitude * 4 * MINUTE_MILLIS - rawOffsetMilliseconds(this.timeZoneId))
  }

  /** Days to roll the date by for a zone across the antimeridian (Samoa): 1, -1, or 0 nearly everywhere. */
  get antimeridianAdjustment(): number {
    const localHoursOffset = this.localMeanTimeOffset / HOUR_MILLIS
    if (localHoursOffset >= 20) return 1
    if (localHoursOffset <= -20) return -1
    return 0
  }
}
