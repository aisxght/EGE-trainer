<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { database, dataMode, progress } from '../store'
import StressWord from './StressWord.vue'
import WordContext from './WordContext.vue'
import { groupWordSources } from '../sources'
const route = useRoute()
const query = ref(''), filter = ref(route.query.review ? 'review' : 'all'), page = ref(1)
const filtered = computed(() => database.value.words.filter(word => `${word.word} ${word.context}`.includes(query.value.toLowerCase().trim()) && (filter.value !== 'mistakes' || progress.mistakes.includes(word.id))))
const paged = computed(() => filtered.value.slice((page.value - 1) * 24, page.value * 24))
const importing = ref(false)
const sourceYears = computed(() => {
  const years = [...new Set(database.value.words.flatMap(word => word.sources.map(source => source.year)).filter(Boolean))].sort()
  return years.length > 1 ? years[0] + '–' + years[years.length - 1] : years[0] || ''
})
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">КАЖДОЕ СЛОВО — ИЗ ТВОЕГО ФАЙЛА</div><h1>База, которой доверяешь<span class="heading-dot">.</span></h1><p>{{ database.words.length }} уникальных слов · {{ database.totalRows }} исходных строк · {{ sourceYears }}</p></div><v-btn variant="outlined" prepend-icon="mdi-file-document-plus-outline" @click="importing = true">Как добавить слова</v-btn></div>
  <div class="source-banner"><v-icon icon="mdi-shield-check-outline" size="28" /><div><strong>Только предоставленные тобой данные</strong><p>{{ database.sourceFiles.join(', ') }}</p></div><span class="subtle-pill">{{ dataMode === 'server' ? 'Go API подключён' : 'Локальная копия базы' }}</span></div>
  <div class="library-controls"><v-text-field v-model="query" label="Найти слово" prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" hide-details clearable @update:model-value="query = query || ''; page = 1" /><v-select v-model="filter" :items="[{ title: 'Все слова', value: 'all' }, { title: 'Мои ошибки', value: 'mistakes' }, { title: `Нужна проверка (${database.conflicts.length})`, value: 'review' }]" label="Показать" variant="outlined" density="comfortable" hide-details @update:model-value="page = 1" /></div>
  <section v-if="filter === 'review'" class="review-section"><div class="review-intro"><v-icon icon="mdi-information-outline" /><p>В столбце «Правильно» исходного файла обнаружены разные ударения. Эти слова полностью исключены из квизов и пар до твоей проверки.</p></div><v-card v-for="conflict in database.conflicts" :key="conflict.word" class="conflict-card"><h3>{{ conflict.word }}</h3><div v-for="variant in conflict.variants" :key="variant.correct"><StressWord :word="variant.correct" /><span>{{ variant.sources.map(s => `${s.year}, вариант ${s.variant}, строка ${s.line}`).join(' · ') }}</span></div></v-card></section>
  <template v-else><div class="word-library"><v-card v-for="word in paged" :key="word.id" class="library-word"><div><WordContext :entry="word"><StressWord :word="word.correct" /></WordContext><v-icon v-if="progress.learned.includes(word.id)" icon="mdi-check-circle-outline" color="primary" size="18" /><v-icon v-if="progress.mistakes.includes(word.id)" icon="mdi-reload" color="error" size="18" /></div><div class="word-source-lines"><p v-for="source in groupWordSources(word.sources)" :key="source.year">{{ source.year }} · {{ source.variants.length ? (source.variants.length === 1 ? 'вариант ' : 'варианты ') + source.variants.join(', ') : 'вариант не указан' }}</p></div></v-card></div><div v-if="!filtered.length" class="empty-card"><h2>Слов не найдено</h2><p>Попробуй другой запрос или выбери все слова.</p></div><v-pagination v-if="filtered.length > 24" v-model="page" :length="Math.ceil(filtered.length / 24)" :total-visible="5" rounded="lg" color="primary" class="word-pagination" /></template>
  <v-dialog v-model="importing" max-width="600"><v-card class="import-dialog"><div class="dialog-top"><h2>Как пополнять базу</h2><v-btn icon="mdi-close" variant="text" aria-label="Закрыть" @click="importing = false" /></div><p>Передай новую партию проверенных слов в Markdown. Формат каждой строки:</p><pre>В задании | Правильно<br>туфлЯ | тУфля</pre><p>В правом столбце выдели ровно одну ударную гласную заглавной буквой. Для разных значений добавь пояснение в скобках.</p><ol><li>Добавь файл <code>.md</code> в папку <code>data/</code> проекта.</li><li>Выполни <code>npm run import:words</code>.</li><li>Пересобери приложение и перезапусти Go-сервер.</li></ol><div class="import-info">Повторы объединяются. Конфликтующие ударения исключаются из тренировок и появляются в разделе «Нужна проверка». Чтобы исправить конфликт, сначала согласуй ударение во всех исходных строках.</div><v-btn color="primary" @click="importing = false">Понятно</v-btn></v-card></v-dialog>
</template>
