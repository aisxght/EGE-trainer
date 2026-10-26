import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the same pure TypeScript module used by the Vue application.
const compiled = ts.transpileModule(readFileSync('src/pairs.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { makePairs, stressedWord } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const word = (correct, id = correct) => ({ id, correct, word: correct.toLowerCase(), stressIndex: [...correct].findIndex(c => /[АЕЁИОУЫЭЮЯ]/.test(c)) })

describe('distinct words in mnemonic pairs', () => {
  it('excludes the same word with and without a preposition', () => {
    assert.equal(makePairs([word('без нОгтя'), word('нОгтя')]).length, 0)
    assert.equal(makePairs([word('для ногтЕй'), word('ногтЕй')]).length, 0)
  })
  it('excludes duplicate words even when source contexts differ', () => {
    assert.equal(makePairs([word('Отзыв', 'book'), word('Отзыв', 'other')]).length, 0)
  })
  it('keeps distinct similar words and prefers standalone representatives', () => {
    const pairs = makePairs([word('для ногтЕй'), word('новостЕй'), word('ногтЕй')])
    assert.equal(pairs.length, 1)
    assert.equal(pairs[0].a.correct, 'ногтЕй')
    assert.equal(pairs[0].b.correct, 'новостЕй')
    assert.equal(makePairs([word('столЯр'), word('малЯр')]).length, 1)
  })
  it('contains only distinct stressed words from the current trusted dataset', () => {
    const { words } = JSON.parse(readFileSync('src/words.json', 'utf8'))
    const pairs = makePairs(words)
    assert.ok(pairs.length > 0)
    for (const pair of pairs) {
      assert.notEqual(stressedWord(pair.a), stressedWord(pair.b), `${pair.a.correct} — ${pair.b.correct}`)
      assert.ok(words.some(w => w.id === pair.a.id))
      assert.ok(words.some(w => w.id === pair.b.id))
    }
  })
})
