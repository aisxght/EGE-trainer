interface PairWord { id: string; word: string; correct: string; stressIndex: number }

// Compare the word carrying the stress, not the whole phrase (e.g. «без ногтя»).
export function stressedWord(word: PairWord): string {
  const start = word.word.lastIndexOf(' ', word.stressIndex) + 1
  const end = word.word.indexOf(' ', word.stressIndex)
  return word.word.slice(start, end === -1 ? undefined : end).toLowerCase().replaceAll('ё', 'е')
}

export function makePairs<T extends PairWord>(words: T[]) {
  const groups = new Map<string, T[]>()
  for (const word of words) {
    const tail = word.correct.slice(word.stressIndex).toLowerCase()
    if (tail.length < 2 || tail.includes(' ')) continue
    groups.set(tail, [...(groups.get(tail) || []), word])
  }
  return [...groups.entries()].flatMap(([tail, group]) => {
    // Prefer the standalone word to the same word with a preposition or context.
    const representatives = new Map<string, T>()
    for (const word of group) {
      const key = stressedWord(word)
      const existing = representatives.get(key)
      if (!existing || word.word.length < existing.word.length) representatives.set(key, word)
    }
    const unique = [...representatives.values()]
    return unique.slice(0, -1).map((word, i) => ({ id: `${word.id}-${unique[i + 1].id}`, a: word, b: unique[i + 1], tail }))
  })
}

export type MemoryFilter = 'all' | 'mistakes' | 'frequent'
export interface MemoryStat { count: number; current: boolean; legacy: boolean }
export function memoryStats(words: PairWord[], counts: Record<string, number>, mistakes: string[]): Map<string, MemoryStat> {
  const stats = new Map<string, MemoryStat>()
  const current = new Set(mistakes)
  for (const word of words) {
    const key = stressedWord(word)
    const stat = stats.get(key) || { count: 0, current: false, legacy: false }
    stat.count += counts[word.id] || 0
    stat.current ||= current.has(word.id)
    stat.legacy ||= current.has(word.id) && !counts[word.id]
    stats.set(key, stat)
  }
  return stats
}
export function pairErrorCount(pair: { a: PairWord; b?: PairWord }, stats: Map<string, MemoryStat>): number {
  return (stats.get(stressedWord(pair.a))?.count || 0) + (pair.b ? stats.get(stressedWord(pair.b))?.count || 0 : 0)
}

export interface MemoryCard<T extends PairWord> { id: string; a: T; b?: T; tail: string }

export function matchesMemoryPrefix(word: string, query: string): boolean {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
  return normalize(word).startsWith(normalize(query))
}

export function restoreMemorySelection(value: unknown, words: PairWord[]): string[] {
  const validIds = new Set(words.map(word => word.id))
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && validIds.has(id)))] : []
}

export function selectedMemoryCards<T extends PairWord>(words: T[], ids: string[]): MemoryCard<T>[] {
  const byId = new Map(words.map(word => [word.id, word]))
  const selected = restoreMemorySelection(ids, words).map(id => byId.get(id)!)
  const covered = new Set<string>(), cards: MemoryCard<T>[] = []
  for (const word of selected) {
    if (covered.has(word.id)) continue
    const tail = word.correct.slice(word.stressIndex).toLowerCase()
    // Prefer another selected word; otherwise find a verified partner in the full database.
    const partner = tail.length >= 2 && !tail.includes(' ') ? [...selected, ...words].find(other =>
      other.id !== word.id && stressedWord(other) !== stressedWord(word) && other.correct.slice(other.stressIndex).toLowerCase() === tail
    ) : undefined
    covered.add(word.id)
    if (partner) covered.add(partner.id)
    cards.push({ id: `selected-${word.id}`, a: word, b: partner, tail: partner ? tail : '' })
  }
  return cards
}

export function memoryCards<T extends PairWord>(words: T[], pairs: { id: string; a: T; b: T; tail: string }[], filter: MemoryFilter, stats: Map<string, MemoryStat>): MemoryCard<T>[] {
  const selected: MemoryCard<T>[] = filterMemoryPairs(pairs, filter, stats)
  if (filter === 'all') return selected
  const pairedWords = new Set(pairs.flatMap(pair => [stressedWord(pair.a), stressedWord(pair.b)]))
  const singles = new Map<string, T>()
  for (const word of words) {
    const key = stressedWord(word)
    const stat = stats.get(key)
    if (pairedWords.has(key) || !(stat?.current || (filter === 'frequent' && (stat?.count || 0) > 0))) continue
    const existing = singles.get(key)
    if (!existing || word.word.length < existing.word.length) singles.set(key, word)
  }
  for (const word of singles.values()) selected.push({ id: `single-${word.id}`, a: word, tail: '' })
  return filter === 'frequent' ? selected.sort((a, b) => pairErrorCount(b, stats) - pairErrorCount(a, stats)) : selected
}
export function filterMemoryPairs<T extends { a: PairWord; b: PairWord }>(pairs: T[], filter: MemoryFilter, stats: Map<string, MemoryStat>): T[] {
  if (filter === 'all') return [...pairs]
  const relevant = pairs.filter(pair => [pair.a, pair.b].some(word => {
    const stat = stats.get(stressedWord(word))
    return stat?.current || (filter === 'frequent' && (stat?.count || 0) > 0)
  }))
  return filter === 'frequent' ? relevant.sort((a, b) => pairErrorCount(b, stats) - pairErrorCount(a, stats)) : relevant
}
