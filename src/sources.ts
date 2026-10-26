export function groupWordSources(sources: { year: string; variant: string }[]) {
  const years = new Map<string, Set<string>>()
  for (const source of sources) {
    const year = source.year || 'Год не указан'
    if (!years.has(year)) years.set(year, new Set())
    if (source.variant) years.get(year)!.add(source.variant)
  }
  return [...years].sort(([a], [b]) => a.localeCompare(b)).map(([year, variants]) => ({
    year,
    variants: [...variants].sort((a, b) => Number(a) - Number(b)),
  }))
}
