/**
 * KiwiSaver SOA preflight validation.
 * Returns an array of warning strings. Empty = all good.
 * Only blocks PDF for critical issues (unresolved placeholders).
 */
export function validateKiwisaverHtml(html: string, clientName: string): string[] {
  const warnings: string[] = [];

  // Check for unresolved {{ }} placeholders
  const unresolvedMatches = html.match(/\{\{[^}]+\}\}/g);
  if (unresolvedMatches) {
    const unique = [...new Set(unresolvedMatches)];
    warnings.push(`Unresolved placeholders found: ${unique.join(", ")}`);
  }

  // Check for literal "Client A" or "Client B" strings (should use real names)
  if (/\bClient A\b/.test(html) || /\bClient B\b/.test(html)) {
    warnings.push('Rendered HTML contains literal "Client A" or "Client B" text. Use real client names.');
  }

  // Verify body has production class
  if (!html.includes('class="production') && !html.includes("class='production")) {
    warnings.push('Body tag missing "production" class. Placeholder borders may appear in PDF.');
  }

  // Check client name is present
  if (clientName && !html.includes(clientName)) {
    warnings.push(`Client name "${clientName}" not found in rendered HTML.`);
  }

  return warnings;
}
