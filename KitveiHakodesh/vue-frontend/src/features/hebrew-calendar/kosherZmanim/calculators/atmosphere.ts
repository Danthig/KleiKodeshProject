// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// zmanim/src/commonMain/kotlin/io/github/kdroidfilter/kosherkotlin/util/Atmosphere.kt
// (`pressure(heightM)` is left out: nothing calls it.)
import { indexOfLast } from '../indexOfLast'
import { doubleToInt } from '../kotlinNumbers'

const TOP_M = 70_000.0
const EARTH_RADIUS = 6_371_000.0
const HYDROSTATIC = 34.16

/** (n - 1)*T/P for visible light (lambda = 0.6 um): (77.46 + 0.459/lambda^2)*1e-6. */
const REFRACTIVITY = (77.46 + 0.459 / 0.36) * 1e-6

export interface AtmosphereLayer {
  readonly bottomKm: number
  /** K, at the bottom of the layer. */
  readonly temperature: number
  /** mbar, at the bottom of the layer. */
  readonly pressure: number
  /** K/km. */
  readonly lapse: number
  /** P = P0 * (T / T0)^exponent. */
  readonly exponent: number
}

/**
 * A layered model atmosphere: in each layer the temperature is linear in height and the pressure a power of the
 * temperature. Traces the horizontal ray that reaches an observer to get the astronomical refraction at the horizon.
 */
export class Atmosphere {
  private readonly refractionCache = new Map<number, number>()

  constructor(private readonly layers: readonly AtmosphereLayer[]) {}

  /** Temperature (K) at [heightM] meters. */
  temperature(heightM: number): number {
    return this.at(heightM).temperature
  }

  /**
   * Refraction (degrees) of the ray reaching an observer at [observerM] meters horizontally, traced up to 70 km;
   * the height is floored to 100 m and each height traced once.
   */
  refraction(observerM: number): number {
    const floored = doubleToInt(Math.floor(observerM / 100) * 100)
    let refraction = this.refractionCache.get(floored)
    if (refraction === undefined) {
      refraction = this.trace(floored)
      this.refractionCache.set(floored, refraction)
    }
    return refraction
  }

  private at(heightM: number): { temperature: number, pressure: number } {
    const km = heightM / 1000
    const i = Math.max(indexOfLast(this.layers, layer => layer.bottomKm <= km), 0)
    const layer = this.layers[i]!
    const t = layer.temperature + layer.lapse * (km - layer.bottomKm)
    const p = layer.lapse !== 0.0
      ? layer.pressure * Math.pow(t / layer.temperature, layer.exponent)
      : layer.pressure * Math.exp(-(km - layer.bottomKm) * HYDROSTATIC / layer.temperature)
    return { temperature: t, pressure: p }
  }

  /** Integral of -(dn/dh)/n * tan z dh with n*r*sin z constant, over u = sqrt(h - h0) to tame the start of the ray. */
  private trace(h0: number): number {
    const du = 0.02
    const count = doubleToInt(Math.sqrt(TOP_M - h0) / du)
    const n0 = this.index(h0)
    const r0 = EARTH_RADIUS + h0
    let sum = 0.0
    let previous = Number.NaN
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) * du
      const h = h0 + u * u
      const n = this.index(h)
      const dndh = (this.index(h + 0.5) - this.index(h - 0.5))
      const s = n0 * r0 / (n * (EARTH_RADIUS + h))
      const tanZ = s / Math.sqrt(Math.max(1 - s * s, 1e-30))
      const integrand = -dndh / n * tanZ * 2 * u
      if (!Number.isNaN(previous)) sum += (previous + integrand) / 2 * du
      previous = integrand
    }
    return sum * 180 / Math.PI
  }

  private index(heightM: number): number {
    const { temperature, pressure } = this.at(heightM)
    return 1 + REFRACTIVITY * pressure / temperature
  }
}
