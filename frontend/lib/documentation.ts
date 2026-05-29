export function slugifyDocumentationHeading(value: string) {
  return (
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'section'
  );
}

export function getHighlightTerms(value: string) {
  const normalized = value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}
