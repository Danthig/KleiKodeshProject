// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904.
// Kotlin's `indexOfLast`, used by Atmosphere.kt and HorizonRefraction.kt (Array.findLastIndex is ES2023).

/** The index of the last element matching [predicate], or -1. */
export function indexOfLast<T>(array: readonly T[], predicate: (element: T) => boolean): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i]!)) return i
  }
  return -1
}
