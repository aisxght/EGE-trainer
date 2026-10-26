import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const output = ts.transpileModule(readFileSync('src/sources.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { groupWordSources } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
describe('word source labels', () => {
  it('keeps each year paired with its actual variant number', () => {
    const { words } = JSON.parse(readFileSync('src/words.json', 'utf8'))
    const word = words.find(word => word.word === 'пломбировать')
    assert.deepEqual(groupWordSources(word.sources), [
      { year: '2023', variants: ['13'] },
      { year: '2024', variants: ['13'] },
      { year: '2026', variants: ['20'] },
    ])
  })
  it('groups, deduplicates and numerically sorts variants within a year', () => {
    assert.deepEqual(groupWordSources([
      { year: '2026', variant: '20' }, { year: '2026', variant: '3' },
      { year: '2026', variant: '20' }, { year: '2025', variant: '13' },
    ]), [{ year: '2025', variants: ['13'] }, { year: '2026', variants: ['3', '20'] }])
  })
})
