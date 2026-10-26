import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// Markdown is input data only. Prose, answer keys and instructions are never executed.
export function parseSource(text, source) {
  let year = '', variant = ''
  const entries = [], errors = []
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const yearMatch = line.match(/^## (\d{4})/)
    if (yearMatch) year = yearMatch[1]
    const variantMatch = line.match(/^### (\d+)\./)
    if (variantMatch) variant = variantMatch[1]
    if (!line.includes('|') || line.includes('`')) continue
    const cells = line.split('|').map(s => s.trim()).filter(Boolean)
    if (cells.length !== 2 || /^[-:\s]+$/.test(cells[0]) || cells[1] === 'Правильно') continue
    const [given, correct] = cells
    const stress = [...correct].flatMap((char, i) => /[АЕЁИОУЫЭЮЯ]/.test(char) ? [i] : [])
    if (stress.length !== 1 || !/^[а-яёА-ЯЁ ()—–,-]+$/u.test(correct)) {
      errors.push(`${source}:${index + 1}: требуется ровно одна ударная гласная: ${correct}`)
      continue
    }
    const word = correct.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase()
    const context = correct.match(/\(([^)]+)\)/)?.[1] ?? given.match(/\(([^)]+)\)/)?.[1] ?? ''
    const cleanCorrect = correct.replace(/\s*\([^)]*\)/g, '').trim()
    entries.push({ word, correct: cleanCorrect, context, stressIndex: [...cleanCorrect].findIndex(c => /[АЕЁИОУЫЭЮЯ]/.test(c)), source: { file: source, line: index + 1, year, variant, given } })
  }
  return { entries, errors }
}

export function compileSources(sources) {
  const words = new Map(), errors = [], conflicts = new Map()
  let totalRows = 0
  for (const { text, name } of sources) {
    const parsed = parseSource(text, name)
    errors.push(...parsed.errors)
    totalRows += parsed.entries.length
    for (const entry of parsed.entries) {
      const key = `${entry.word}|${entry.context}`
      const existing = words.get(key)
      if (existing && existing.stressIndex !== entry.stressIndex) {
        const conflict = conflicts.get(key) ?? { word: entry.word, variants: [{ correct: existing.correct, sources: [...existing.sources] }] }
        const found = conflict.variants.find(v => v.correct === entry.correct)
        if (found) found.sources.push(entry.source)
        else conflict.variants.push({ correct: entry.correct, sources: [entry.source] })
        conflicts.set(key, conflict)
      } else if (existing) existing.sources.push(entry.source)
      else {
        const { source, ...rest } = entry
        words.set(key, { id: Buffer.from(key).toString('base64url'), ...rest, sources: [source] })
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  for (const key of conflicts.keys()) {
    const original = words.get(key)
    const first = conflicts.get(key).variants.find(v => v.correct === original.correct)
    first.sources = original.sources
    words.delete(key)
  }
  return { version: 1, sourceFiles: sources.map(s => s.name), totalRows, conflicts: [...conflicts.values()], words: [...words.values()].sort((a, b) => a.word.localeCompare(b.word, 'ru')) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve('data')
  const files = readdirSync(directory).filter(f => f.endsWith('.md')).sort()
  if (!files.length) throw new Error('В data/ нет файлов .md')
  const result = compileSources(files.map(name => ({ name: basename(name), text: readFileSync(resolve(directory, name), 'utf8') })))
  const json = JSON.stringify(result, null, 2) + '\n'
  writeFileSync(resolve('src/words.json'), json)
  writeFileSync(resolve('server/words.json'), json)
  console.log(`Импортировано: ${result.words.length} уникальных слов, ${result.totalRows} строк, ${files.length} файл(ов).`)
}
