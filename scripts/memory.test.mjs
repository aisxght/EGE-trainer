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
const { memoryStats, filterMemoryPairs, pairErrorCount, makePairs } = await loadModule('src/pairs.ts')
const { restoreMistakeCounts } = await loadModule('src/progress.ts')
const word = (id, correct) => ({ id, correct, word: correct.toLowerCase(), stressIndex: [...correct].findIndex(c => /[АЕЁИОУЫЭЮЯ]/.test(c)) })
const a = word('a', 'ногтЕй'), phrase = word('phrase', 'для ногтЕй'), b = word('b', 'новостЕй')
const c = word('c', 'столЯр'), d = word('d', 'малЯр'), e = word('e', 'атмосфЕр'), f = word('f', 'диспансЕр')
const words = [a, phrase, b, c, d, e, f]
const pairs = [{ id: 'ab', a, b }, { id: 'cd', a: c, b: d }, { id: 'ef', a: e, b: f }]

describe('memory filters and progress compatibility', () => {
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
})
