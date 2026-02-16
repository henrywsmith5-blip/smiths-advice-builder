/**
 * Partner benefits builder — ensures both clients have entries.
 * If one partner has no IP/MP, their entry shows "N/A".
 */

import type { UIState } from "./premium";

export interface BenefitLine {
  monthlyAmount: string;
  waitPeriod: string;
  benefitPeriod: string;
  premium: string;
}

export interface ClientBenefits {
  name: string;
  ip: BenefitLine;
  mp: BenefitLine;
  hasAnyBenefit: boolean;
}

export interface BenefitsSummary {
  clientA: ClientBenefits;
  clientB: ClientBenefits | null;
  anyBenefitsExist: boolean;
  // Template-ready flat variables
  MP_MONTHLY: string;
  MP_WAIT: string;
  MP_BENEFIT_PERIOD: string;
  MP_PREMIUM: string;
  IP_MONTHLY: string;
  IP_WAIT: string;
  IP_BENEFIT_PERIOD: string;
  IP_PREMIUM: string;
  // Client B (partner only)
  CLIENT_B_MP_MONTHLY: string;
  CLIENT_B_MP_WAIT: string;
  CLIENT_B_MP_BENEFIT_PERIOD: string;
  CLIENT_B_MP_PREMIUM: string;
  CLIENT_B_IP_MONTHLY: string;
  CLIENT_B_IP_WAIT: string;
  CLIENT_B_IP_BENEFIT_PERIOD: string;
  CLIENT_B_IP_PREMIUM: string;
}

const NA_BENEFIT: BenefitLine = {
  monthlyAmount: "N/A",
  waitPeriod: "N/A",
  benefitPeriod: "N/A",
  premium: "N/A",
};

function v(val: string | null | undefined): string {
  return val || "N/A";
}

function hasBenefit(b: BenefitLine): boolean {
  return b.monthlyAmount !== "N/A" || b.waitPeriod !== "N/A" || b.benefitPeriod !== "N/A";
}

export interface RawBenefitInput {
  ip?: { monthlyAmount?: string | null; waitPeriod?: string | null; benefitPeriod?: string | null; premium?: string | null } | null;
  mp?: { monthlyAmount?: string | null; waitPeriod?: string | null; benefitPeriod?: string | null; premium?: string | null } | null;
}

function parseBenefit(raw: RawBenefitInput | null | undefined, type: "ip" | "mp"): BenefitLine {
  const src = type === "ip" ? raw?.ip : raw?.mp;
  if (!src) return { ...NA_BENEFIT };
  return {
    monthlyAmount: v(src.monthlyAmount),
    waitPeriod: v(src.waitPeriod),
    benefitPeriod: v(src.benefitPeriod),
    premium: v(src.premium),
  };
}

export function buildBenefitsSummary(
  clientAName: string,
  clientABenefits: RawBenefitInput | null,
  clientBName: string | null,
  clientBBenefits: RawBenefitInput | null,
  uiState: UIState
): BenefitsSummary {
  const aIp = parseBenefit(clientABenefits, "ip");
  const aMp = parseBenefit(clientABenefits, "mp");
  const aHas = hasBenefit(aIp) || hasBenefit(aMp);

  const clientA: ClientBenefits = {
    name: clientAName || "Client A",
    ip: aIp,
    mp: aMp,
    hasAnyBenefit: aHas,
  };

  let clientB: ClientBenefits | null = null;
  if (uiState.isPartner) {
    const bIp = parseBenefit(clientBBenefits, "ip");
    const bMp = parseBenefit(clientBBenefits, "mp");
    const bHas = hasBenefit(bIp) || hasBenefit(bMp);
    clientB = {
      name: clientBName || "Client B",
      ip: bIp,
      mp: bMp,
      hasAnyBenefit: bHas,
    };
  }

  const anyBenefitsExist = aHas || (clientB?.hasAnyBenefit ?? false);

  return {
    clientA,
    clientB,
    anyBenefitsExist,
    // Client A template vars
    MP_MONTHLY: aMp.monthlyAmount,
    MP_WAIT: aMp.waitPeriod,
    MP_BENEFIT_PERIOD: aMp.benefitPeriod,
    MP_PREMIUM: aMp.premium,
    IP_MONTHLY: aIp.monthlyAmount,
    IP_WAIT: aIp.waitPeriod,
    IP_BENEFIT_PERIOD: aIp.benefitPeriod,
    IP_PREMIUM: aIp.premium,
    // Client B template vars
    CLIENT_B_MP_MONTHLY: clientB?.mp.monthlyAmount ?? "N/A",
    CLIENT_B_MP_WAIT: clientB?.mp.waitPeriod ?? "N/A",
    CLIENT_B_MP_BENEFIT_PERIOD: clientB?.mp.benefitPeriod ?? "N/A",
    CLIENT_B_MP_PREMIUM: clientB?.mp.premium ?? "N/A",
    CLIENT_B_IP_MONTHLY: clientB?.ip.monthlyAmount ?? "N/A",
    CLIENT_B_IP_WAIT: clientB?.ip.waitPeriod ?? "N/A",
    CLIENT_B_IP_BENEFIT_PERIOD: clientB?.ip.benefitPeriod ?? "N/A",
    CLIENT_B_IP_PREMIUM: clientB?.ip.premium ?? "N/A",
  };
}
