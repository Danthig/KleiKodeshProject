<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PdfViewPage from '@/features/pdf-viewer/PdfViewPage.vue'
import HebrewBooksPage from '@/features/hebrewbooks/HebrewBooksPage.vue'
import { usePaneNavigation } from '@/composables/usePaneNavigation'

const BREAKPOINT = 900
const paneNavigation = usePaneNavigation()
const isWide = ref(window.innerWidth >= BREAKPOINT)
const hasSelectedPdf = computed(() => {
  const tab = paneNavigation.activeTab
  return Boolean(tab.localFileHbBookId || tab.localFileVirtualUrl || tab.localFileConverting)
})

function updateViewport() {
  isWide.value = window.innerWidth >= BREAKPOINT
}

onMounted(() => window.addEventListener('resize', updateViewport))
onBeforeUnmount(() => window.removeEventListener('resize', updateViewport))
</script>

<template>
  <div class="hb-workspace" :class="{ 'is-wide': isWide }">
    <section v-if="isWide || hasSelectedPdf" class="hb-viewer-pane" aria-label="תצוגת הספר">
      <PdfViewPage />
    </section>
    <aside class="hb-catalog-pane" aria-label="קטלוג HebrewBooks">
      <HebrewBooksPage />
    </aside>
  </div>
</template>

<style scoped>
.hb-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-primary);
}

.hb-viewer-pane,
.hb-catalog-pane {
  min-height: 0;
  overflow: hidden;
}

.hb-viewer-pane {
  order: 2;
  flex: 1 1 auto;
  min-height: 45%;
  border-top: 1px solid var(--border-color);
}

.hb-catalog-pane {
  order: 1;
  flex: 1 1 auto;
  min-height: 0;
  direction: rtl;
}

.hb-workspace.is-wide {
  flex-direction: row;
  direction: ltr;
}

.is-wide .hb-viewer-pane {
  order: 1;
  flex: 2 1 0;
  min-width: 0;
  min-height: 0;
  border-top: 0;
  border-right: 1px solid var(--border-color);
}

.is-wide .hb-catalog-pane {
  order: 2;
  flex: 1 1 0;
  min-width: 260px;
}
</style>
