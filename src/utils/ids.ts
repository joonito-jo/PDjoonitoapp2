export function nextId(prefix: string, items: { id: string }[]): string {
  const max = items
    .map((item) => Number(String(item.id || '').replace(`${prefix}-`, '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${max + 1}`;
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
