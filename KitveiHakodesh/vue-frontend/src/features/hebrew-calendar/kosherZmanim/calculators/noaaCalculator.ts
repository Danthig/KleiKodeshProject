// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/NOAACalculator.kt
// The solar elevation / azimuth helpers are left out: no zman calls them.
import type { GeoLocation } from '../location/geoLocation'
import { AstronomicalCalculator, toDegrees, toRadians } from './astronomicalCalculator'
import { getJulianDay } from './julianDay'

const JULIAN_DAY_JAN_1_2000 = 2451545.0
const JULIAN_DAYS_PER_CENTURY = 36525.0

/** The US National Oceanic and Atmospheric Administration algorithm, after Jean Meeus. */
export class NOAACalculator extends AstronomicalCalculator {
  copy(): AstronomicalCalculator {
    return new NOAACalculator()
  }

  getUTCSunrise(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number {
    const elevation = adjustForElevation ? geoLocation.elevation : 0.0
    const adjustedZenith = this.adjustZenith(zenith, elevation)
    let sunrise = getSunriseUTC(getJulianDay(date), geoLocation.latitude, -geoLocation.longitude, adjustedZenith)
    sunrise /= 60
    while (sunrise < 0.0) sunrise += 24.0
    while (sunrise >= 24.0) sunrise -= 24.0
    return sunrise
  }

  getUTCSunset(date: Temporal.PlainDate, geoLocation: GeoLocation, zenith: number, adjustForElevation: boolean): number {
    const elevation = adjustForElevation ? geoLocation.elevation : 0.0
    const adjustedZenith = this.adjustZenith(zenith, elevation)
    let sunset = getSunsetUTC(getJulianDay(date), geoLocation.latitude, -geoLocation.longitude, adjustedZenith)
    sunset /= 60
    while (sunset < 0.0) sunset += 24.0
    while (sunset >= 24.0) sunset -= 24.0
    return sunset
  }

  getUTCNoon(date: Temporal.PlainDate, geoLocation: GeoLocation): number {
    const julianDay = getJulianDay(date)
    const julianCenturies = getJulianCenturiesFromJulianDay(julianDay)
    let noon = getSolarNoonUTC(julianCenturies, -geoLocation.longitude)
    noon /= 60
    while (noon < 0.0) noon += 24.0
    while (noon >= 24.0) noon -= 24.0
    return noon
  }
}

function getJulianCenturiesFromJulianDay(julianDay: number): number {
  return (julianDay - JULIAN_DAY_JAN_1_2000) / JULIAN_DAYS_PER_CENTURY
}

function getJulianDayFromJulianCenturies(julianCenturies: number): number {
  return julianCenturies * JULIAN_DAYS_PER_CENTURY + JULIAN_DAY_JAN_1_2000
}

/** Degrees. */
function getSunGeometricMeanLongitude(julianCenturies: number): number {
  let longitude = 280.46646 + julianCenturies * (36000.76983 + 0.0003032 * julianCenturies)
  while (longitude > 360.0) longitude -= 360.0
  while (longitude < 0.0) longitude += 360.0
  return longitude
}

/** Degrees. */
function getSunGeometricMeanAnomaly(julianCenturies: number): number {
  return 357.52911 + julianCenturies * (35999.05029 - 0.0001537 * julianCenturies)
}

/** Unitless. */
function getEarthOrbitEccentricity(julianCenturies: number): number {
  return 0.016708634 - julianCenturies * (0.000042037 + 0.0000001267 * julianCenturies)
}

/** Degrees. */
function getSunEquationOfCenter(julianCenturies: number): number {
  const m = getSunGeometricMeanAnomaly(julianCenturies)
  const mrad = toRadians(m)
  const sinm = Math.sin(mrad)
  const sin2m = Math.sin(mrad + mrad)
  const sin3m = Math.sin(mrad + mrad + mrad)
  return (sinm * (1.914602 - julianCenturies * (0.004817 + 0.000014 * julianCenturies))) + ((sin2m
    * (0.019993 - 0.000101 * julianCenturies))) + (sin3m * 0.000289)
}

/** Degrees. */
function getSunTrueLongitude(julianCenturies: number): number {
  const sunLongitude = getSunGeometricMeanLongitude(julianCenturies)
  const center = getSunEquationOfCenter(julianCenturies)
  return sunLongitude + center
}

/** Degrees. */
function getSunApparentLongitude(julianCenturies: number): number {
  const sunTrueLongitude = getSunTrueLongitude(julianCenturies)
  const omega = 125.04 - 1934.136 * julianCenturies
  return sunTrueLongitude - 0.00569 - (0.00478 * Math.sin(toRadians(omega)))
}

/** Degrees. */
function getMeanObliquityOfEcliptic(julianCenturies: number): number {
  const seconds = 21.448 - julianCenturies * (46.8150 + julianCenturies * (0.00059 - julianCenturies * (0.001813)))
  return 23.0 + (26.0 + (seconds / 60.0)) / 60.0
}

/** Degrees. */
function getObliquityCorrection(julianCenturies: number): number {
  const obliquityOfEcliptic = getMeanObliquityOfEcliptic(julianCenturies)
  const omega = 125.04 - 1934.136 * julianCenturies
  return obliquityOfEcliptic + 0.00256 * Math.cos(toRadians(omega))
}

/** Degrees. */
function getSunDeclination(julianCenturies: number): number {
  const obliquityCorrection = getObliquityCorrection(julianCenturies)
  const lambda = getSunApparentLongitude(julianCenturies)
  const sint = Math.sin(toRadians(obliquityCorrection)) * Math.sin(toRadians(lambda))
  return toDegrees(Math.asin(sint))
}

/** Minutes of time. */
function getEquationOfTime(julianCenturies: number): number {
  const epsilon = getObliquityCorrection(julianCenturies)
  const geomMeanLongSun = getSunGeometricMeanLongitude(julianCenturies)
  const eccentricityEarthOrbit = getEarthOrbitEccentricity(julianCenturies)
  const geomMeanAnomalySun = getSunGeometricMeanAnomaly(julianCenturies)
  let y = Math.tan(toRadians(epsilon) / 2.0)
  y *= y
  const sin2l0 = Math.sin(2.0 * toRadians(geomMeanLongSun))
  const sinm = Math.sin(toRadians(geomMeanAnomalySun))
  const cos2l0 = Math.cos(2.0 * toRadians(geomMeanLongSun))
  const sin4l0 = Math.sin(4.0 * toRadians(geomMeanLongSun))
  const sin2m = Math.sin(2.0 * toRadians(geomMeanAnomalySun))
  const equationOfTime = (y * sin2l0 - 2.0 * eccentricityEarthOrbit * sinm + (4.0 * eccentricityEarthOrbit * y
    * sinm * cos2l0)) - (0.5 * y * y * sin4l0) - (1.25 * eccentricityEarthOrbit * eccentricityEarthOrbit * sin2m)
  return toDegrees(equationOfTime) * 4.0
}

/** Radians. */
function getSunHourAngleAtSunrise(lat: number, solarDec: number, zenith: number): number {
  const latRad = toRadians(lat)
  const sdRad = toRadians(solarDec)
  return Math.acos(
    Math.cos(toRadians(zenith)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad)
      * Math.tan(sdRad),
  )
}

/** Radians. */
function getSunHourAngleAtSunset(lat: number, solarDec: number, zenith: number): number {
  const latRad = toRadians(lat)
  const sdRad = toRadians(solarDec)
  const hourAngle = Math.acos(
    Math.cos(toRadians(zenith)) / (Math.cos(latRad) * Math.cos(sdRad))
      - Math.tan(latRad) * Math.tan(sdRad),
  )
  return -hourAngle
}

/** Minutes after 0:00 UTC of [julianDay]; [longitude] is west positive. */
function getSunriseUTC(julianDay: number, latitude: number, longitude: number, zenith: number): number {
  const julianCenturies = getJulianCenturiesFromJulianDay(julianDay)

  // Find the time of solar noon at the location, and use that declination.
  const noonmin = getSolarNoonUTC(julianCenturies, longitude)
  const tnoon = getJulianCenturiesFromJulianDay(julianDay + noonmin / 1440.0)

  // First pass to approximate sunrise (using solar noon)
  let eqTime = getEquationOfTime(tnoon)
  let solarDec = getSunDeclination(tnoon)
  let hourAngle = getSunHourAngleAtSunrise(latitude, solarDec, zenith)
  let delta = longitude - toDegrees(hourAngle)
  let timeDiff = 4 * delta
  let timeUTC = 720 + timeDiff - eqTime

  // Second pass includes fractional Julian Day in gamma calc
  const newt = getJulianCenturiesFromJulianDay(getJulianDayFromJulianCenturies(julianCenturies) + timeUTC / 1440.0)
  eqTime = getEquationOfTime(newt)
  solarDec = getSunDeclination(newt)
  hourAngle = getSunHourAngleAtSunrise(latitude, solarDec, zenith)
  delta = longitude - toDegrees(hourAngle)
  timeDiff = 4 * delta
  timeUTC = 720 + timeDiff - eqTime
  return timeUTC
}

/** Minutes after 0:00 UTC; [longitude] is west positive. */
function getSolarNoonUTC(julianCenturies: number, longitude: number): number {
  // First pass uses approximate solar noon to calculate equation of time
  const tnoon = getJulianCenturiesFromJulianDay(getJulianDayFromJulianCenturies(julianCenturies) + longitude / 360.0)
  let eqTime = getEquationOfTime(tnoon)
  const solNoonUTC = 720 + (longitude * 4) - eqTime
  const newt = getJulianCenturiesFromJulianDay(
    (getJulianDayFromJulianCenturies(julianCenturies) - 0.5 + solNoonUTC / 1440.0),
  )
  eqTime = getEquationOfTime(newt)
  return 720 + (longitude * 4) - eqTime
}

/** Minutes after 0:00 UTC of [julianDay]; [longitude] is west positive. */
function getSunsetUTC(julianDay: number, latitude: number, longitude: number, zenith: number): number {
  const julianCenturies = getJulianCenturiesFromJulianDay(julianDay)

  // Find the time of solar noon at the location, and use that declination.
  const noonmin = getSolarNoonUTC(julianCenturies, longitude)
  const tnoon = getJulianCenturiesFromJulianDay(julianDay + noonmin / 1440.0)

  // First calculates sunrise and approx length of day
  let eqTime = getEquationOfTime(tnoon)
  let solarDec = getSunDeclination(tnoon)
  let hourAngle = getSunHourAngleAtSunset(latitude, solarDec, zenith)
  let delta = longitude - toDegrees(hourAngle)
  let timeDiff = 4 * delta
  let timeUTC = 720 + timeDiff - eqTime

  // Second pass includes fractional Julian Day in gamma calc
  const newt = getJulianCenturiesFromJulianDay(getJulianDayFromJulianCenturies(julianCenturies) + timeUTC / 1440.0)
  eqTime = getEquationOfTime(newt)
  solarDec = getSunDeclination(newt)
  hourAngle = getSunHourAngleAtSunset(latitude, solarDec, zenith)
  delta = longitude - toDegrees(hourAngle)
  timeDiff = 4 * delta
  timeUTC = 720 + timeDiff - eqTime
  return timeUTC
}
