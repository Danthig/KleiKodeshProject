<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { IconSearch20Regular, IconDismiss20Regular } from '@iconify-prerendered/vue-fluent'
import LoadingAnimation from '@/components/LoadingAnimation.vue'
import HebrewBooksListItem from './HebrewBooksListItem.vue'
import TopSearchBar from '@/components/TopSearchBar.vue'
import { useHebrewBooks } from './useHebrewBooks'
import { useInputListNavigation } from '@/composables/useInputListNavigation'
import { useLocalFileStore } from '@/stores/localFileStore'
import { useTabStore } from '@/stores/tabStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePaneNavigation } from '@/composables/usePaneNavigation'
import { storeToRefs } from 'pinia'

const localFileStore = useLocalFileStore()
const settingsStore = useSettingsStore()
const tabStore = useTabStore()
const paneNavigation = usePaneNavigation()
const { downloadErrorMessage } = storeToRefs(localFileStore)
const { hebrewBooksLocalFolder } = storeToRefs(settingsStore)

const hebrewBooksTabId = paneNavigation.activeTabId

const {
  displayedBooks,
  isLoading,
  error,
  searchTerm,
  localFileBookIds,
  load,
  search,
  openBook,
  downloadBook,
  deleteLocalFile,
  revealInFolder,
} = useHebrewBooks()

const searchInputRef = ref<HTMLInputElement>()
const scrollEl = ref<HTMLElement | null>(null)
let clickTimer: ReturnType<typeof setTimeout> | null = null

const virtualizer = useVirtualizer(
  computed(() => ({
    count: displayedBooks.value.length,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => 48,
    overscan: 8,
  })),
)

const { activeIndex, onKeydown: onSearchInputKeydown } = useInputListNavigation({
  getCount: () => displayedBooks.value.length,
  onActivate: (i, openInNewTab) => openBook(displayedBooks.value[i]!, openInNewTab),
  getVirtualizer: () =>
    virtualizer.value as unknown as import('@tanstack/vue-virtual').Virtualizer<Element, Element>,
})

const selectedBookId = computed(() => paneNavigation.activeTab.localFileHbBookId)

const resultsSummary = computed(() => {
  if (isLoading.value) return 'טוען ספרים…'
  if (error.value) return 'שגיאה בטעינת הרשימה'
  if (!displayedBooks.value.length) {
    return searchTerm.value ? `לא נמצאו תוצאות ל"${searchTerm.value}"` : 'אין ספרים להצגה'
  }
  if (!searchTerm.value) return `מוצגים ${displayedBooks.value.length} ספרים`
  return `מוצגים ${displayedBooks.value.length} תוצאות עבור "${searchTerm.value}"`
})

watch(displayedBooks, () => {
  activeIndex.value = -1
})

onMounted(() => {
  const saved = paneNavigation.activeTab.hebrewBooksSearchQuery
  if (saved) search(saved)
  else load()
  searchInputRef.value?.focus()
})

onBeforeUnmount(() => {
  if (clickTimer) clearTimeout(clickTimer)
  const tab = tabStore.tabs.find((t) => t.id === hebrewBooksTabId)
  const stillHebrewBooks = tab?.route === '/hebrewbooks'
  tabStore.updateTab(hebrewBooksTabId, {
    hebrewBooksSearchQuery: stillHebrewBooks ? searchTerm.value || undefined : undefined,
  })
})

function clearSearch() {
  search('')
  searchInputRef.value?.focus()
}

function onBookClicked(
  i: number,
  book: (typeof displayedBooks.value)[number],
  openInNewTab = false,
) {
  activeIndex.value = i
  if (openInNewTab) {
    openBook(book, true)
    return
  }
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    openBook(book)
  }, 220)
}

function onBookDoubleClicked(i: number, book: (typeof displayedBooks.value)[number]) {
  activeIndex.value = i
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  openBook(book, true)
}
</script>

<template>
  <div class="hb-page">
    <TopSearchBar>
      <template #left><IconSearch20Regular class="search-icon" /></template>
      <input
        ref="searchInputRef"
        :value="searchTerm"
        type="search"
        placeholder="ספרים, מחברים או נושאים"
        class="search-input"
        dir="rtl"
        aria-label="חיפוש ספרים"
        @input="search(($event.target as HTMLInputElement).value)"
        @keydown="onSearchInputKeydown"
        @keydown.esc.prevent="clearSearch"
      />
      <template #right>
        <button
          v-if="searchTerm"
          type="button"
          class="clear-btn"
          aria-label="נקה חיפוש"
          @click="clearSearch"
        >
          <IconDismiss20Regular />
        </button>
      </template>
    </TopSearchBar>

    <div class="hb-summary" v-if="!isLoading && !error">
      <span>{{ resultsSummary }}</span>
      <span v-if="hebrewBooksLocalFolder" class="hb-folder-badge">תיקייה מקומית</span>
    </div>

    <div
      ref="scrollEl"
      class="hb-list"
      tabindex="0"
      role="listbox"
      aria-label="רשימת ספרי HebrewBooks"
      @keydown="onSearchInputKeydown"
    >
      <LoadingAnimation v-if="isLoading" />

      <div v-else-if="error" class="state">{{ error }}</div>

      <template v-else-if="displayedBooks.length">
        <div :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }">
          <div
            v-for="vRow in virtualizer.getVirtualItems()"
            :key="String(vRow.key)"
            :ref="(el) => el && virtualizer.measureElement(el as Element)"
            :data-index="vRow.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${vRow.start}px)`,
            }"
          >
            <HebrewBooksListItem
              :book="displayedBooks[vRow.index]!"
              :focused="activeIndex === vRow.index || String(displayedBooks[vRow.index]!.id) === String(selectedBookId)"
              :has-local-file="localFileBookIds.has(String(displayedBooks[vRow.index]!.id))"
              @book-clicked="(book, openInNewTab) => onBookClicked(vRow.index, book, openInNewTab)"
              @book-double-clicked="(book) => onBookDoubleClicked(vRow.index, book)"
              @download-clicked="downloadBook"
              @delete-clicked="deleteLocalFile"
              @reveal-clicked="revealInFolder"
            />
          </div>
        </div>
      </template>

      <div v-else class="state">
        <span class="state-icon">📚</span>
        <span>{{ searchTerm ? `לא נמצאו תוצאות עבור “${searchTerm}”` : 'אין ספרים להציג' }}</span>
      </div>
    </div>

    <div v-if="downloadErrorMessage" class="hb-error-banner">
      <span>{{ downloadErrorMessage }}</span>
      <button class="hb-error-dismiss" @click="downloadErrorMessage = null">
        <IconDismiss20Regular />
      </button>
    </div>
  </div>
</template>

<style scoped>
.hb-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.hb-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-secondary) 92%, transparent);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  flex-shrink: 0;
}

.hb-folder-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--text-primary);
  font-weight: 600;
}

.hb-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  outline: none;
  direction: rtl;
}

.hb-list:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 32px;
}
.state-icon {
  font-size: 40px;
  opacity: 0.5;
}

.search-icon {
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  direction: rtl;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.hb-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--status-danger) 12%, var(--bg-secondary));
  border-top: 1px solid color-mix(in srgb, var(--status-danger) 30%, transparent);
  flex-shrink: 0;
  color: var(--text-primary);
  font-size: 13px;
}

.hb-error-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--text-secondary);
  flex-shrink: 0;
}
</style>
