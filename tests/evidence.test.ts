import test from "node:test";
import assert from "node:assert/strict";
import { classifySourceUrl } from "../lib/source-registry";
import { createEvidenceSnapshot, validateEvidenceDraft, type EvidenceDraft } from "../lib/evidence";

const draft: EvidenceDraft = {
  opportunityId: "opp-1",
  sourceUrl: "https://www.daad.de/en/studying-in-germany/scholarships/",
  factType: "deadline",
  excerpt: "The application deadline is 15 October. Applicants must submit all required documents before the stated date."
};

test("recognizes exact official domains", () => {
  assert.equal(classifySourceUrl("https://daad.de/").trust, "registered-official");
});

test("recognizes real subdomains of registered official domains", () => {
  assert.equal(classifySourceUrl("https://www.daad.de/path").trust, "registered-official");
});

test("does not accept lookalike suffix domains", () => {
  assert.equal(classifySourceUrl("https://daad.de.attacker.example/").trust, "unverified");
  assert.equal(classifySourceUrl("https://notdaad.de/").trust, "unverified");
});

test("rejects insecure URLs and embedded credentials", () => {
  assert.equal(classifySourceUrl("http://daad.de/").trust, "unverified");
  assert.equal(classifySourceUrl("https://user:pass@daad.de/").trust, "unverified");
});

test("requires a registered source and a sufficiently detailed excerpt", () => {
  assert.equal(validateEvidenceDraft({ ...draft, sourceUrl: "https://unknown.example" }) !== null, true);
  assert.equal(validateEvidenceDraft({ ...draft, excerpt: "deadline soon" }) !== null, true);
  assert.equal(validateEvidenceDraft(draft), null);
});

test("creates immutable evidence metadata with a SHA-256 fingerprint", async () => {
  const snapshot = await createEvidenceSnapshot(draft, {
    id: "evidence-1",
    capturedAt: "2026-11-23T00:00:00.000Z"
  });
  assert.equal(snapshot.sourceTrust, "registered-official");
  assert.equal(snapshot.sourceName, "DAAD Scholarship Database");
  assert.equal(snapshot.contentHash.length, 64);
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.excerpt, draft.excerpt);
});
