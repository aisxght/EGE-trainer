export function restoreMistakeCounts(value: unknown, validIds: Set<string>): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([id, count]) =>
    validIds.has(id) && typeof count === 'number' && Number.isSafeInteger(count) && count > 0))
}
