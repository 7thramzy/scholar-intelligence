import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFunding, REQUIRED_FUNDING_CATEGORIES, type FundingLine } from "../lib/funding";

function completeFunding(overrides: Partial<FundingLine>[] = []): FundingLine[] {
  return REQUIRED_FUNDING_CATEGORIES.map((category, index) => ({
    category,
    currency: "USD",
    expectedMinorUnits: 10000,
    coveredMinorUnits: 10000,
    evidenceStatus: "verified",
    ...overrides[index]
  }));
}

test("confirms full funding only when every required component is verified and covered", () => {
  const result = evaluateFunding(completeFunding());
  assert.equal(result.status, "fully-funded-confirmed");
  assert.equal(result.uncoveredMinorUnits, 0);
});

test("does not treat a missing mandatory cost as full funding", () => {
  const result = evaluateFunding(completeFunding().slice(1));
  assert.equal(result.status, "unknown");
  assert.deepEqual(result.missingCategories, ["tuition"]);
});

test("labels uncovered mandatory amounts as partial funding", () => {
  const lines = completeFunding();
  lines[0].coveredMinorUnits = 5000;
  const result = evaluateFunding(lines);
  assert.equal(result.status, "partially-funded");
  assert.equal(result.uncoveredMinorUnits, 5000);
});

test("unverified evidence prevents a full-funding conclusion", () => {
  const result = evaluateFunding(completeFunding([{ evidenceStatus: "unverified" }]));
  assert.equal(result.status, "unknown");
  assert.deepEqual(result.unverifiedCategories, ["tuition"]);
});

test("rejects negative or fractional money values", () => {
  assert.throws(
    () => evaluateFunding(completeFunding([{ expectedMinorUnits: -1 }])),
    RangeError
  );
  assert.throws(
    () => evaluateFunding(completeFunding([{ coveredMinorUnits: 1.5 }])),
    RangeError
  );
});

test("does not combine different currencies", () => {
  const lines = completeFunding();
  lines[0].currency = "EUR";
  assert.equal(evaluateFunding(lines).status, "unknown");
});
