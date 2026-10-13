// What the Itim Labina luach (itimlabina.co.il) prints for each of the app's zmanim rows, per luach, and how each
// of those zmanim is defined. Taken from their config (GET https://itimlabina.co.il/api/boot/data): the zman that
// their main printed view (view 251) shows FIRST for the row, with that zman's definition and default round type.
// Two exceptions: their first netz is usually the visible one (terrain based), which cannot be computed here, so
// every luach uses their sea-level netz (14); chatzot halaila (557) is not in view 251 and is taken as is.
import type { CalendarZmanim, CityKey } from './calendarTypes'

/** An Itim Labina zman id (`zmanimList[].id`). */
export type ZmanId = number

/** How their client rounds and prints a time (see itimLabinaTimeFormat.ts). */
export type RoundType = 'plusminus' | '15sc' | 'candle1'

/** How a zman is computed. Degrees are below the horizon (their config stores them negative). */
export type ZmanRule =
  /** The sun this far below the apparent horizon of the Itim Labina refraction (their gloyberman methods). */
  | { kind: 'belowHorizon', morning: boolean, degrees: number }
  /** The sun this far below the geometric horizon (no refraction method). */
  | { kind: 'geometric', morning: boolean, degrees: number }
  /** Sunset seen from the place's elevation (full horizon dip at any height, as their server computes it). */
  | { kind: 'sunsetFromHeight' }
  /** Solar noon. */
  | { kind: 'transit' }
  /** Solar midnight of the night that opens the day. */
  | { kind: 'midnight' }
  /** [hours] seasonal hours (twelfths of start..end) after [start]. */
  | { kind: 'zmanit', start: ZmanId, end: ZmanId, hours: number }
  /** The later of two zmanim. */
  | { kind: 'latest', of: readonly [ZmanId, ZmanId] }
  /** Fixed minutes after another zman. */
  | { kind: 'minutesAfter', of: ZmanId, minutes: number }

export interface ZmanDefinition {
  rule: ZmanRule
  roundType: RoundType
}

/** Every zman the luachot below print, plus the ones those are built from. */
export const ZMANIM: Record<ZmanId, ZmanDefinition> = {
  557: { rule: { kind: 'midnight' }, roundType: 'plusminus' }, // chatzot halaila
  35: { rule: { kind: 'belowHorizon', morning: true, degrees: 18.9712 }, roundType: 'plusminus' }, // alot, 90 minutes
  41: { rule: { kind: 'belowHorizon', morning: false, degrees: 18.9712 }, roundType: 'plusminus' }, // tzeit rabbeinu tam, 90 minutes
  65: { rule: { kind: 'belowHorizon', morning: true, degrees: 15.2193 }, roundType: 'plusminus' }, // alot, 72 minutes
  57: { rule: { kind: 'belowHorizon', morning: false, degrees: 15.2193 }, roundType: 'plusminus' }, // tzeit rabbeinu tam, 72 minutes
  71: { rule: { kind: 'geometric', morning: true, degrees: 11.5 }, roundType: 'plusminus' }, // misheyakir
  14: { rule: { kind: 'belowHorizon', morning: true, degrees: 0 }, roundType: '15sc' }, // netz, sea level
  52: { rule: { kind: 'belowHorizon', morning: false, degrees: 0 }, roundType: '15sc' }, // shkia, sea level
  58: { rule: { kind: 'sunsetFromHeight' }, roundType: '15sc' }, // shkia from the height
  34: { rule: { kind: 'zmanit', start: 35, end: 41, hours: 3 }, roundType: 'plusminus' }, // sof zman shma MGA, 90 minutes
  42: { rule: { kind: 'zmanit', start: 35, end: 41, hours: 4 }, roundType: 'plusminus' }, // sof zman tfila MGA, 90 minutes
  68: { rule: { kind: 'zmanit', start: 65, end: 57, hours: 3 }, roundType: 'plusminus' }, // sof zman shma MGA, 72 minutes
  86: { rule: { kind: 'zmanit', start: 65, end: 57, hours: 4 }, roundType: 'plusminus' }, // sof zman tfila MGA, 72 minutes
  44: { rule: { kind: 'zmanit', start: 14, end: 52, hours: 3 }, roundType: 'plusminus' }, // sof zman shma GRA
  43: { rule: { kind: 'zmanit', start: 14, end: 52, hours: 4 }, roundType: 'plusminus' }, // sof zman tfila GRA
  13: { rule: { kind: 'transit' }, roundType: 'plusminus' }, // chatzot
  67: { rule: { kind: 'minutesAfter', of: 13, minutes: 30 }, roundType: 'candle1' }, // mincha gedola, 30 minutes
  48: { rule: { kind: 'zmanit', start: 14, end: 52, hours: 6.5 }, roundType: 'plusminus' }, // mincha gedola GRA
  49: { rule: { kind: 'latest', of: [67, 48] }, roundType: 'plusminus' }, // mincha gedola, the later of the two
  75: { rule: { kind: 'zmanit', start: 14, end: 52, hours: 9.5 }, roundType: 'plusminus' }, // mincha ketana GRA
  64: { rule: { kind: 'zmanit', start: 14, end: 52, hours: 10.75 }, roundType: 'plusminus' }, // plag GRA
  74: { rule: { kind: 'geometric', morning: false, degrees: 6.45 }, roundType: 'plusminus' }, // tzeit, 6.45 degrees
  126: { rule: { kind: 'zmanit', start: 35, end: 74, hours: 10.75 }, roundType: 'plusminus' }, // plag, alot 90 to tzeit 6.45
  61: { rule: { kind: 'geometric', morning: false, degrees: 8.5 }, roundType: 'plusminus' }, // tzeit, 8.5 degrees
  112: { rule: { kind: 'geometric', morning: false, degrees: 9.28 }, roundType: 'plusminus' }, // tzeit, 9.28 degrees
  106: { rule: { kind: 'belowHorizon', morning: false, degrees: 2.86674 }, roundType: 'plusminus' }, // tzeit geonim, 13.5 minutes
  110: { rule: { kind: 'belowHorizon', morning: false, degrees: 3.8217 }, roundType: 'plusminus' }, // tzeit geonim, 18 minutes
  455: { rule: { kind: 'belowHorizon', morning: false, degrees: 4.24604 }, roundType: 'plusminus' }, // tzeit, Rambam
  97: { rule: { kind: 'minutesAfter', of: 58, minutes: 72 }, roundType: 'candle1' }, // tzeit rabbeinu tam, 72 minutes after shkia
  227: { rule: { kind: 'minutesAfter', of: 52, minutes: 20 }, roundType: 'candle1' }, // tzeit, 20 minutes after shkia
}

/** The rows every luach prints the same way. */
const SHARED_ROWS = {
  chatzotNight: 557,
  alot: 35,
  misheyakir: 71,
  sunrise: 14,
  sofShmaGra: 44,
  sofTfillaGra: 43,
  chatzot: 13,
  minchaGedola: 49,
  minchaKetana: 75,
} as const

type LuachRows = Record<keyof CalendarZmanim, ZmanId>

/** Per Itim Labina luach id: the zman printed for each row. */
const LUACH_ROWS: Record<number, LuachRows> = {
  16: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 126, sunset: 58, tzeit: 61 }, // Jerusalem
  88: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 110 }, // Tel Aviv
  43: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 126, sunset: 58, tzeit: 97 }, // Haifa
  61: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 58, tzeit: 106 }, // Beer Sheva
  17: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 58, tzeit: 61 }, // Ashdod
  18: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 126, sunset: 52, tzeit: 61 }, // Netanya
  22: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 61 }, // Petach Tikva
  84: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 61 }, // Rishon LeZion
  32: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 61 }, // Bnei Brak
  95: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 227 }, // Herzliya
  49: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 64, sunset: 52, tzeit: 61 }, // Rechovot
  140: { ...SHARED_ROWS, sofShmaMga: 68, sofTfillaMga: 86, plag: 64, sunset: 52, tzeit: 106 }, // Eilat
  44: { ...SHARED_ROWS, sofShmaMga: 68, sofTfillaMga: 86, plag: 64, sunset: 58, tzeit: 112 }, // Tzfat
  46: { ...SHARED_ROWS, sofShmaMga: 34, sofTfillaMga: 42, plag: 126, sunset: 52, tzeit: 61 }, // Tiberias
  136: { ...SHARED_ROWS, sofShmaMga: 68, sofTfillaMga: 86, plag: 126, sunset: 52, tzeit: 455 }, // the default luach
}

/**
 * The luach each city follows: its own Itim Labina location's luach. Modiin has none and falls in the region that
 * uses Jerusalem's; Ramat Gan uses Bnei Brak's; cities abroad use the default luach.
 */
const CITY_LUACH: Record<CityKey, number> = {
  jerusalem: 16,
  telAviv: 88,
  haifa: 43,
  beerSheva: 61,
  ashdod: 17,
  netanya: 18,
  petachTikva: 22,
  rishonLezion: 84,
  bneiBrak: 32,
  ramatGan: 32,
  herzliya: 95,
  rechovot: 49,
  modiin: 16,
  eilat: 140,
  tzfat: 44,
  tiberias: 46,
  newYork: 136,
  london: 136,
  antwerp: 136,
  montreal: 136,
}

/** The zman printed for each row in the city's luach. */
export function luachRowsOf(city: CityKey): LuachRows {
  return LUACH_ROWS[CITY_LUACH[city]]!
}
