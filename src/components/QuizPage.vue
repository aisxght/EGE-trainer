<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { database, persist, progress, recordAnswer, shuffle } from '../store'
import type { Word } from '../store'
import StressWord from './StressWord.vue'
const route = useRoute()
const mode = ref(route.query.mode === 'mistakes' ? 'mistakes' : 'all')
const length = ref(10)
const questions = ref<Word[]>([])
const index = ref(0), selected = ref<number | null>(null), score = ref(0), finished = ref(false)
const answers = ref<{ word: Word; selected: number; correct: boolean }[]>([])
const current = computed(() => questions.value[index.value])
const answered = computed(() => selected.value !== null)
const isCorrect = computed(() => selected.value === current.value?.stressIndex)
const vowels = /[аеёиоуыэюя]/
function start(onlyWrong = false) {
  const pool = onlyWrong ? answers.value.filter(a => !a.correct).map(a => a.word) : mode.value === 'mistakes' ? database.value.words.filter(w => progress.mistakes.includes(w.id)) : database.value.words
  questions.value = shuffle(pool).slice(0, length.value)
  index.value = 0; selected.value = null; score.value = 0; finished.value = false; answers.value = []
}
function choose(position: number) {
  if (answered.value || !current.value) return
  selected.value = position
  const correct = position === current.value.stressIndex
  if (correct) score.value++
  recordAnswer(current.value, correct)
  answers.value.push({ word: current.value, selected: position, correct })
}
function next() {
  if (!answered.value) return
  if (index.value + 1 === questions.value.length) { finished.value = true; progress.sessions++; persist() }
  else { index.value++; selected.value = null }
}
function onKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement)?.closest('button, input, textarea, [role="combobox"]')) return
  if (event.key === 'Enter' && answered.value && !finished.value) { event.preventDefault(); next() }
  if (/^[1-9]$/.test(event.key) && current.value && !finished.value) {
    const positions = [...current.value.word].flatMap((c, i) => vowels.test(c) ? [i] : [])
    const position = positions[Number(event.key) - 1]
    if (position !== undefined) choose(position)
  }
}
watch([mode, length], () => start())
start()
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <div class="page-heading"><div><router-link to="/" class="back-link"><v-icon icon="mdi-arrow-left" size="16" />К темам</router-link><h1>Расставим акценты<span class="heading-dot">.</span></h1><p>Выбери гласную, на которую падает ударение.</p></div><span class="subtle-pill">Задание 4 · Ударение</span></div>
  <div class="practice-layout"><section>
    <div class="practice-settings"><v-select v-model="mode" :items="[{ title: 'Все слова', value: 'all' }, { title: 'Мои ошибки', value: 'mistakes' }]" label="Режим" variant="outlined" density="compact" hide-details /><v-select v-model="length" :items="[5, 10, 20]" label="Слов за тренировку" variant="outlined" density="compact" hide-details /></div>
    <v-card v-if="!questions.length" class="empty-card"><v-icon icon="mdi-check-decagram-outline" size="48" color="primary" /><h2>Ошибок пока нет</h2><p>После ответов в квизе здесь появятся слова для повторения.</p><v-btn color="primary" @click="mode = 'all'">Тренировать все слова</v-btn></v-card>
    <v-card v-else-if="finished" class="result-card"><div class="result-flower">✳</div><div class="eyebrow">ЕЩЁ ОДИН ШАГ ВПЕРЁД</div><h2>{{ score === questions.length ? 'Все акценты на месте!' : 'Отличная работа над собой' }}</h2><div class="result-score">{{ score }}<span> / {{ questions.length }}</span></div><p>{{ score === questions.length ? 'Ты справился со всеми словами в этой тренировке.' : 'Ошибки — это подсказки, какие слова стоит повторить.' }}</p><div class="result-actions"><v-btn color="primary" @click="start()">Ещё одна тренировка</v-btn><v-btn v-if="score < questions.length" variant="tonal" @click="start(true)">Повторить ошибки</v-btn></div><div class="answer-list"><div v-for="answer in answers" :key="answer.word.id"><v-icon :icon="answer.correct ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'" :color="answer.correct ? 'primary' : 'error'" size="20" /><StressWord :word="answer.word.correct" /><small v-if="answer.word.context">{{ answer.word.context }}</small></div></div></v-card>
    <v-card v-else class="quiz-card"><div class="quiz-top"><span>СЛОВО {{ index + 1 }} ИЗ {{ questions.length }}</span><span><v-icon icon="mdi-check" size="17" /> {{ score }} верно</span></div><v-progress-linear :model-value="index / questions.length * 100" color="primary" bg-color="#e9ece7" height="5" rounded /><div class="quiz-prompt">На какую гласную падает ударение?</div><div class="letter-word" :class="{ 'long-word': current.word.length > 13 }"><template v-for="(letter, position) in current.word" :key="position"><button v-if="vowels.test(letter)" class="vowel-button" :class="{ 'is-correct': answered && position === current.stressIndex, 'is-wrong': answered && selected === position && !isCorrect, 'is-muted': answered && position !== current.stressIndex && selected !== position }" :disabled="answered" :aria-label="`Ударение на ${letter}, буква ${position + 1}`" :aria-pressed="selected === position" @click="choose(position)">{{ letter }}<span v-if="answered && position === current.stressIndex" class="vowel-accent">́</span></button><span v-else class="consonant">{{ letter === ' ' ? '\u00a0' : letter }}</span></template></div><p class="word-context">{{ current.context || '\u00a0' }}</p><div v-if="!answered" class="quiz-hint"><v-icon icon="mdi-cursor-default-click-outline" size="18" />Нажми на гласную в слове</div><div v-else class="feedback" :class="{ wrong: !isCorrect }" role="status"><v-icon :icon="isCorrect ? 'mdi-check-circle-outline' : 'mdi-lightbulb-outline'" /><div><strong>{{ isCorrect ? 'Именно так!' : 'Запомним правильный акцент' }}</strong><p>Правильно: <StressWord :word="current.correct" /></p></div></div><div class="quiz-bottom"><span v-if="!answered">Можно использовать клавиши 1–9</span><span v-else class="source-reference">Источник: {{ current.sources[0].year }}, вариант {{ current.sources[0].variant }}</span><v-btn color="primary" append-icon="mdi-arrow-right" :disabled="!answered" @click="next">{{ index + 1 === questions.length ? 'Результат' : 'Следующее' }}</v-btn></div></v-card>
  </section><aside class="practice-aside"><div class="aside-illustration">а<span>́</span></div><h3>Один акцент.<br>Большая разница.</h3><p>Произнеси слово вслух перед ответом. А после — повтори его с правильным ударением.</p><div class="aside-rule"></div><v-icon icon="mdi-shield-check-outline" color="primary" /><h4>Проверенный источник</h4><p>Вопросы составлены только из столбца «Правильно» в твоём файле. Спорные слова исключены.</p><router-link to="/memory">Закрепить в запоминалке <v-icon icon="mdi-arrow-right" size="16" /></router-link></aside></div>
</template>
