// Answer normalisation shared by every auto-graded exercise.
// IELTS marks spelling but not capitalisation, so answers are compared
// case-insensitively, with typographic variants (curly quotes, dashes) folded.

/** Lower-case, fold typographic characters, trim and collapse spaces, drop a trailing full stop. */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?;,]+$/u, '')
    .trim();
}

/**
 * Counts words the way IELTS word limits do: a hyphenated word is one word,
 * a number written in digits is one word, and "£20" is one word.
 */
export function countWords(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** True when the normalised response equals any of the accepted variants. */
export function matchesAny(response: string, accepted: readonly string[]): boolean {
  const r = normalizeAnswer(response);
  return accepted.some((a) => normalizeAnswer(a) === r);
}
