import { describe, expect, it, vi } from 'vitest'

describe('hebrewBooksCatalog', () => {
  it('normalizes Hebrew search text consistently', async () => {
    vi.stubGlobal('window', { __webviewAction: undefined })

    const { normalizeHebrewSearchText } = await import('./hebrewBooksCatalog')

    expect(normalizeHebrewSearchText('  שלום עולם  ')).toBe('שלומ עולמ')
    expect(normalizeHebrewSearchText('שולחן-ערוך 123')).toBe('שולחנ ערוכ 123')
    expect(normalizeHebrewSearchText('  \u0000\u200Eא\u0000  ')).toBe('א')
  })

  it('sorts Hebrew titles using a Hebrew collator', async () => {
    vi.stubGlobal('window', { __webviewAction: undefined })

    const { sortHebrewBooks } = await import('./hebrewBooksCatalog')

    const items = [
      { id: 2, title: 'א', author: '', printingPlace: '', printingYear: '', pages: null, categories: '' },
      { id: 1, title: 'ב', author: '', printingPlace: '', printingYear: '', pages: null, categories: '' },
    ]

    expect(sortHebrewBooks(items).map((b) => b.id)).toEqual([2, 1])
  })
})
