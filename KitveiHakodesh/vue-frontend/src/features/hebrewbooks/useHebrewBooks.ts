import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import {
  searchHbCatalog,
  getHbPdfUrl,
  type HebrewBook,
  normalizeHebrewSearchText,
  sortHebrewBooks,
  withNormalizedHebrewBookSearchText,
} from './hebrewBooksCatalog'
import { useHebrewBooksHistoryStore } from '@/stores/hebrewBooksHistoryStore'
import { useLocalFileStore } from '@/stores/localFileStore'
import { usePaneNavigation } from '@/composables/usePaneNavigation'
import { useSettingsStore } from '@/stores/settingsStore'
import { triggerHbDownload, triggerHbSaveAs, deleteHbLocalFile, revealHbLocalFile } from '@/webview-host/bridge'

const FULL_CATALOG_QUERY = '%'
const FULL_CATALOG_LIMIT = 50000

export function useHebrewBooks() {
  const localFileStore = useLocalFileStore()
  const history = useHebrewBooksHistoryStore()
  const settings = useSettingsStore()
  const paneNavigation = usePaneNavigation()

  const allBooks = ref<HebrewBook[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchTerm = ref('')

  const localFileBookIds = ref(new Set<string>())

  function applyLocalFileIdsFromSearchResults(bookList: HebrewBook[]) {
    const ids = new Set<string>()
    for (const book of bookList) {
      if (book.hasLocalFile) ids.add(String(book.id))
    }
    localFileBookIds.value = ids
  }

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const source = await searchHbCatalog(
        FULL_CATALOG_QUERY,
        settings.hebrewBooksLocalFolder || undefined,
        FULL_CATALOG_LIMIT,
      )
      allBooks.value = withNormalizedHebrewBookSearchText(sortHebrewBooks(source))
      applyLocalFileIdsFromSearchResults(allBooks.value)
    } catch {
      error.value = 'שגיאה בטעינת הספרים'
    } finally {
      isLoading.value = false
    }
  }

  const runSearch = useDebounceFn((term: string) => {
    searchTerm.value = term
  }, 250)

  function search(term: string) {
    runSearch(term)
  }

  const displayedBooks = computed(() => {
    const query = normalizeHebrewSearchText(searchTerm.value)
    const source = allBooks.value
    if (!query) return source

    const terms = query.split(' ').filter(Boolean)
    return source.filter((book) => {
      const haystack = book.normalizedSearchText ?? normalizeHebrewSearchText(
        `${book.title} ${book.author} ${book.categories}`,
      )
      return terms.every((termPart) => haystack.includes(termPart))
    })
  })

  async function trackAccess(book: HebrewBook) {
    await history.trackAccess(book)
  }

  function openBook(book: HebrewBook, openInNewTab = false) {
    trackAccess(book)
    const tabId = openInNewTab
      ? paneNavigation.openTab({ route: '/pdf-view', title: book.title }).id
      : paneNavigation.activeTabId
    const keepCatalogVisible = !openInNewTab && paneNavigation.activeTab.route === '/hebrewbooks'
    localFileStore.startHbDownload(book.title, tabId, String(book.id), keepCatalogVisible)
    triggerHbDownload(
      String(book.id),
      book.title,
      getHbPdfUrl(book.id),
      tabId,
      settings.hebrewBooksLocalFolder || undefined,
      navigator.onLine,
    ).catch(() => {})
  }

  function downloadBook(book: HebrewBook) {
    if (!navigator.onLine) {
      localFileStore.downloadErrorMessage = 'אין חיבור לאינטרנט'
      return
    }
    triggerHbSaveAs(String(book.id), book.title, getHbPdfUrl(book.id)).catch(() => {})
  }

  async function deleteLocalFile(book: HebrewBook) {
    const folder = settings.hebrewBooksLocalFolder
    if (!folder) return
    const result = await deleteHbLocalFile(String(book.id), folder).catch(
      () => ({ error: 'שגיאה' }) as { error: string },
    )
    if ('error' in result && result.error) {
      localFileStore.downloadErrorMessage = result.error
    } else if ('notFound' in result && result.notFound) {
      localFileStore.downloadErrorMessage = 'הקובץ לא נמצא בתיקייה'
    } else if ('ok' in result && result.ok) {
      const updated = new Set(localFileBookIds.value)
      updated.delete(String(book.id))
      localFileBookIds.value = updated
    }
  }

  function revealInFolder(book: HebrewBook) {
    const folder = settings.hebrewBooksLocalFolder
    if (!folder) return
    revealHbLocalFile(String(book.id), folder).catch(() => {})
  }

  return {
    displayedBooks,
    isLoading,
    error,
    searchTerm,
    localFileBookIds,
    load,
    search,
    trackAccess,
    openBook,
    downloadBook,
    deleteLocalFile,
    revealInFolder,
  }
}
