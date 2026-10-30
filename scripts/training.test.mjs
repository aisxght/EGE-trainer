import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const compiled = ts.transpileModule(readFileSync('src/training.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { frequency, createRound, randomRound, trainingYearWords } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const { words } = JSON.parse(readFileSync('src/words.json', 'utf8'))
const item = (id, count) => ({ id, sources: Array.from({ length: count }, (_, i) => ({ file: 'test.md', line: i, year: '2026', variant: String(i + 1) })) })
const sample = [item('common', 9), item('medium', 4), item('rare', 1), item('rare2', 1)]
describe('quiz selection and rounds', () => {
  it('runs the entire 2027 set once, irrespective of previous mode and mistakes', () => {
    const original = structuredClone(words)
    for (const mode of ['all', 'mistakes', 'rare', 'frequent']) {
      const round = createRound(words, mode, 'year2027', [])
      assert.equal(round.length, 122)
      assert.equal(new Set(round.map(word => word.id)).size, 122)
      const stressedTokens = round.map(word => word.correct.split(/\s+/).find(token => /[АЕЁИОУЫЭЮЯ]/.test(token)))
      assert.equal(new Set(stressedTokens).size, 122)
      assert.ok(round.every(word => word.sources.length && word.sources.every(source => source.year === '2027')))
      for (const correct of ['цепОчка', 'кремЕнь', 'послАла', 'освЕдомиться', 'начАвший', 'лилА', 'окружИшь', 'защемИм']) {
        assert.ok(round.some(word => word.correct === correct), `Missing 2027 word: ${correct}`)
      }
      assert.equal(round.filter(word => word.correct === 'Отзыв').length, 1)
      assert.equal(round.filter(word => word.correct === 'отзЫв').length, 1)
      assert.ok(round.find(word => word.correct === 'отзЫв').context)
    }
    assert.deepEqual(words, original)
  })
  it('does not borrow words from other years or repeat overlapping 2027 sources', () => {
    const yearWord = (id, correct, year, variant = '1') => ({ id, correct, sources: [{ year, variant, line: 1, file: 'test.md' }] })
    const pool = [yearWord('old', 'досУг', '2026'), yearWord('a', 'срЕдства', '2027'), yearWord('b', 'срЕдства', '2027', '2'), yearWord('c', 'Отзыв', '2027'), yearWord('d', 'отзЫв', '2027')]
    assert.deepEqual(trainingYearWords(pool, '2027').map(word => word.id), ['a', 'c', 'd'])
    assert.deepEqual(createRound([pool[0]], 'all', 'year2027'), [])
    assert.deepEqual(createRound([], 'all', 'year2027'), [])
  })
  it('selects the most frequent and rarest words by supplied variants', () => {
    assert.deepEqual(createRound(sample, 'frequent', 2).map(w => w.id).sort(), ['common', 'medium'])
    assert.deepEqual(createRound(sample, 'rare', 2).map(w => w.id).sort(), ['rare', 'rare2'])
  })
  it('counts a repeated source variant once', () => {
    const value = item('word', 2)
    value.sources.push({ ...value.sources[0], file: 'overlapping.md', line: 123 })
    assert.equal(frequency(value), 2)
  })
  it('returns every word exactly once for a full round, regardless of previous filter', () => {
    const result = createRound(words, 'mistakes', 'all', [])
    assert.equal(result.length, words.length)
    assert.equal(new Set(result.map(w => w.id)).size, words.length)
    assert.deepEqual(result.map(w => w.id).sort(), words.map(w => w.id).sort())
  })
  it('uses every word in an endless round and prevents immediate boundary repeats', () => {
    const first = createRound(words, 'rare', 'endless')
    assert.equal(first.length, words.length)
    const previousId = first.at(-1).id
    const second = randomRound(first, previousId, () => 0)
    assert.notEqual(second[0].id, previousId)
    assert.equal(new Set(second.map(w => w.id)).size, words.length)
    assert.deepEqual(second.map(w => w.id).sort(), first.map(w => w.id).sort())
  })
  it('keeps finite and mistakes modes limited to their pool', () => {
    assert.equal(createRound(words, 'all', 20).length, 20)
    assert.deepEqual(createRound(sample, 'mistakes', 10, ['medium']).map(w => w.id), ['medium'])
    assert.deepEqual(createRound(sample, 'mistakes', 10, []), [])
  })
  it('handles an empty pool and one-word round', () => {
    assert.deepEqual(randomRound([]), [])
    assert.deepEqual(randomRound([sample[0]], sample[0].id), [sample[0]])
  })
})
