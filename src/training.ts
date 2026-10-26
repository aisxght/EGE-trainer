export type TrainingMode = 'all' | 'mistakes' | 'frequent' | 'rare'
export type TrainingSize = number | 'all' | 'endless'
interface TrainingWord {
  id: string
  sources: { file: string; line: number; year: string; variant: string }[]
}

export function frequency(word: TrainingWord): number {
  return new Set(word.sources.map(source => source.year && source.variant
    ? `${source.year}:${source.variant}`
    : `${source.file}:${source.line}`)).size
}

export function randomRound<T extends { id: string }>(words: T[], previousId?: string, random = Math.random): T[] {
  const result = [...words]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  // Avoid an immediate repeat at the boundary between two full rounds.
  if (result.length > 1 && result[0].id === previousId) [result[0], result[1]] = [result[1], result[0]]
  return result
}

export function createRound<T extends TrainingWord>(words: T[], mode: TrainingMode, size: TrainingSize, mistakes: string[] = [], random = Math.random): T[] {
  if (size === 'all' || size === 'endless') return randomRound(words, undefined, random)
  let pool = randomRound(mode === 'mistakes' ? words.filter(word => mistakes.includes(word.id)) : words, undefined, random)
  if (mode === 'frequent' || mode === 'rare') {
    const direction = mode === 'frequent' ? -1 : 1
    pool.sort((a, b) => direction * (frequency(a) - frequency(b)))
  }
  return randomRound(pool.slice(0, size), undefined, random)
}
