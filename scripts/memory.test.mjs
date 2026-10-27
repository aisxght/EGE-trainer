import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
async function loadModule(path) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}
const { memoryStats, filterMemoryPairs, pairErrorCount, makePairs, memoryCards, matchesMemoryPrefix, restoreMemorySelection, selectedMemoryCards } = await loadModule('src/pairs.ts')
const { restoreMistakeCounts } = await loadModule('src/progress.ts')
const word = (id, correct) => ({ id, correct, word: correct.toLowerCase(), stressIndex: [...correct].findIndex(c => /[АЕЁИОУЫЭЮЯ]/.test(c)) })
const a = word('a', 'ногтЕй'), phrase = word('phrase', 'для ногтЕй'), b = word('b', 'новостЕй')
const c = word('c', 'столЯр'), d = word('d', 'малЯр'), e = word('e', 'атмосфЕр'), f = word('f', 'диспансЕр')
const words = [a, phrase, b, c, d, e, f]
const pairs = [{ id: 'ab', a, b }, { id: 'cd', a: c, b: d }, { id: 'ef', a: e, b: f }]

describe('memory filters and progress compatibility', () => {
  it('suggests only prefix matches, ignoring case and the ё/е distinction', () => {
    assert.ok(matchesMemoryPrefix('дешевизна', ' ДЕШ '))
    assert.ok(matchesMemoryPrefix('поделённый', 'поделе'))
    assert.equal(matchesMemoryPrefix('подешеветь', 'деш'), false)
    assert.equal(matchesMemoryPrefix('дешевизна', 'несуществующее'), false)
  })
  it('restores only unique existing database IDs from saved selection', () => {
    assert.deepEqual(restoreMemorySelection(['a', 'a', 'unknown', null, 'b'], words), ['a', 'b'])
    assert.deepEqual(restoreMemorySelection({ a: true }, words), [])
  })
  it('trains selected words regardless of mistakes, retaining context and unpaired words', () => {
    const actualWords = JSON.parse(readFileSync('src/words.json', 'utf8')).words
    const cheapness = actualWords.find(w => w.word === 'дешевизна')
    const review = actualWords.find(w => w.word === 'отзыв' && w.context === 'о книге')
    const cards = selectedMemoryCards(actualWords, [cheapness.id, review.id, 'unknown'])
    assert.equal(cards.length, 2)
    assert.equal(cards[0].a.id, cheapness.id)
    assert.equal(cards[0].b, undefined)
    assert.equal(cards[1].a.id, review.id)
    assert.equal(cards[1].a.context, 'о книге')
    assert.deepEqual(selectedMemoryCards(actualWords, []), [])
  })
  it('prefers selected partners without pairing identical words or losing selected IDs', () => {
    const cards = selectedMemoryCards(words, ['a', 'b'])
    assert.equal(cards.length, 1)
    assert.equal(cards[0].a.id, 'a')
    assert.equal(cards[0].b.id, 'b')
    const phraseCards = selectedMemoryCards(words, ['phrase'])
    assert.equal(phraseCards[0].a.id, 'phrase')
    assert.equal(phraseCards[0].b.id, 'b')
    assert.ok(selectedMemoryCards(words, words.map(w => w.id)).every(card => !card.b || card.a.word !== card.b.word))
  })
  it('preserves old mistake marks without inventing historical counts', () => {
    assert.deepEqual(restoreMistakeCounts(undefined, new Set(words.map(w => w.id))), {})
    const stats = memoryStats(words, {}, ['a'])
    assert.deepEqual(filterMemoryPairs(pairs, 'mistakes', stats).map(p => p.id), ['ab'])
    assert.deepEqual(filterMemoryPairs(pairs, 'frequent', stats).map(p => p.id), ['ab'])
    assert.equal(pairErrorCount(pairs[0], stats), 0)
    assert.equal(stats.get('ногтей').legacy, true)
  })
  it('orders by combined error count and keeps corrected words in historical ranking', () => {
    const stats = memoryStats(words, { a: 1, b: 2, c: 7, d: 1 }, ['a'])
    assert.deepEqual(filterMemoryPairs(pairs, 'frequent', stats).map(p => p.id), ['cd', 'ab'])
    assert.deepEqual(filterMemoryPairs(pairs, 'mistakes', stats).map(p => p.id), ['ab'])
    assert.equal(pairErrorCount(pairs[1], stats), 8)
    assert.equal(filterMemoryPairs(pairs, 'all', stats).length, 3)
  })
  it('maps mistakes in a phrase to the same standalone word in a pair', () => {
    const stats = memoryStats(words, { phrase: 4 }, ['phrase'])
    const selected = filterMemoryPairs(makePairs(words), 'mistakes', stats)
    assert.equal(selected.length, 1)
    assert.equal(selected[0].a.word, 'ногтей')
    assert.equal(pairErrorCount(selected[0], stats), 4)
  })
  it('ignores removed words and returns no invented pairs for words without partners', () => {
    const lone = word('lone', 'тУфля')
    const stats = memoryStats([...words, lone], { removed: 10, lone: 3 }, ['removed', 'lone'])
    assert.deepEqual(filterMemoryPairs(pairs, 'mistakes', stats), [])
    assert.deepEqual(filterMemoryPairs(pairs, 'frequent', stats), [])
  })
  it('validates stored counts and removes obsolete IDs', () => {
    const restored = restoreMistakeCounts({ a: 3, b: -1, c: '4', d: 2.5, removed: 100 }, new Set(words.map(w => w.id)))
    assert.deepEqual(restored, { a: 3 })
    assert.deepEqual(restoreMistakeCounts([], new Set(['a'])), {})
  })
  it('shows дешевИзна as a single card when no matching pair exists', () => {
    const actualWords = JSON.parse(readFileSync('src/words.json', 'utf8')).words
    const cheapness = actualWords.find(w => w.word === 'дешевизна')
    const actualPairs = makePairs(actualWords)
    const stats = memoryStats(actualWords, { [cheapness.id]: 2 }, [cheapness.id])
    for (const filter of ['mistakes', 'frequent']) {
      const cards = memoryCards(actualWords, actualPairs, filter, stats)
      assert.equal(cards.length, 1)
      assert.equal(cards[0].a.correct, 'дешевИзна')
      assert.equal(cards[0].b, undefined)
      assert.equal(pairErrorCount(cards[0], stats), 2)
    }
    assert.ok(memoryCards(actualWords, actualPairs, 'all', stats).every(card => card.b))
  })
  it('mixes pairs and unpaired errors by count and preserves legacy single-word marks', () => {
    const lone = word('lone', 'тУфля')
    const allWords = [...words, lone]
    const stats = memoryStats(allWords, { a: 1, lone: 5 }, ['a', 'lone'])
    const cards = memoryCards(allWords, makePairs(allWords), 'frequent', stats)
    assert.equal(cards[0].a.id, 'lone')
    assert.equal(cards[0].b, undefined)
    assert.equal(cards.length, 2)
    const legacyStats = memoryStats(allWords, {}, ['lone'])
    assert.equal(memoryCards(allWords, makePairs(allWords), 'mistakes', legacyStats)[0].a.id, 'lone')
    const clearedStats = memoryStats(allWords, { lone: 5 }, [])
    assert.equal(memoryCards(allWords, makePairs(allWords), 'mistakes', clearedStats).length, 0)
    assert.equal(memoryCards(allWords, makePairs(allWords), 'frequent', clearedStats).length, 1)
  })
})
