import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility, type EligibilityCriterion } from "../lib/eligibility";

const criterion = (overrides: Partial<EligibilityCriterion> = {}): EligibilityCriterion => ({
  id: "nationality",
  hard: true,
  comparator: "equals",
  applicantValue: "Yemen",
  requiredValue: "Yemen",
  ...overrides
});

test("marks applicant eligible when all supplied criteria pass", () => {
  const result = evaluateEligibility([
    criterion(),
    criterion({ id: "gpa", comparator: "min", applicantValue: 93, requiredValue: 85 })
  ]);
  assert.equal(result.status, "eligible");
});

test("a failed hard requirement makes the applicant ineligible", () => {
  const result = evaluateEligibility([criterion({ requiredValue: "Japan" })]);
  assert.equal(result.status, "ineligible");
});

test("unknown hard data produces an uncertain result", () => {
  const result = evaluateEligibility([criterion({ applicantValue: null })]);
  assert.equal(result.status, "uncertain");
});

test("a failed soft preference requires review, not automatic rejection", () => {
  const result = evaluateEligibility([criterion({ hard: false, requiredValue: "Japan" })]);
  assert.equal(result.status, "needs-review");
});

test("one_of matching is case-insensitive", () => {
  const result = evaluateEligibility([
    criterion({ comparator: "one_of", applicantValue: "english", requiredValue: ["English", "French"] })
  ]);
  assert.equal(result.status, "eligible");
});

test("numeric minimum and maximum comparisons are deterministic", () => {
  assert.equal(evaluateEligibility([criterion({ comparator: "min", applicantValue: 3.6, requiredValue: 3.5 })]).status, "eligible");
  assert.equal(evaluateEligibility([criterion({ comparator: "max", applicantValue: 3.6, requiredValue: 3.5 })]).status, "ineligible");
});

test("empty criteria cannot produce an eligible decision", () => {
  assert.equal(evaluateEligibility([]).status, "uncertain");
});

test("non-finite numeric inputs remain unknown", () => {
  const result = evaluateEligibility([
    criterion({ comparator: "min", applicantValue: Number.NaN, requiredValue: 3.5 })
  ]);
  assert.equal(result.status, "uncertain");
});
