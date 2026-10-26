<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ entry: { context: string; sources: { given: string }[] } }>()
const before = computed(() => {
  const context = `(${props.entry.context})`
  const original = props.entry.sources.find(source => source.given.includes(context))?.given
  return original?.trimStart().startsWith(context) ?? false
})
</script>

<template>
  <span class="word-with-context" :class="{ 'has-context': entry.context }">
    <span v-if="entry.context && before" class="inline-word-context">({{ entry.context }})</span>
    <slot />
    <span v-if="entry.context && !before" class="inline-word-context">({{ entry.context }})</span>
  </span>
</template>
