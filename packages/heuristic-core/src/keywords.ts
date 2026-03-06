/**
 * Bilingual (EN + ZH) keyword lists for difficulty heuristics.
 * Matching is case-insensitive; fullwidth chars are normalized to halfwidth where needed.
 */

/** Phrases that suggest simple intent (must appear with other simple conditions) */
export const SIMPLE_INTENT_PHRASES: string[] = [
  'fix typo',
  'fix a typo',
  '改个 typo',
  '修个变量',
  '改个变量',
  '补全这句',
  '什么意思',
  '简短说',
  'rename',
  'rename variable',
  'rename this',
  'what does this do',
  'brief',
  'short answer',
];

/** Phrases that suggest complex intent (any match can up-tier to complex) */
export const COMPLEX_PHRASES: string[] = [
  'step by step',
  'step-by-step',
  '分析',
  '设计',
  '架构',
  '重构',
  '从零实现',
  '全面',
  'implement from scratch',
  'design the architecture',
  'explain in detail',
  'detailed analysis',
];

/** Single words that block simple (presence in message prevents simple tier) */
export const BLOCK_SIMPLE_WORDS: string[] = [
  '步骤',
  '分析',
  '设计',
  '实现',
  '重构',
  'explain',
  'implement',
  'refactor',
  'design',
  'analyze',
];

/**
 * Normalize string for matching: lowercase, replace fullwidth space and digits with halfwidth.
 */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/\u3000/g, ' ')
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();
}

export function hasSimpleIntent(text: string): boolean {
  const n = normalizeForMatch(text);
  return SIMPLE_INTENT_PHRASES.some((p) => n.includes(normalizeForMatch(p)));
}

export function hasComplexPhrase(text: string): boolean {
  const n = normalizeForMatch(text);
  return COMPLEX_PHRASES.some((p) => n.includes(normalizeForMatch(p)));
}

export function hasBlockSimpleWord(text: string): boolean {
  const n = normalizeForMatch(text);
  const words = n.split(/\s+/);
  return BLOCK_SIMPLE_WORDS.some((w) =>
    words.some((word) => word.includes(normalizeForMatch(w)) || normalizeForMatch(w).split(/\s+/).every((part) => n.includes(part)))
  );
}

/** Check for code block (triple backtick) */
export function hasCodeBlock(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || text.includes('```');
}

/** Rough file path pattern */
export function hasFilePath(text: string): boolean {
  return /[\w\-]+\/[\w\-./]+|\.\w{2,4}\b|[\u4e00-\u9fa5]*\/[\u4e00-\u9fa5\w\-./]+/.test(text);
}

/** Multiple question marks or numbered sub-questions */
export function hasMultipleQuestions(text: string): boolean {
  const qMarks = (text.match(/\?/g) ?? []).length;
  if (qMarks >= 2) return true;
  return /\b[1-3]\s*[.．、]\s*|\b1\s*[.．、]\s*\w+[\s\S]*\b2\s*[.．、]/.test(text);
}
