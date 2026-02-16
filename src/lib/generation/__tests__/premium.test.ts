/**
 * Daniel & Sophie Carter test fixture
 * Partner + Existing Cover
 * Premiums INCREASED (not savings)
 */

import { computePremiumSummary, parseDollar, type UIState } from "../premium";
import { buildBenefitsSummary } from "../benefits";
import { preflightValidate } from "../validator";

// ── Daniel & Sophie fixture ──
const uiState: UIState = {
  isPartner: true,
  clientAHasExisting: true,
  clientBHasExisting: true,
  hasExistingCover: true,
};

describe("parseDollar", () => {
  test("parses $68.49", () => expect(parseDollar("$68.49")).toBe(68.49));
  test("parses 37.96", () => expect(parseDollar("37.96")).toBe(37.96));
  test("parses $5,500/month", () => expect(parseDollar("$5,500/month")).toBe(5500));
  test("parses number", () => expect(parseDollar(68.49)).toBe(68.49));
  test("parses null", () => expect(parseDollar(null)).toBeNull());
  test("parses undefined", () => expect(parseDollar(undefined)).toBeNull());
  test("parses empty string", () => expect(parseDollar("")).toBeNull());
});

describe("computePremiumSummary — Daniel & Sophie", () => {
  const result = computePremiumSummary(
    { existingAmount: 37.96, newAmount: 68.49, frequency: "fortnight" },
    { existingAmount: 22.68, newAmount: 38.85, frequency: "fortnight" },
    uiState,
    "fortnight"
  );

  test("existing total = 60.64", () => {
    expect(result.existingTotal).toBeCloseTo(60.64, 2);
  });

  test("new total = 107.34", () => {
    expect(result.newTotal).toBeCloseTo(107.34, 2);
  });

  test("delta = +46.70", () => {
    expect(result.delta).toBeCloseTo(46.70, 2);
  });

  test("delta label MUST be 'Increase' (NOT 'Savings')", () => {
    expect(result.deltaLabel).toBe("Increase");
  });

  test("annual existing = 60.64 × 26 = 1576.64", () => {
    expect(result.annualExisting).toBeCloseTo(1576.64, 2);
  });

  test("annual new = 107.34 × 26 = 2790.84", () => {
    expect(result.annualNew).toBeCloseTo(2790.84, 2);
  });

  test("PREMIUM_CHANGE_LABEL = 'Increase'", () => {
    expect(result.PREMIUM_CHANGE_LABEL).toBe("Increase");
  });

  test("MONTHLY_SAVINGS is empty (no savings)", () => {
    expect(result.MONTHLY_SAVINGS).toBe("");
  });

  test("ANNUAL_SAVINGS is empty (no savings)", () => {
    expect(result.ANNUAL_SAVINGS).toBe("");
  });
});

describe("computePremiumSummary — new cover only", () => {
  const newOnlyUI: UIState = {
    isPartner: false,
    clientAHasExisting: false,
    clientBHasExisting: false,
    hasExistingCover: false,
  };

  const result = computePremiumSummary(
    { existingAmount: null, newAmount: 107.34, frequency: "fortnight" },
    null,
    newOnlyUI,
    "fortnight"
  );

  test("existing total is null", () => {
    expect(result.existingTotal).toBeNull();
  });

  test("delta is null", () => {
    expect(result.delta).toBeNull();
  });

  test("delta label is null", () => {
    expect(result.deltaLabel).toBeNull();
  });
});

describe("buildBenefitsSummary — Daniel & Sophie", () => {
  const result = buildBenefitsSummary(
    "Daniel Carter",
    {
      ip: { monthlyAmount: "$5,500", waitPeriod: "4 weeks", benefitPeriod: "To age 65", premium: null },
      mp: { monthlyAmount: "$3,200", waitPeriod: "4 weeks", benefitPeriod: "5 years", premium: null },
    },
    "Sophie Carter",
    {
      ip: { monthlyAmount: "$4,000", waitPeriod: "4 weeks", benefitPeriod: "5 years", premium: null },
      mp: null, // Sophie has NO mortgage protection
    },
    uiState
  );

  test("Client A IP monthly = $5,500", () => {
    expect(result.IP_MONTHLY).toBe("$5,500");
  });

  test("Client A MP monthly = $3,200", () => {
    expect(result.MP_MONTHLY).toBe("$3,200");
  });

  test("Client B IP monthly = $4,000", () => {
    expect(result.CLIENT_B_IP_MONTHLY).toBe("$4,000");
  });

  test("Client B MP monthly = N/A (Sophie has no MP)", () => {
    expect(result.CLIENT_B_MP_MONTHLY).toBe("N/A");
  });

  test("both clients have benefits entries", () => {
    expect(result.clientA).toBeDefined();
    expect(result.clientB).toBeDefined();
  });

  test("any benefits exist = true", () => {
    expect(result.anyBenefitsExist).toBe(true);
  });
});

describe("preflightValidate — premium label correctness", () => {
  const premiumSummary = computePremiumSummary(
    { existingAmount: 37.96, newAmount: 68.49, frequency: "fortnight" },
    { existingAmount: 22.68, newAmount: 38.85, frequency: "fortnight" },
    uiState,
    "fortnight"
  );

  const benefitsSummary = buildBenefitsSummary(
    "Daniel Carter",
    { ip: { monthlyAmount: "$5,500", waitPeriod: "4 weeks", benefitPeriod: "To age 65", premium: null }, mp: { monthlyAmount: "$3,200", waitPeriod: "4 weeks", benefitPeriod: "5 years", premium: null } },
    "Sophie Carter",
    { ip: { monthlyAmount: "$4,000", waitPeriod: "4 weeks", benefitPeriod: "5 years", premium: null }, mp: null },
    uiState
  );

  test("passes validation when premium label is correct", () => {
    const result = preflightValidate({
      uiState,
      premiumSummary,
      benefitsSummary,
      renderedHtml: "<html>Increase $46.70</html>",
      clientAName: "Daniel Carter",
      clientBName: "Sophie Carter",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("FAILS if rendered HTML says 'Savings' when premium increased", () => {
    const result = preflightValidate({
      uiState,
      premiumSummary,
      benefitsSummary,
      renderedHtml: "<html>Savings $46.70</html>",
      clientAName: "Daniel Carter",
      clientBName: "Sophie Carter",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Savings"))).toBe(true);
  });

  test("catches unresolved placeholders", () => {
    const result = preflightValidate({
      uiState,
      premiumSummary,
      benefitsSummary,
      renderedHtml: "<html>{{ MISSING_VAR }} content</html>",
      clientAName: "Daniel Carter",
      clientBName: "Sophie Carter",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Unresolved"))).toBe(true);
  });
});
