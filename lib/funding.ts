export const REQUIRED_FUNDING_CATEGORIES = [
  "tuition",
  "living",
  "housing",
  "insurance",
  "travel",
  "visa",
  "mandatory_fees"
] as const;

export type FundingCategory = (typeof REQUIRED_FUNDING_CATEGORIES)[number];
export type EvidenceStatus = "verified" | "unverified" | "missing";

export interface FundingLine {
  category: FundingCategory;
  currency: string;
  expectedMinorUnits: number | null;
  coveredMinorUnits: number | null;
  evidenceStatus: EvidenceStatus;
}

export type FundingStatus =
  | "fully-funded-confirmed"
  | "partially-funded"
  | "unknown";

export interface FundingEvaluation {
  status: FundingStatus;
  currency: string | null;
  requiredMinorUnits: number | null;
  coveredMinorUnits: number | null;
  uncoveredMinorUnits: number | null;
  missingCategories: FundingCategory[];
  unverifiedCategories: FundingCategory[];
}

/**
 * Deterministic total-cost evaluator.
 * Amounts must be integer minor units in one currency. A missing or unverified
 * mandatory cost/funding component prevents a "fully funded" conclusion.
 */
export function evaluateFunding(lines: FundingLine[]): FundingEvaluation {
  const byCategory = new Map<FundingCategory, FundingLine>();

  for (const line of lines) {
    if (byCategory.has(line.category)) {
      throw new Error(`Duplicate funding category: ${line.category}`);
    }
    if (!line.currency.trim()) {
      throw new Error("Currency is required for every funding line");
    }
    for (const amount of [line.expectedMinorUnits, line.coveredMinorUnits]) {
      if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) {
        throw new RangeError("Funding amounts must be non-negative safe integers");
      }
    }
    byCategory.set(line.category, line);
  }

  const missingCategories = REQUIRED_FUNDING_CATEGORIES.filter((category) => !byCategory.has(category));
  const unverifiedCategories = REQUIRED_FUNDING_CATEGORIES.filter((category) => {
    const line = byCategory.get(category);
    return Boolean(line && (
      line.evidenceStatus !== "verified" ||
      line.expectedMinorUnits === null ||
      line.coveredMinorUnits === null
    ));
  });

  const present = REQUIRED_FUNDING_CATEGORIES
    .map((category) => byCategory.get(category))
    .filter((line): line is FundingLine => Boolean(line));
  const currencies = new Set(present.map((line) => line.currency.toUpperCase()));
  const currency = currencies.size === 1 ? [...currencies][0] : null;

  if (
    missingCategories.length > 0 ||
    unverifiedCategories.length > 0 ||
    currencies.size !== 1 ||
    present.length !== REQUIRED_FUNDING_CATEGORIES.length
  ) {
    return {
      status: "unknown",
      currency,
      requiredMinorUnits: null,
      coveredMinorUnits: null,
      uncoveredMinorUnits: null,
      missingCategories,
      unverifiedCategories
    };
  }

  const requiredMinorUnits = present.reduce((sum, line) => sum + line.expectedMinorUnits!, 0);
  const coveredMinorUnits = present.reduce((sum, line) => sum + line.coveredMinorUnits!, 0);
  const uncoveredMinorUnits = present.reduce(
    (sum, line) => sum + Math.max(0, line.expectedMinorUnits! - line.coveredMinorUnits!),
    0
  );
  if (![requiredMinorUnits, coveredMinorUnits, uncoveredMinorUnits].every(Number.isSafeInteger)) {
    throw new RangeError("Funding totals exceed the safe integer range");
  }

  return {
    status: uncoveredMinorUnits === 0 ? "fully-funded-confirmed" : "partially-funded",
    currency,
    requiredMinorUnits,
    coveredMinorUnits,
    uncoveredMinorUnits,
    missingCategories: [],
    unverifiedCategories: []
  };
}
