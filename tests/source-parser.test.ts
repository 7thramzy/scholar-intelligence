import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDate, normalizeMoney, parseSourceText, SOURCE_PARSER_VERSION } from "../lib/source-parser";

test("extracts deadline with normalized ISO date and exact excerpt", () => {
  const [fact] = parseSourceText({ sourceId: "daad", text: "Application deadline: 15 December 2026." });
  assert.equal(fact.factType, "deadline");
  assert.deepEqual(fact.normalizedValue, { kind: "date", isoDate: "2026-12-15" });
  assert.equal(fact.excerpt, "Application deadline: 15 December 2026.");
  assert.equal(fact.reviewStatus, "needs-review");
  assert.equal(fact.parserVersion, SOURCE_PARSER_VERSION);
});

test("normalizes supported money formats without guessing unknown currency", () => {
  assert.deepEqual(normalizeMoney("EUR 1,250 per month"), { amount: 1250, currency: "EUR" });
  assert.deepEqual(normalizeMoney("$2,000"), { amount: 2000, currency: "USD" });
  assert.deepEqual(normalizeMoney("5000 CNY"), { amount: 5000, currency: "CNY" });
  assert.equal(normalizeMoney("1,000 per month"), null);
});

test("extracts funding and eligibility candidates as review-only facts", () => {
  const facts = parseSourceText({
    sourceId: "erasmus-mundus",
    text: "Tuition fee: EUR 4,500 per year.\nMonthly stipend: EUR 1,400.\nEligible applicants: applicants from all countries."
  });
  assert.equal(facts.length, 3);
  assert.equal(facts[0].factType, "tuition");
  assert.deepEqual(facts[0].normalizedValue, { kind: "money", amount: 4500, currency: "EUR" });
  assert.equal(facts[1].factType, "stipend");
  assert.equal(facts[2].factType, "eligibility");
  assert.ok(facts.every((fact) => fact.reviewStatus === "needs-review"));
});

test("rejects unknown sources and ignores unlabelled claims", () => {
  assert.deepEqual(parseSourceText({ sourceId: "unknown", text: "Fully funded scholarship. Deadline: 2030-01-01." }), []);
  assert.deepEqual(parseSourceText({ sourceId: "daad", text: "This is a fully funded scholarship with many benefits." }), []);
});

test("rejects invalid calendar dates and ambiguous numeric dates", () => {
  assert.equal(normalizeDate("31 February 2026"), null);
  assert.equal(normalizeDate("01/02/2027"), null);
  assert.equal(normalizeDate("2027-02-29"), null);
});

test("applies a source-specific Erasmus rule profile", () => {
  const facts = parseSourceText({ sourceId: "erasmus-mundus", text: "Participation costs are covered by the consortium." });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].factType, "tuition");
  assert.equal(facts[0].label, "Erasmus participation costs");
});

test("caps candidate count and source text length", () => {
  const text = Array.from({ length: 150 }, (_, index) => `Application deadline: 15 December 2026 reference ${index}`).join("\n");
  assert.equal(parseSourceText({ sourceId: "chevening", text }).length, 100);
});
