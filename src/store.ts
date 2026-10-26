import { computed, reactive, ref } from 'vue'
import bundled from './words.json'
import { restoreMistakeCounts } from './progress'

export interface Word { id: string; word: string; correct: string; context: string; stressIndex: number; sources: { file: string; line: number; year: string; variant: string; given: string }[] }
export const database = ref(bundled)
export const dataMode = ref('local')
export async function loadWords() {
  if (import.meta.env.VITE_STATIC_HOSTING === 'true') return
  try {
    const response = await fetch('/api/words', { signal: AbortSignal.timeout(2500) })
    if (!response.ok) return
    const value = await response.json()
    if (value.version === 1 && Array.isArray(value.words) && value.words.length && value.words.every((w: Word) => typeof w.id === 'string' && typeof w.word === 'string' && typeof w.correct === 'string' && Number.isInteger(w.stressIndex) && w.stressIndex >= 0 && w.stressIndex < w.word.length && /[аеёиоуыэюя]/.test(w.word[w.stressIndex]))) {
      database.value = value
      dataMode.value = 'server'
    }
  } catch { /* The exact same verified dataset is bundled for offline practice. */ }
}
interface Progress { answers: number; correct: number; learned: string[]; mistakes: string[]; mistakeCounts: Record<string, number>; days: Record<string, number>; sessions: number; goal: number }
const fresh: Progress = { answers: 0, correct: 0, learned: [], mistakes: [], mistakeCounts: {}, days: {}, sessions: 0, goal: 10 }
function restore(): Progress {
  try {
    const value = JSON.parse(localStorage.getItem('tochka-progress-v1') || 'null')
    if (value && Number.isFinite(value.answers) && Number.isFinite(value.correct) && Array.isArray(value.learned) && Array.isArray(value.mistakes) && value.days && typeof value.days === 'object') {
      const validIds = new Set(database.value.words.map(word => word.id))
      return { ...fresh, ...value, learned: value.learned.filter((id: string) => validIds.has(id)), mistakes: value.mistakes.filter((id: string) => validIds.has(id)), mistakeCounts: restoreMistakeCounts(value.mistakeCounts, validIds) }
    }
  } catch { /* A restricted or full storage must not prevent practice. */ }
  return fresh
}
export const progress = reactive<Progress>(restore())
export function persist() { try { localStorage.setItem('tochka-progress-v1', JSON.stringify(progress)) } catch { /* Session remains usable in memory. */ } }
export function resetProgress() {
  Object.assign(progress, { answers: 0, correct: 0, learned: [], mistakes: [], mistakeCounts: {}, days: {}, sessions: 0, goal: 10 })
  persist()
}
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export const todayCount = computed(() => progress.days[dayKey()] || 0)
export const accuracy = computed(() => progress.answers ? Math.round(progress.correct / progress.answers * 100) : 0)
export const streak = computed(() => {
  const date = new Date(); let count = 0
  if (!progress.days[dayKey(date)]) date.setDate(date.getDate() - 1)
  while (progress.days[dayKey(date)]) { count++; date.setDate(date.getDate() - 1) }
  return count
})
export function recordAnswer(word: Word, correct: boolean) {
  progress.answers++; progress.days[dayKey()] = todayCount.value + 1
  if (correct) { progress.correct++; progress.mistakes = progress.mistakes.filter(id => id !== word.id); if (!progress.learned.includes(word.id)) progress.learned.push(word.id) }
  else { progress.mistakeCounts[word.id] = (progress.mistakeCounts[word.id] || 0) + 1; if (!progress.mistakes.includes(word.id)) progress.mistakes.push(word.id); progress.learned = progress.learned.filter(id => id !== word.id) }
  persist()
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
export { makePairs } from './pairs'
