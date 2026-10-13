// Monthly climate of each city, January first, for the Itim Labina refraction (ItimLabinaClimate): the nearest
// cell of WorldClim 2.1 at 2.5 arc minutes (Fick & Hijmans 2017, https://worldclim.org, CC BY 4.0), sampled at the
// city's coordinates. Minimum and maximum are the monthly tmin and tmax, mean is their midpoint; all rounded to whole
// degrees C (the luach's own implied temperatures come out whole). The elevation is the cell's (WorldClim elev), the
// height the temperatures belong to. Regenerate by sampling the tmin/tmax/elev GeoTIFFs at the CITIES coordinates.
import { ItimLabinaClimate } from './kosherZmanim/calculators/horizonRefraction'
import type { CityKey } from './calendarTypes'

// Each city: minimum, maximum and mean by month (C), then the elevation they were measured at (m).

export const CITY_CLIMATES: Record<CityKey, ItimLabinaClimate> = {
  jerusalem: new ItimLabinaClimate(
    [  5,  5,  7, 10, 14, 16, 18, 18, 17, 15, 10,  6],
    [ 11, 13, 15, 21, 25, 27, 29, 29, 27, 24, 18, 13],
    [  8,  9, 11, 16, 19, 22, 23, 23, 22, 20, 14, 10],
    743,
  ),
  telAviv: new ItimLabinaClimate(
    [  9,  9, 11, 14, 16, 20, 22, 23, 22, 18, 14, 11],
    [ 18, 18, 20, 23, 25, 28, 30, 30, 29, 27, 24, 19],
    [ 13, 14, 15, 19, 21, 24, 26, 27, 25, 23, 19, 15],
    11,
  ),
  haifa: new ItimLabinaClimate(
    [  8,  8, 10, 13, 16, 20, 22, 23, 21, 18, 13,  9],
    [ 16, 17, 19, 23, 26, 29, 30, 31, 30, 27, 23, 18],
    [ 12, 13, 15, 18, 21, 24, 26, 27, 26, 23, 18, 13],
    32,
  ),
  beerSheva: new ItimLabinaClimate(
    [  7,  7,  9, 12, 15, 18, 20, 20, 19, 16, 12,  8],
    [ 16, 17, 20, 25, 29, 31, 32, 32, 31, 28, 23, 18],
    [ 11, 12, 15, 19, 22, 24, 26, 26, 25, 22, 17, 13],
    260,
  ),
  ashdod: new ItimLabinaClimate(
    [  8,  9, 10, 13, 16, 19, 21, 22, 21, 18, 13, 10],
    [ 18, 18, 20, 24, 26, 28, 30, 31, 30, 28, 24, 19],
    [ 13, 13, 15, 19, 21, 24, 26, 26, 25, 23, 18, 14],
    17,
  ),
  netanya: new ItimLabinaClimate(
    [  8,  8, 10, 13, 16, 19, 22, 22, 21, 18, 13,  9],
    [ 17, 18, 20, 24, 26, 29, 30, 31, 30, 28, 23, 18],
    [ 12, 13, 15, 18, 21, 24, 26, 27, 25, 23, 18, 14],
    26,
  ),
  petachTikva: new ItimLabinaClimate(
    [  8,  8, 10, 13, 16, 19, 21, 22, 20, 17, 13,  9],
    [ 17, 18, 20, 24, 26, 29, 30, 31, 30, 28, 23, 19],
    [ 12, 13, 15, 18, 21, 24, 26, 26, 25, 22, 18, 14],
    59,
  ),
  rishonLezion: new ItimLabinaClimate(
    [  8,  8, 10, 12, 15, 18, 21, 21, 20, 17, 12,  9],
    [ 17, 18, 20, 24, 26, 29, 30, 31, 30, 28, 23, 19],
    [ 12, 13, 15, 18, 21, 23, 25, 26, 25, 22, 18, 14],
    52,
  ),
  bneiBrak: new ItimLabinaClimate(
    [  8,  9, 10, 13, 16, 19, 22, 22, 21, 18, 13, 10],
    [ 17, 18, 20, 24, 26, 29, 30, 31, 30, 28, 24, 19],
    [ 13, 13, 15, 19, 21, 24, 26, 27, 25, 23, 18, 14],
    24,
  ),
  ramatGan: new ItimLabinaClimate(
    [  8,  9, 10, 13, 16, 19, 22, 22, 21, 18, 13, 10],
    [ 17, 18, 20, 24, 26, 28, 30, 30, 29, 27, 23, 19],
    [ 13, 13, 15, 18, 21, 24, 26, 26, 25, 23, 18, 14],
    39,
  ),
  herzliya: new ItimLabinaClimate(
    [  8,  8, 10, 13, 16, 19, 22, 22, 21, 18, 13, 10],
    [ 17, 18, 20, 24, 26, 29, 30, 31, 30, 28, 23, 19],
    [ 13, 13, 15, 18, 21, 24, 26, 26, 25, 23, 18, 14],
    57,
  ),
  rechovot: new ItimLabinaClimate(
    [  7,  8,  9, 12, 15, 18, 21, 21, 20, 17, 12,  9],
    [ 17, 18, 20, 24, 27, 29, 31, 31, 30, 28, 24, 19],
    [ 12, 13, 15, 18, 21, 24, 26, 26, 25, 22, 18, 14],
    56,
  ),
  modiin: new ItimLabinaClimate(
    [  7,  7,  9, 12, 15, 18, 20, 20, 19, 16, 12,  8],
    [ 15, 16, 19, 23, 27, 29, 30, 31, 29, 27, 22, 17],
    [ 11, 12, 14, 18, 21, 23, 25, 25, 24, 22, 17, 12],
    269,
  ),
  eilat: new ItimLabinaClimate(
    [  6,  8, 10, 15, 19, 21, 23, 23, 21, 18, 12,  7],
    [ 17, 19, 22, 28, 32, 35, 37, 36, 34, 30, 24, 19],
    [ 12, 13, 16, 21, 26, 28, 30, 30, 28, 24, 18, 13],
    152,
  ),
  tzfat: new ItimLabinaClimate(
    [  5,  5,  7, 11, 14, 17, 19, 19, 18, 15, 10,  6],
    [ 12, 13, 16, 21, 26, 29, 30, 30, 29, 25, 19, 13],
    [  8,  9, 11, 16, 20, 23, 25, 25, 23, 20, 15, 10],
    662,
  ),
  tiberias: new ItimLabinaClimate(
    [  8,  8, 10, 13, 16, 20, 22, 23, 21, 18, 13,  9],
    [ 16, 16, 19, 24, 28, 30, 32, 32, 31, 28, 23, 17],
    [ 12, 12, 14, 18, 22, 25, 27, 27, 26, 23, 18, 13],
    93,
  ),
  newYork: new ItimLabinaClimate(
    [ -4, -3,  1,  5, 11, 16, 19, 19, 15,  8,  4, -1],
    [  4,  5, 10, 16, 22, 27, 29, 28, 24, 18, 12,  7],
    [  0,  1,  5, 11, 16, 21, 24, 24, 19, 13,  8,  3],
    7,
  ),
  london: new ItimLabinaClimate(
    [  2,  2,  3,  5,  8, 11, 13, 13, 11,  8,  4,  3],
    [  8,  8, 11, 13, 18, 21, 23, 23, 19, 15, 11,  9],
    [  5,  5,  7,  9, 13, 16, 18, 18, 15, 11,  8,  6],
    32,
  ),
  antwerp: new ItimLabinaClimate(
    [  1,  1,  3,  5,  9, 12, 14, 13, 11,  8,  4,  2],
    [  6,  7, 10, 14, 18, 21, 23, 23, 19, 15, 10,  7],
    [  4,  4,  7,  9, 14, 16, 18, 18, 15, 11,  7,  5],
    6,
  ),
  montreal: new ItimLabinaClimate(
    [-15,-13, -7,  1,  8, 13, 16, 15, 10,  4, -1,-10],
    [ -5, -4,  3, 11, 20, 25, 27, 26, 21, 13,  6, -2],
    [-10, -8, -2,  6, 14, 19, 22, 21, 16,  9,  2, -6],
    36,
  ),
}
