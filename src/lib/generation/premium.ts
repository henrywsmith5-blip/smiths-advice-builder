/**
 * Deterministic premium math — NEVER computed by the LLM.
 * All money maths happen here in code.
 */

export interface UIState {
  isPartner: boolean;
  clientAHasExisting: boolean;
  clientBHasExisting: boolean;
  hasExistingCover: boolean; // derived: A || B
}

export interface ClientPremiumData {
  existingAmount: number | null;
  newAmount: number | null;
  frequency: PremiumFrequency;
}

export type PremiumFrequency = "fortnight" | "month" | "year";

export interface PremiumSummary {
  existingTotal: number | null;
  newTotal: number | null;
  delta: number | null;
  deltaLabel: "Increase" | "Savings" | "No change" | null;
  frequency: PremiumFrequency;
  annualExisting: number | null;
  annualNew: number | null;
  annualDelta: number | null;
  annualDeltaLabel: "Increase" | "Savings" | "No change" | null;
  // Formatted strings for template injection
  OLD_PREMIUM: string;
  NEW_PREMIUM: string;
  PREMIUM_CHANGE: string;
  PREMIUM_CHANGE_LABEL: string;
  PREMIUM_FREQUENCY: string;
  MONTHLY_SAVINGS: string;
  ANNUAL_SAVINGS: string;
  ANNUAL_OLD: string;
  ANNUAL_NEW: string;
  ANNUAL_CHANGE: string;
  ANNUAL_CHANGE_LABEL: string;
}

/** Parse a dollar string like "$68.49" or "$5,500/month" into a number */
export function parseDollar(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  // Remove $, commas, spaces, and anything after /
  const cleaned = value.replace(/[,$\s]/g, "").split("/")[0];
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Get the annualisation multiplier for a frequency */
function annualMultiplier(freq: PremiumFrequency): number {
  switch (freq) {
    case "fortnight": return 26;
    case "month": return 12;
    case "year": return 1;
  }
}

/** Format a number as a dollar string */
function fmt(n: number | null): string {
  if (n === null) return "";
  return `$${n.toFixed(2)}`;
}

/** Compute the delta label */
function deltaLabel(delta: number | null): "Increase" | "Savings" | "No change" | null {
  if (delta === null) return null;
  if (delta > 0.005) return "Increase";
  if (delta < -0.005) return "Savings";
  return "No change";
}

const freqLabels: Record<PremiumFrequency, string> = {
  fortnight: "per fortnight",
  month: "per month",
  year: "per year",
};

/**
 * Deterministic premium summary computation.
 * UI state controls which clients' existing premiums count.
 * The LLM NEVER computes these values.
 */
export function computePremiumSummary(
  clientA: ClientPremiumData,
  clientB: ClientPremiumData | null,
  uiState: UIState,
  frequency: PremiumFrequency = "month"
): PremiumSummary {
  // Only count existing premiums for clients whose UI toggle is ON
  let existingTotal: number | null = null;
  if (uiState.hasExistingCover) {
    let total = 0;
    let hasAny = false;
    if (uiState.clientAHasExisting && clientA.existingAmount !== null) {
      total += clientA.existingAmount;
      hasAny = true;
    }
    if (uiState.isPartner && uiState.clientBHasExisting && clientB?.existingAmount !== null) {
      total += clientB?.existingAmount ?? 0;
      hasAny = true;
    }
    existingTotal = hasAny ? total : null;
  }

  // Always sum new premiums
  let newTotal: number | null = null;
  {
    let total = 0;
    let hasAny = false;
    if (clientA.newAmount !== null) {
      total += clientA.newAmount;
      hasAny = true;
    }
    if (uiState.isPartner && clientB?.newAmount !== null) {
      total += clientB?.newAmount ?? 0;
      hasAny = true;
    }
    newTotal = hasAny ? total : null;
  }

  // Compute delta
  const delta = existingTotal !== null && newTotal !== null
    ? newTotal - existingTotal
    : null;

  const dLabel = deltaLabel(delta);

  // Annualise
  const mult = annualMultiplier(frequency);
  const annualExisting = existingTotal !== null ? existingTotal * mult : null;
  const annualNew = newTotal !== null ? newTotal * mult : null;
  const annualDelta = delta !== null ? delta * mult : null;

  return {
    existingTotal,
    newTotal,
    delta,
    deltaLabel: dLabel,
    frequency,
    annualExisting,
    annualNew,
    annualDelta,
    annualDeltaLabel: deltaLabel(annualDelta),
    // Template-ready strings
    OLD_PREMIUM: fmt(existingTotal),
    NEW_PREMIUM: fmt(newTotal),
    PREMIUM_CHANGE: delta !== null ? fmt(Math.abs(delta)) : "",
    PREMIUM_CHANGE_LABEL: dLabel || "",
    PREMIUM_FREQUENCY: freqLabels[frequency],
    MONTHLY_SAVINGS: delta !== null && delta < 0 ? fmt(Math.abs(delta)) : "",
    ANNUAL_SAVINGS: annualDelta !== null && annualDelta < 0 ? fmt(Math.abs(annualDelta)) : "",
    ANNUAL_OLD: fmt(annualExisting),
    ANNUAL_NEW: fmt(annualNew),
    ANNUAL_CHANGE: annualDelta !== null ? fmt(Math.abs(annualDelta)) : "",
    ANNUAL_CHANGE_LABEL: deltaLabel(annualDelta) || "",
  };
}
