<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { database, makePairs, shuffle, progress } from '../store'
import { matchesMemoryPrefix, memoryCards, memoryStats, pairErrorCount, restoreMemorySelection, selectedMemoryCards } from '../pairs'
import type { MemoryFilter } from '../pairs'
import StressWord from './StressWord.vue'
import WordContext from './WordContext.vue'
const pairs = computed(() => makePairs(database.value.words))
const filter = ref<MemoryFilter | 'custom'>('all')
const filterItems = [{ title: 'Все пары', value: 'all' }, { title: 'Мои ошибки', value: 'mistakes' }, { title: 'Чаще всего ошибаюсь', value: 'frequent' }, { title: 'Мои слова', value: 'custom' }]
const selectionKey = 'tochka-memory-selection-v1'
const selectedIds = ref<string[]>(readSelection())
const search = ref('')
const storageUnavailable = ref(false)
const wordItems = computed(() => database.value.words.map(word => ({
  title: word.context ? `${word.word} (${word.context})` : word.word,
  value: word.id,
  word: word.word,
})))
const description = computed(() => filter.value === 'custom'
  ? 'Начни вводить слово и выбери его из подсказок. К выбранным словам подберём созвучные пары из базы, а слова без пары покажем отдельно.'
  : filter.value === 'frequent'
    ? 'Карточки с твоими ошибками из квизов: сначала те, где суммарно больше ошибок. Число ошибок учитывается с этого обновления; прежние отметки сохранены без точного количества.'
    : filter.value === 'mistakes'
      ? 'Пары и отдельные слова из текущего списка ошибок. Правильный ответ в квизе убирает слово из этого списка.'
      : 'Все созвучные пары из твоей базы. Выбери фильтр, чтобы повторить слова, в которых ты ошибаешься.')
function readSelection(): string[] {
  try { return restoreMemorySelection(JSON.parse(localStorage.getItem(selectionKey) || '[]'), database.value.words) }
  catch { return [] }
}
const stats = computed(() => memoryStats(database.value.words, progress.mistakeCounts, progress.mistakes))
const filteredPairs = computed(() => filter.value === 'custom'
  ? selectedMemoryCards(database.value.words, selectedIds.value)
  : memoryCards(database.value.words, pairs.value, filter.value, stats.value))
const order = ref<string[]>([])
const index = ref(0), revealed = ref(false)
const saved = ref<string[]>([])
const displayPairs = computed(() => order.value.length ? order.value.map(id => filteredPairs.value.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : filteredPairs.value)
const pair = computed(() => displayPairs.value[index.value % Math.max(displayPairs.value.length, 1)])
function next() { if (!displayPairs.value.length) return; index.value = (index.value + 1) % displayPairs.value.length; revealed.value = false }
function shufflePairs() { const cards = shuffle(filteredPairs.value); if (filter.value === 'frequent') cards.sort((a, b) => pairErrorCount(b, stats.value) - pairErrorCount(a, stats.value)); order.value = cards.map(p => p.id); index.value = 0; revealed.value = false }
function toggleSaved() { if (!pair.value) return; saved.value = saved.value.includes(pair.value.id) ? saved.value.filter(id => id !== pair.value.id) : [...saved.value, pair.value.id] }
function resetCards() { index.value = 0; revealed.value = false; order.value = [] }
watch(filter, resetCards)
watch(selectedIds, () => {
  resetCards()
  search.value = ''
  try { localStorage.setItem(selectionKey, JSON.stringify(selectedIds.value)); storageUnavailable.value = false }
  catch { storageUnavailable.value = true }
}, { deep: true })
watch(() => displayPairs.value.length, () => { index.value = 0; revealed.value = false })
</script>
<template>
  <div class="page-heading">
    <div><router-link to="/" class="back-link"><v-icon icon="mdi-arrow-left" size="16" />К темам</router-link><h1>Вместе запоминается<span class="heading-dot">.</span></h1><p>Два слова, один созвучный акцент. Прочитай их вслух.</p></div>
    <span class="subtle-pill">{{ filter === 'all' ? pairs.length + ' пар из твоей базы' : 'Карточек: ' + displayPairs.length }}</span>
  </div>
  <div class="practice-layout">
    <section>
      <div class="memory-filter">
        <v-select v-model="filter" :items="filterItems" label="Что повторим?" variant="outlined" density="comfortable" hide-details />
        <p class="training-description">{{ description }}</p>
      </div>
      <div v-if="filter === 'custom'" class="memory-selection">
        <v-autocomplete
          v-model="selectedIds"
          v-model:search="search"
          :items="wordItems"
          :custom-filter="(_value, query, item) => matchesMemoryPrefix(item?.raw.word ?? '', query)"
          label="Выбери слова из базы"
          placeholder="Например, деш…"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          multiple chips closable-chips clearable hide-selected
          hide-details
          auto-select-first
          :menu-props="{ maxHeight: 300 }"
        >
          <template #no-data><div class="memory-search-empty">Нет слов с таким началом. Попробуй другие буквы.</div></template>
        </v-autocomplete>
        <p class="training-description">Выбрано слов: {{ selectedIds.length }}. {{ storageUnavailable ? 'Сохранение в браузере недоступно — набор останется в этой сессии.' : 'Набор сохраняется в этом браузере. Убрать слово можно крестиком рядом с ним.' }}</p>
      </div>
      <div class="memory-toolbar"><span>КАРТОЧКА {{ displayPairs.length ? index + 1 : 0 }} / {{ displayPairs.length }}</span><v-btn variant="text" prepend-icon="mdi-shuffle-variant" :disabled="!displayPairs.length" @click="shufflePairs">{{ filter === 'frequent' ? 'Перемешать равные' : 'Перемешать' }}</v-btn></div>
      <v-card v-if="pair" class="memory-card">
        <div class="memory-spark">✳</div>
        <div class="eyebrow">{{ pair.b ? 'ЗАПОМНИ ПАРУ' : 'ЗАПОМНИ СЛОВО' }}</div>
        <div v-if="filter === 'mistakes' || filter === 'frequent'" class="memory-error-count">{{ pairErrorCount(pair, stats) ? (pair.b ? 'Учтено ошибок в этой паре: ' : 'Учтено ошибок в этом слове: ') + pairErrorCount(pair, stats) : 'Ранее отмеченная ошибка · точное число не сохранено' }}</div>
        <div class="pair-words"><WordContext :entry="pair.a"><StressWord :word="revealed ? pair.a.correct : pair.a.word" /></WordContext><template v-if="pair.b"><span class="pair-dash">—</span><WordContext :entry="pair.b"><StressWord :word="revealed ? pair.b.correct : pair.b.word" /></WordContext></template></div>
        <p v-if="!revealed">{{ pair.b ? 'Попробуй поставить ударения самостоятельно.' : 'Попробуй поставить ударение самостоятельно.' }}</p>
        <p v-else-if="pair.b" class="pair-explanation">Общая ударная часть: <strong>«{{ pair.tail }}»</strong>.<br>Проговори пару вместе, чтобы закрепить созвучие.</p>
        <p v-else class="pair-explanation">Проговори слово вслух с правильным ударением.<br>Для этого слова в базе пока нет созвучной пары.</p>
        <v-btn v-if="!revealed" color="primary" size="large" prepend-icon="mdi-eye-outline" @click="revealed = true">{{ pair.b ? 'Показать ударения' : 'Показать ударение' }}</v-btn>
        <v-btn v-else color="primary" size="large" append-icon="mdi-arrow-right" @click="next">Следующая карточка</v-btn>
        <div class="memory-card-foot"><v-btn variant="text" :prepend-icon="saved.includes(pair.id) ? 'mdi-bookmark-check' : 'mdi-bookmark-outline'" @click="toggleSaved">{{ saved.includes(pair.id) ? 'Отмечено в этой сессии' : 'Отметить карточку' }}</v-btn><v-btn v-if="!revealed" variant="text" @click="next">Пропустить <v-icon icon="mdi-arrow-right" size="17" /></v-btn></div>
      </v-card>
      <v-card v-else class="empty-card">
        <h2>{{ filter === 'custom' ? 'Выбери слова для тренировки' : filter === 'all' ? 'Пары пока не найдены' : 'Нет карточек с ошибками' }}</h2>
        <p>{{ filter === 'custom' ? 'Начни вводить первые буквы в поле выше и выбери нужные слова из базы. Карточки появятся сразу.' : filter === 'all' ? 'В текущей базе нет слов с подходящим созвучием.' : 'Ошибки появляются после неверных ответов в квизах. Если у слова нет созвучного напарника, оно будет показано отдельной карточкой.' }}</p>
        <v-btn v-if="filter !== 'all'" variant="tonal" color="primary" @click="filter = 'all'">Все пары</v-btn>
        <v-btn v-if="filter === 'mistakes' || filter === 'frequent'" to="/quiz" variant="text" color="primary">Перейти к квизам</v-btn>
      </v-card>
      <div class="memory-note"><v-icon icon="mdi-information-outline" size="20" /><p>Пары подобраны по совпадению части слова от ударной гласной до конца. Это приём запоминания, а не правило о корне или окончании. В фильтрах ошибок и в «Моих словах» слова без пары показываются отдельными карточками.</p></div>
    </section>
    <aside class="practice-aside"><span class="aside-flower">✳</span><h3>У слов тоже<br>бывают напарники.</h3><p>Созвучия помогают удерживать ударение в памяти. Сначала вспомни знакомое слово, затем — его пару.</p><div class="aside-rule"></div><h4>Как тренироваться</h4><ol><li>Прочитай слова на карточке.</li><li>Поставь ударения в уме.</li><li>Открой ответ и повтори вслух.</li></ol><router-link to="/quiz">Проверить себя в квизе <v-icon icon="mdi-arrow-right" size="16" /></router-link></aside>
  </div>
</template>
