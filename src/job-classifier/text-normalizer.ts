export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function combineJobText(title: string, description: string): string {
  return normalizeText(`${title} ${description}`);
}

export function hasTerm(text: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => {
    const escapedAlias = normalizeText(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#])${escapedAlias}(?=$|[^a-z0-9+#])`, 'i').test(
      text,
    );
  });
}

export function countTerm(text: string, aliases: readonly string[]): number {
  return aliases.reduce((count, alias) => {
    const normalizedAlias = normalizeText(alias);
    const escapedAlias = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = text.match(
      new RegExp(`(^|[^a-z0-9+#])${escapedAlias}(?=$|[^a-z0-9+#])`, 'gi'),
    );
    return count + (matches?.length ?? 0);
  }, 0);
}
