/**
 * Handling seller written text safely.
 *
 * Listing titles, descriptions and item specifics are written by other
 * people. They are DATA. They are never instructions to this application,
 * are never rendered as HTML, and nothing in them can trigger an action.
 * This module is the single place that turns that text into something
 * displayable.
 */

/**
 * Strips markup and collapses whitespace, leaving plain readable text.
 * eBay descriptions are typically a full HTML document with styling.
 */
export function toPlainText(html: string | null | undefined, maxLength = 4000): string {
  if (!html) return '';

  const text = html
    // Remove anything whose contents should never be shown at all.
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Keep paragraph and list breaks as real line breaks.
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    // Decode the handful of entities that actually turn up.
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/** Splits a comma or space separated exclusion list into usable terms. */
export function parseExclusionTerms(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 1)
    .slice(0, 25);
}

/** True when a title contains any excluded term. */
export function matchesExclusion(title: string, terms: string[]): string | null {
  const lower = title.toLowerCase();
  for (const term of terms) {
    if (lower.includes(term)) return term;
  }
  return null;
}
