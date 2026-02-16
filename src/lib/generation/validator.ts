/**
 * Preflight validator — blocks PDF generation if any check fails.
 * Runs AFTER template rendering, BEFORE PDF export.
 */

import type { UIState } from "./premium";
import type { PremiumSummary } from "./premium";
import type { BenefitsSummary } from "./benefits";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function preflightValidate(params: {
  uiState: UIState;
  premiumSummary: PremiumSummary;
  benefitsSummary: BenefitsSummary;
  renderedHtml: string;
  clientAName: string | null;
  clientBName: string | null;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { uiState, premiumSummary, benefitsSummary, renderedHtml, clientAName, clientBName } = params;

  // ── 1. Premium label correctness ──
  if (uiState.hasExistingCover && premiumSummary.delta !== null) {
    if (premiumSummary.delta > 0 && premiumSummary.deltaLabel !== "Increase") {
      errors.push(`Premium increased by ${premiumSummary.PREMIUM_CHANGE} but label is "${premiumSummary.deltaLabel}" — must be "Increase"`);
    }
    if (premiumSummary.delta < 0 && premiumSummary.deltaLabel !== "Savings") {
      errors.push(`Premium decreased by ${premiumSummary.PREMIUM_CHANGE} but label is "${premiumSummary.deltaLabel}" — must be "Savings"`);
    }
    // Check rendered HTML doesn't say "Savings" when delta is positive
    if (premiumSummary.delta > 0 && renderedHtml.includes("Savings")) {
      errors.push("Rendered HTML contains 'Savings' but premium actually increased. This is misleading.");
    }
  }

  // ── 2. Partner completeness ──
  if (uiState.isPartner) {
    if (!clientAName || clientAName === "Client A") {
      warnings.push("Client A name is missing or default. Enter a real name.");
    }
    if (!clientBName || clientBName === "Client B") {
      warnings.push("Client B name is missing or default. Enter a real name.");
    }
  }

  // ── 3. Benefits completeness (partner mode) ──
  if (uiState.isPartner && benefitsSummary.anyBenefitsExist) {
    // If EITHER client has benefits, BOTH must be present in the output
    if (benefitsSummary.clientA.hasAnyBenefit && !benefitsSummary.clientB?.hasAnyBenefit) {
      warnings.push("Client A has IP/MP benefits but Client B has none. Client B will show N/A — confirm this is correct.");
    }
    if (!benefitsSummary.clientA.hasAnyBenefit && benefitsSummary.clientB?.hasAnyBenefit) {
      warnings.push("Client B has IP/MP benefits but Client A has none. Client A will show N/A — confirm this is correct.");
    }
  }

  // ── 4. Unresolved placeholders ──
  const unresolvedMatches = renderedHtml.match(/\{\{[^}]+\}\}/g);
  if (unresolvedMatches) {
    // Filter out Nunjucks comment-like patterns and common false positives
    const real = unresolvedMatches.filter(m =>
      !m.includes("{#") && !m.includes("#}") && !m.includes("{% ")
    );
    if (real.length > 0) {
      const unique = [...new Set(real)].slice(0, 10);
      errors.push(`Unresolved template placeholders: ${unique.join(", ")}`);
    }
  }

  // ── 5. New premium must exist ──
  if (premiumSummary.newTotal === null) {
    warnings.push("No new premium amount found. Premium summary will be empty.");
  }

  // ── 6. Existing premium required when cover toggle is on ──
  if (uiState.hasExistingCover && premiumSummary.existingTotal === null) {
    warnings.push("Existing cover toggled ON but no existing premium found. Premium comparison will be incomplete.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
