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
