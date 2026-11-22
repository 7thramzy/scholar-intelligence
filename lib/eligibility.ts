export type EligibilityComparator = "equals" | "min" | "max" | "one_of";
export type CriterionResult = "pass" | "fail" | "unknown";
export type EligibilityStatus = "eligible" | "ineligible" | "uncertain" | "needs-review";

export interface EligibilityCriterion {
  id: string;
  hard: boolean;
  comparator: EligibilityComparator;
  applicantValue: string | number | null;
  requiredValue: string | number | string[] | null;
}

export interface EvaluatedCriterion extends EligibilityCriterion {
  result: CriterionResult;
}

export interface EligibilityEvaluation {
  status: EligibilityStatus;
  criteria: EvaluatedCriterion[];
}

/** Deterministic evaluator. Unknown data never counts as a pass. */
export function evaluateEligibility(criteria: EligibilityCriterion[]): EligibilityEvaluation {
  if (criteria.length === 0) {
    return { status: "uncertain", criteria: [] };
  }

  const evaluated = criteria.map((criterion): EvaluatedCriterion => ({
    ...criterion,
    result: compareCriterion(criterion)
  }));

  const hardFailure = evaluated.some((item) => item.hard && item.result === "fail");
  const hardUnknown = evaluated.some((item) => item.hard && item.result === "unknown");
  const softFailure = evaluated.some((item) => !item.hard && item.result === "fail");

  const status: EligibilityStatus = hardFailure
    ? "ineligible"
    : hardUnknown
      ? "uncertain"
      : softFailure
        ? "needs-review"
        : "eligible";

  return { status, criteria: evaluated };
}

function compareCriterion(criterion: EligibilityCriterion): CriterionResult {
  const { applicantValue, requiredValue, comparator } = criterion;
  if (applicantValue === null || requiredValue === null) return "unknown";

  switch (comparator) {
    case "equals":
      if (typeof applicantValue !== typeof requiredValue || Array.isArray(requiredValue)) return "unknown";
      if (typeof applicantValue === "string" && typeof requiredValue === "string") {
        return applicantValue.trim().toLocaleLowerCase() === requiredValue.trim().toLocaleLowerCase() ? "pass" : "fail";
      }
      return applicantValue === requiredValue ? "pass" : "fail";
    case "min":
      if (typeof applicantValue !== "number" || typeof requiredValue !== "number" || !Number.isFinite(applicantValue) || !Number.isFinite(requiredValue)) return "unknown";
      return applicantValue >= requiredValue ? "pass" : "fail";
    case "max":
      if (typeof applicantValue !== "number" || typeof requiredValue !== "number" || !Number.isFinite(applicantValue) || !Number.isFinite(requiredValue)) return "unknown";
      return applicantValue <= requiredValue ? "pass" : "fail";
    case "one_of":
      if (typeof applicantValue !== "string" || !Array.isArray(requiredValue)) return "unknown";
      return requiredValue.some((value) => value.toLocaleLowerCase() === applicantValue.trim().toLocaleLowerCase()) ? "pass" : "fail";
    default:
      return "unknown";
  }
}
