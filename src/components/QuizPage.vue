<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { database, persist, progress, recordAnswer } from '../store'
import type { Word } from '../store'
import { createRound, frequency, randomRound } from '../training'
import type { TrainingMode, TrainingSize } from '../training'
import StressWord from './StressWord.vue'
import WordContext from './WordContext.vue'
const route = useRoute()
const mode = ref<TrainingMode>(route.query.mode === 'mistakes' ? 'mistakes' : 'all')
const length = ref<TrainingSize>(10)
const modeItems = [{ title: 'Все слова', value: 'all' }, { title: 'Мои ошибки', value: 'mistakes' }, { title: 'Наиболее частые слова', value: 'frequent' }, { title: 'Наиболее редкие слова', value: 'rare' }]
const sizeItems = computed(() => [
  { title: '5 слов', value: 5 }, { title: '10 слов', value: 10 }, { title: '20 слов', value: 20 },
  { title: 'Все слова · 1 круг (' + database.value.words.length + ')', value: 'all' },
  { title: 'Бесконечно · все слова', value: 'endless' },
])
const fullDatabase = computed(() => length.value === 'all' || length.value === 'endless')
const questions = ref<Word[]>([])
const index = ref(0), selected = ref<number | null>(null), score = ref(0), finished = ref(false)
const endless = ref(false), round = ref(1)
const answers = ref<{ word: Word; selected: number; correct: boolean }[]>([])
const current = computed(() => questions.value[index.value])
const answered = computed(() => selected.value !== null)
const isCorrect = computed(() => selected.value === current.value?.stressIndex)
const currentNumber = computed(() => answers.value.length + (answered.value ? 0 : 1))
const roundProgress = computed(() => (index.value + (answered.value ? 1 : 0)) / Math.max(questions.value.length, 1) * 100)
const vowels = /[аеёиоуыэюя]/
function start(onlyWrong = false) {
  if (onlyWrong) {
    const wrong = [...new Map(answers.value.filter(a => !a.correct).map(a => [a.word.id, a.word])).values()]
    questions.value = randomRound(wrong)
  } else questions.value = createRound(database.value.words, mode.value, length.value, progress.mistakes)
  endless.value = !onlyWrong && length.value === 'endless'
  index.value = 0; selected.value = null; score.value = 0; finished.value = false; answers.value = []; round.value = 1
}
function choose(position: number) {
  if (answered.value || finished.value || !current.value) return
  selected.value = position
  const correct = position === current.value.stressIndex
  if (correct) score.value++
  recordAnswer(current.value, correct)
  answers.value.push({ word: current.value, selected: position, correct })
}
function finish() {
  if (finished.value || !answers.value.length) return
  finished.value = true; progress.sessions++; persist()
}
function next() {
  if (!answered.value || finished.value) return
  if (index.value + 1 === questions.value.length) {
    if (!endless.value) { finish(); return }
    questions.value = randomRound(questions.value, current.value.id)
    index.value = 0; round.value++
  } else index.value++
  selected.value = null
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
watch([mode, length], () => {
  if (fullDatabase.value && mode.value !== 'all') { mode.value = 'all'; return }
  start()
})
start()
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <div class="page-heading quiz-heading"><div><router-link to="/" class="back-link"><v-icon icon="mdi-arrow-left" size="16" />К темам</router-link><h1>Расставим акценты<span class="heading-dot">.</span></h1><p>Выбери гласную, на которую падает ударение.</p></div><span class="subtle-pill">Задание 4 · Ударение</span></div>
  <div class="practice-layout"><section>
    <div class="practice-settings"><v-select v-model="mode" :items="modeItems" :disabled="fullDatabase" label="Режим" variant="outlined" density="compact" hide-details /><v-select v-model="length" :items="sizeItems" label="Объём тренировки" variant="outlined" density="compact" hide-details /></div>
    <details class="quiz-mode-help"><summary>О режиме тренировки</summary><p class="training-description" role="status">{{ fullDatabase ? (length === 'endless' ? 'Все слова в случайном порядке без повторов внутри круга. Затем — новый случайный круг. Заверши тренировку в любой момент.' : 'Все ' + database.words.length + ' слов в случайном порядке, каждое ровно один раз.') : mode === 'frequent' ? 'Выбираем слова с наибольшим числом появлений в твоих вариантах заданий. При равной частоте выбор случайный.' : mode === 'rare' ? 'Выбираем слова с наименьшим числом появлений в твоих вариантах заданий. При равной частоте выбор случайный.' : 'Выбери гласную в слове. Частота слов считается только по загруженным вариантам заданий.' }}</p></details>
    <v-card v-if="!questions.length" class="empty-card"><v-icon icon="mdi-check-decagram-outline" size="48" color="primary" /><h2>Ошибок пока нет</h2><p>После ответов в квизе здесь появятся слова для повторения.</p><v-btn color="primary" @click="mode = 'all'">Тренировать все слова</v-btn></v-card>
    <v-card v-else-if="finished" class="result-card"><div class="result-flower">✳</div><div class="eyebrow">ЕЩЁ ОДИН ШАГ ВПЕРЁД</div><h2>{{ score === answers.length ? 'Все акценты на месте!' : 'Отличная работа над собой' }}</h2><div class="result-score">{{ score }}<span> / {{ answers.length }}</span></div><p>{{ score === answers.length ? 'Ты справился со всеми словами в этой тренировке.' : 'Ошибки — это подсказки, какие слова стоит повторить.' }}</p><div class="result-actions"><v-btn color="primary" @click="start()">Ещё одна тренировка</v-btn><v-btn v-if="score < answers.length" variant="tonal" @click="start(true)">Повторить ошибки</v-btn></div><div class="answer-list"><div v-for="(answer, answerIndex) in answers" :key="answerIndex"><v-icon :icon="answer.correct ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'" :color="answer.correct ? 'primary' : 'error'" size="20" /><WordContext :entry="answer.word"><StressWord :word="answer.word.correct" /></WordContext></div></div></v-card>
    <v-card v-else class="quiz-card"><div class="quiz-top"><span>{{ endless ? 'ВОПРОС ' + currentNumber + ' · КРУГ ' + round : 'СЛОВО ' + (index + 1) + ' ИЗ ' + questions.length }}</span><span><v-icon icon="mdi-check" size="17" /> {{ score }} верно</span></div><v-progress-linear :model-value="roundProgress" color="primary" bg-color="#e9ece7" height="5" rounded /><div v-if="endless" class="endless-controls"><span>{{ index + 1 }} из {{ questions.length }} в текущем круге</span><v-btn variant="text" size="small" prepend-icon="mdi-stop-circle-outline" :disabled="!answers.length" @click="finish">Завершить</v-btn></div><div class="quiz-prompt">На какую гласную падает ударение?</div><WordContext :entry="current" class="question-word"><span class="letter-word" :class="{ 'long-word': current.word.length > 13 }" :style="{ '--word-length': current.word.length }"><template v-for="(letter, position) in current.word" :key="position"><button v-if="vowels.test(letter)" class="vowel-button" :class="{ 'is-correct': answered && position === current.stressIndex, 'is-wrong': answered && selected === position && !isCorrect, 'is-muted': answered && position !== current.stressIndex && selected !== position }" :disabled="answered" :aria-label="`Ударение на ${letter}, буква ${position + 1}`" :aria-pressed="selected === position" @click="choose(position)">{{ letter }}<span v-if="answered && position === current.stressIndex" class="vowel-accent">́</span></button><span v-else class="consonant">{{ letter === ' ' ? '\u00a0' : letter }}</span></template></span></WordContext><div v-if="!answered" class="quiz-hint"><v-icon icon="mdi-cursor-default-click-outline" size="18" />Нажми на гласную в слове</div><div v-else class="feedback" :class="{ wrong: !isCorrect }" role="status"><v-icon :icon="isCorrect ? 'mdi-check-circle-outline' : 'mdi-lightbulb-outline'" /><div><strong>{{ isCorrect ? 'Именно так!' : 'Запомним правильный акцент' }}</strong><p>Правильно: <WordContext :entry="current"><StressWord :word="current.correct" /></WordContext></p></div></div><div class="quiz-bottom"><span v-if="!answered">Можно использовать клавиши 1–9</span><span v-else class="source-reference">Источник: {{ current.sources[0].year }}, вариант {{ current.sources[0].variant }}<template v-if="mode === 'frequent' || mode === 'rare'"> · Встречается в {{ frequency(current) }} вариантах</template></span><v-btn color="primary" append-icon="mdi-arrow-right" :disabled="!answered" @click="next">{{ !endless && index + 1 === questions.length ? 'Результат' : 'Следующее' }}</v-btn></div></v-card>
  </section><aside class="practice-aside"><div class="aside-illustration">а<span>́</span></div><h3>Один акцент.<br>Большая разница.</h3><p>Произнеси слово вслух перед ответом. А после — повтори его с правильным ударением.</p><div class="aside-rule"></div><v-icon icon="mdi-shield-check-outline" color="primary" /><h4>Проверенный источник</h4><p>Вопросы составлены только из столбца «Правильно» в твоём файле. Спорные слова исключены.</p><router-link to="/memory">Закрепить в запоминалке <v-icon icon="mdi-arrow-right" size="16" /></router-link></aside></div>
</template>
