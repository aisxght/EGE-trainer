<script setup lang="ts">
defineProps<{ word: string }>()
</script>
<template><span class="stress-word"><template v-for="(letter, i) in word" :key="i"><span v-if="/[АЕЁИОУЫЭЮЯ]/.test(letter)" class="stress-letter">{{ letter }}</span><template v-else>{{ letter }}</template></template></span></template>
