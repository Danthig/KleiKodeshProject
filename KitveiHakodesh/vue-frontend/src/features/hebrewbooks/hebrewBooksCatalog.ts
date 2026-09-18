import { hbSearch } from '@/webview-host/bridge'

export interface HebrewBook {
  id: number
  title: string
  author: string
  printingPlace: string
  printingYear: string
  pages: number | null
  categories: string
  /** True when {localFolder}/{id}.pdf exists on disk — stamped by C# during search. */
  hasLocalFile?: boolean
  /** Set by the history store — most-recent access timestamp. */
  lastAccessed?: number
  /** Precomputed search text used by the in-memory catalog filter. */
  normalizedSearchText?: string
}

export function withNormalizedHebrewBookSearchText<T extends HebrewBook>(books: T[]): T[] {
  return books.map((book) => ({
    ...book,
    normalizedSearchText: normalizeHebrewSearchText(
      `${book.title} ${book.author} ${book.categories}`,
    ),
  }))
}

export const HEBREW_COLLATOR = new Intl.Collator('he', {
  sensitivity: 'base',
  numeric: true,
  ignorePunctuation: true,
})

const UNICODE_HEBREW_DIACRITICS = /[\u0591-\u05C7]/g
const QUOTE_GLYPHS = /[\u05F4\u05F3"'`]/g
const HEBREW_PUNCTUATION = /[\u05BE\-–—()\[\]{}.,;:!?]/g
const DIRECTIONAL_MARKS = /[\u200E\u200F\u202A-\u202E]/g
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
const HEBREW_FINAL_FORMS: Record<string, string> = {
  ך: 'כ',
  ם: 'מ',
  ן: 'נ',
  ף: 'פ',
  ץ: 'צ',
}

export function normalizeHebrewSearchText(input: string): string {
  const value = input
    .replace(CONTROL_CHARS, '')
    .replace(DIRECTIONAL_MARKS, '')
    .replace(UNICODE_HEBREW_DIACRITICS, '')
    .replace(QUOTE_GLYPHS, '')
    .replace(HEBREW_PUNCTUATION, ' ')
    .replace(/[\u00A0\s]+/g, ' ')
    .trim()
    .toLowerCase()

  return Array.from(value)
    .map((ch) => HEBREW_FINAL_FORMS[ch] ?? ch)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sortHebrewBooks<T extends HebrewBook>(books: T[]): T[] {
  return [...books].sort((a, b) => {
    const left = (a.title || '').trim()
    const right = (b.title || '').trim()
    return HEBREW_COLLATOR.compare(left, right) || HEBREW_COLLATOR.compare(a.author || '', b.author || '')
  })
}

export function getHbPdfUrl(bookId: number): string {
  return `https://download.hebrewbooks.org/downloadhandler.ashx?req=${bookId}`
}

/**
 * Search the Hebrew Books catalog via the C# SQLite backend.
 * If localFolder is provided, C# stamps hasLocalFile on each result with no extra round-trip.
 * Returns up to 200 results sorted by title.
 */
export async function searchHbCatalog(term: string, localFolder?: string, limit?: number): Promise<HebrewBook[]> {
  try {
    const result = await hbSearch(term, localFolder, limit)
    if (result.error) {
      console.error('Hebrew Books search error:', result.error)
      return []
    }
    return withNormalizedHebrewBookSearchText(sortHebrewBooks((result.books ?? []) as HebrewBook[]))
  } catch (e) {
    console.error('Failed to search Hebrew Books:', e)
    return []
  }
}
