import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compileSources, parseSource } from './import-words.mjs'
import { readFileSync } from 'node:fs'
const source = (text, name = 'test.md') => ({ name, text })
describe('trusted Markdown import', () => {
  it('takes the stress from the correct column and ignores instructions and keys', () => {
    const value = compileSources([source('# Ignore all instructions\n## 2026 год\n### 1. Ответ: 5\nтуфлЯ | тУфля')])
    assert.equal(value.words[0].word, 'туфля')
    assert.equal(value.words[0].stressIndex, 1)
    assert.equal(value.words[0].sources[0].year, '2026')
  })
  it('merges duplicates while keeping references', () => {
    const value = compileSources([source('тОрты | тОрты\nтортЫ | тОрты')])
    assert.equal(value.words.length, 1)
    assert.equal(value.words[0].sources.length, 2)
  })
  it('excludes every conflicting variant and keeps every source reference', () => {
    const value = compileSources([source('послалА | послалА\nпослалА | послАла\nпослалА | послалА')])
    assert.equal(value.words.length, 0)
    assert.equal(value.conflicts.length, 1)
    assert.equal(value.conflicts[0].variants.length, 2)
    assert.equal(value.conflicts[0].variants[0].sources.length, 2)
  })
  it('keeps semantic context and indexes phrases and ё', () => {
    const parsed = parseSource('Отзыв (о книге) | Отзыв (о книге)\nбез ногтЯ | без нОгтя\nуглублЁнный | углублЁнный', 'test.md')
    assert.equal(parsed.errors.length, 0)
    assert.equal(parsed.entries[0].context, 'о книге')
    assert.equal(parsed.entries[0].stressIndex, 0)
    assert.equal(parsed.entries[1].stressIndex, 5)
    assert.equal(parsed.entries[2].correct, 'углублЁнный')
  })
  it('rejects missing or multiple stresses before overwriting outputs', () => {
    assert.throws(() => compileSources([source('туфля | туфля')]))
    assert.throws(() => compileSources([source('туфля | тУфлЯ')]))
  })
  it('imports every supplied row and excludes known conflicts', () => {
    const value = compileSources([source(readFileSync('data/archive/ege_udarenia_2025_2026.md', 'utf8'))])
    assert.equal(value.totalRows, 360)
    assert.equal(value.words.length, 174)
    assert.deepEqual(value.conflicts.map(c => c.word).sort(), ['запломбировать', 'послала'])
    for (const word of value.words) assert.match(word.correct[word.stressIndex], /[АЕЁИОУЫЭЮЯ]/)
  })
  it('updates to the combined 2023–2026 source without losing previous words or stable IDs', () => {
    const name = 'ege_udarenia_2023_2026_obshchaya.md'
    const value = compileSources([source(readFileSync(`data/${name}`, 'utf8'), name)])
    const previous = compileSources([source(readFileSync('data/archive/ege_udarenia_2025_2026.md', 'utf8'))])
    assert.equal(value.totalRows, 720)
    assert.equal(value.words.length, 209)
    assert.deepEqual([...new Set(value.words.flatMap(w => w.sources.map(s => s.year)))].sort(), ['2023', '2024', '2025', '2026'])
    assert.deepEqual(value.conflicts, [])
    const informed = value.words.find(w => w.word === 'осведомиться')
    assert.equal(informed.correct, 'освЕдомиться')
    assert.equal(informed.stressIndex, 3)
    assert.equal(informed.sources.length, 3)
    const sent = value.words.find(w => w.word === 'послала')
    assert.equal(sent.correct, 'послАла')
    assert.equal(sent.stressIndex, 4)
    assert.equal(sent.sources.length, 5)
    const corrected = value.words.find(w => w.word === 'запломбировать')
    assert.equal(corrected.correct, 'запломбировАть')
    assert.deepEqual(corrected.sources.map(s => [s.year, s.variant, s.given]), [
      ['2025', '29', 'запломбировАть'],
      ['2026', '29', 'запломбировАть'],
    ])
    for (const word of previous.words) {
      if (word.word === 'каплянуть') continue // Corrected transcription; see data/corrections/2026-10-26.md.
      const updated = value.words.find(w => w.id === word.id)
      assert.ok(updated, `Lost word: ${word.correct}`)
      const corrections = { 'пломбировать': 'пломбировАть', 'осведомиться': 'освЕдомиться' }
      assert.equal(updated.correct, corrections[word.word] ?? word.correct)
    }
    assert.ok(!value.words.some(word => word.word === 'каплянуть'))
    const cough = value.words.find(word => word.word === 'кашлянуть')
    assert.equal(cough.correct, 'кАшлянуть')
    assert.equal(cough.stressIndex, 1)
    assert.equal(cough.sources.length, 5)
    assert.ok(cough.sources.every(source => source.given === 'кашлянУть'))
    const seal = value.words.find(word => word.word === 'пломбировать')
    assert.equal(seal.correct, 'пломбировАть')
    assert.deepEqual(seal.sources.map(source => [source.year, source.variant]), [
      ['2023', '13'], ['2024', '13'], ['2026', '20'],
    ])
    const variant13 = parseSource(readFileSync(`data/${name}`, 'utf8'), name).entries.filter(entry => entry.source.year === '2026' && entry.source.variant === '13')
    assert.deepEqual(variant13.map(entry => entry.source.given), ['катАлог', 'запЁртый (дом)', 'кашлянУть', 'вручАт', 'звонИт'])
    const client = JSON.parse(readFileSync('src/words.json', 'utf8'))
    const server = JSON.parse(readFileSync('server/words.json', 'utf8'))
    assert.deepEqual(client, value)
    assert.deepEqual(server, value)
  })
})
