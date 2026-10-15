import type { DailyLearning } from './hebrewCalendarLearning'

export interface CalendarZmanim {
  chatzotNight: string | null
  alot: string | null
  misheyakir: string | null
  sunrise: string | null
  sofShmaGra: string | null
  sofShmaMga: string | null
  sofTfillaGra: string | null
  sofTfillaMga: string | null
  chatzot: string | null
  minchaGedola: string | null
  minchaKetana: string | null
  plag: string | null
  sunset: string | null
  tzeit: string | null
}

export interface CalendarDay {
  date: Date
  dayOfWeek: number // 0=Sun … 6=Sat
  gregDay: number
  hebGem: string // e.g. "כה"
  hebDayName: string // e.g. "שבת"
  isToday: boolean
  isShabbat: boolean
  isFriday: boolean
  // events
  holidays: string[]
  parasha: string | null
  candleLighting: string | null
  havdalah: string | null
  omer: string | null
  chanukahCandles: string | null
  shabbatMevarchim: string | null
  molad: string | null
  yomKippurKatan: string | null
  fastStart: string | null
  fastEnd: string | null
  // learning
  learning: DailyLearning
  // zmanim
  zmanim: CalendarZmanim
}

export interface CalendarWeek {
  hebrewLabel: string
  gregLabel: string
  days: CalendarDay[]
}

export type CityKey =
  | 'jerusalem' | 'telAviv' | 'haifa' | 'beerSheva' | 'ashdod' | 'netanya' | 'petachTikva' | 'rishonLezion'
  | 'bneiBrak' | 'ramatGan' | 'herzliya' | 'rechovot' | 'modiin' | 'eilat' | 'tzfat' | 'tiberias'
  | 'newYork' | 'london' | 'antwerp' | 'montreal'

export interface City {
  /** Stable ASCII id: keys the per-city zmanim data (climate, Itim Labina luach). */
  key: CityKey
  name: string
  lat: number
  lng: number
  elevation: number
  tzid: string
}

/**
 * The selectable city list. Kept here (pure data, no @hebcal imports) so
 * consumers that only need the coordinates — e.g. the home bar's deferred
 * zmanim loader — can import it without dragging in the hebcal engine.
 */
export const CITIES: City[] = [
  { name: 'ירושלים', key: 'jerusalem', lat: 31.7884, lng: 35.2184, elevation: 798, tzid: 'Asia/Jerusalem' },
  { name: 'תל אביב', key: 'telAviv', lat: 32.0855, lng: 34.782, elevation: 19, tzid: 'Asia/Jerusalem' },
  { name: 'חיפה', key: 'haifa', lat: 32.806, lng: 35.0023, elevation: 81, tzid: 'Asia/Jerusalem' },
  { name: 'באר שבע', key: 'beerSheva', lat: 31.252, lng: 34.778, elevation: 268, tzid: 'Asia/Jerusalem' },
  { name: 'אשדוד', key: 'ashdod', lat: 31.797, lng: 34.658, elevation: 19, tzid: 'Asia/Jerusalem' },
  { name: 'נתניה', key: 'netanya', lat: 32.3433, lng: 34.856, elevation: 23, tzid: 'Asia/Jerusalem' },
  { name: 'פתח תקווה', key: 'petachTikva', lat: 32.08, lng: 34.87, elevation: 59, tzid: 'Asia/Jerusalem' },
  { name: 'ראשון לציון', key: 'rishonLezion', lat: 31.975, lng: 34.793, elevation: 44, tzid: 'Asia/Jerusalem' },
  { name: 'בני ברק', key: 'bneiBrak', lat: 32.0858, lng: 34.8349, elevation: 45, tzid: 'Asia/Jerusalem' },
  { name: 'רמת גן', key: 'ramatGan', lat: 32.061, lng: 34.833, elevation: 38, tzid: 'Asia/Jerusalem' },
  { name: 'הרצליה', key: 'herzliya', lat: 32.16, lng: 34.84, elevation: 52, tzid: 'Asia/Jerusalem' },
  { name: 'רחובות', key: 'rechovot', lat: 31.894, lng: 34.816, elevation: 53, tzid: 'Asia/Jerusalem' },
  { name: 'מודיעין', key: 'modiin', lat: 31.8969, lng: 35.0095, elevation: 300, tzid: 'Asia/Jerusalem' },
  { name: 'אילת', key: 'eilat', lat: 29.557, lng: 34.95, elevation: 47, tzid: 'Asia/Jerusalem' },
  { name: 'צפת', key: 'tzfat', lat: 32.966, lng: 35.487, elevation: 638, tzid: 'Asia/Jerusalem' },
  { name: 'טבריה', key: 'tiberias', lat: 32.782, lng: 35.516, elevation: 223, tzid: 'Asia/Jerusalem' },
  { name: 'ניו יורק', key: 'newYork', lat: 40.7128, lng: -74.006, elevation: 10, tzid: 'America/New_York' },
  { name: 'לונדון', key: 'london', lat: 51.5074, lng: -0.1278, elevation: 10, tzid: 'Europe/London' },
  { name: 'אנטוורפן', key: 'antwerp', lat: 51.2194, lng: 4.4025, elevation: 10, tzid: 'Europe/Brussels' },
  { name: 'מונטריאול', key: 'montreal', lat: 45.5017, lng: -73.5673, elevation: 30, tzid: 'America/Toronto' },
]
