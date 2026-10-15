// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/SolarPosition.kt
// (`epochMillis(julianDay)` is left out: nothing calls it.)
import * as SpaTables from './spaTables'
import type { Term } from './spaTables'

/** Julian day (UT) of a Unix epoch millisecond. */
export function julianDayOfEpochMillis(epochMillis: number): number {
  return epochMillis / 86_400_000.0 + 2_440_587.5
}

/**
 * Geocentric apparent position of the sun, after the NREL Solar Position Algorithm (Reda & Andreas, 2004):
 * VSOP87 Earth terms, IAU 1980 nutation and aberration. Altitudes are geocentric: no parallax, no refraction.
 */
export class Sun {
  constructor(
    /** Degrees. */
    readonly rightAscension: number,
    /** Degrees. */
    readonly declination: number,
    /** Apparent Greenwich sidereal time, degrees. */
    readonly siderealTime: number,
    /** Earth-sun distance, AU. */
    readonly radius: number,
  ) {}

  /** Apparent solar semidiameter, degrees. */
  get semidiameter(): number {
    return 959.63 / 3600 / this.radius
  }

  hourAngle(longitude: number): number {
    return normalize180(this.siderealTime + longitude - this.rightAscension)
  }

  altitude(latitude: number, longitude: number): number {
    const phi = rad(latitude)
    const delta = rad(this.declination)
    return deg(Math.asin(Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(rad(this.hourAngle(longitude)))))
  }
}

export function sunAt(julianDay: number): Sun {
  const jde = julianDay + deltaT(julianDay) / 86_400
  const jc = (julianDay - 2_451_545) / 36_525
  const jce = (jde - 2_451_545) / 36_525
  const jme = jce / 10

  const l = deg(series(jme, [SpaTables.L0, SpaTables.L1, SpaTables.L2, SpaTables.L3, SpaTables.L4, SpaTables.L5]))
  const b = deg(series(jme, [SpaTables.B0, SpaTables.B1]))
  const r = series(jme, [SpaTables.R0, SpaTables.R1, SpaTables.R2, SpaTables.R3, SpaTables.R4])
  const theta = normalize360(l + 180)
  const beta = -b

  const x = [
    297.85036 + 445_267.111480 * jce - 0.0019142 * jce * jce + jce * jce * jce / 189_474,
    357.52772 + 35_999.050340 * jce - 0.0001603 * jce * jce - jce * jce * jce / 300_000,
    134.96298 + 477_198.867398 * jce + 0.0086972 * jce * jce + jce * jce * jce / 56_250,
    93.27191 + 483_202.017538 * jce - 0.0036825 * jce * jce + jce * jce * jce / 327_270,
    125.04452 - 1_934.136261 * jce + 0.0020708 * jce * jce + jce * jce * jce / 450_000,
  ] as const
  let dPsi = 0.0
  let dEps = 0.0
  SpaTables.NUTATION_Y.forEach((y, i) => {
    const abcd = SpaTables.NUTATION_ABCD[i]!
    const arg = rad(y[0] * x[0] + y[1] * x[1] + y[2] * x[2] + y[3] * x[3] + y[4] * x[4])
    dPsi += (abcd[0] + abcd[1] * jce) * Math.sin(arg)
    dEps += (abcd[2] + abcd[3] * jce) * Math.cos(arg)
  })
  dPsi /= 36_000_000
  dEps /= 36_000_000

  const u = jme / 10
  const eps0 = 84_381.448 + u * (-4_680.93 + u * (-1.55 + u * (1_999.25 + u * (-51.38 + u * (-249.67 +
    u * (-39.05 + u * (7.12 + u * (27.87 + u * (5.79 + u * 2.45)))))))))
  const eps = eps0 / 3600 + dEps
  const lambda = theta + dPsi - 20.4898 / (3600 * r)

  const nu0 = normalize360(
    280.46061837 + 360.98564736629 * (julianDay - 2_451_545) + 0.000387933 * jc * jc - jc * jc * jc / 38_710_000,
  )
  const nu = nu0 + dPsi * Math.cos(rad(eps))

  const alpha = normalize360(
    deg(Math.atan2(Math.sin(rad(lambda)) * Math.cos(rad(eps)) - Math.tan(rad(beta)) * Math.sin(rad(eps)), Math.cos(rad(lambda)))),
  )
  const delta = deg(Math.asin(Math.sin(rad(beta)) * Math.cos(rad(eps)) + Math.cos(rad(beta)) * Math.sin(rad(eps)) * Math.sin(rad(lambda))))
  return new Sun(alpha, delta, nu, r)
}

/** Sum of T_i * tau^i where T_i = sum of A*cos(B + C*tau), scaled by 1e-8. */
function series(tau: number, tables: readonly (readonly Term[])[]): number {
  let sum = 0.0
  let power = 1.0
  for (const table of tables) {
    let term = 0.0
    for (const row of table) term += row[0] * Math.cos(row[1] + row[2] * tau)
    sum += term * power
    power *= tau
  }
  return sum / 1e8
}

/** TT - UT in seconds, Espenak & Meeus polynomial for 2005-2050. */
function deltaT(julianDay: number): number {
  const t = (julianDay - 2_451_544.5) / 365.25
  return 62.92 + 0.32217 * t + 0.005589 * t * t
}

function normalize360(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function normalize180(degrees: number): number {
  return normalize360(degrees + 180) - 180
}

function rad(degrees: number): number {
  return degrees * Math.PI / 180
}

function deg(radians: number): number {
  return radians * 180 / Math.PI
}
