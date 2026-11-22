import test from "node:test";
import assert from "node:assert/strict";
import { createLocalBackup, mergeLocalBackup, parseLocalBackupJson, validateLocalBackup } from "../lib/local-backup";
import type { BackupOpportunity } from "../lib/local-backup";
import type { EvidenceSnapshot } from "../lib/evidence";

const opportunity: BackupOpportunity = {
  id: "opp-1",
  title: "MSc Artificial Intelligence",
  institution: "Example University",
  field: "Artificial Intelligence",
  deadline: "2027-01-31",
  sourceUrl: "https://www.daad.de/scholarships/",
  fundingClaim: "claimed"
};

const evidence: EvidenceSnapshot = {
  schemaVersion: 1,
  id: "evidence-1",
  opportunityId: "opp-1",
  sourceUrl: "https://www.daad.de/scholarships/",
  factType: "deadline",
  excerpt: "The application deadline is 31 January 2027 for the next intake.",
  capturedAt: "2026-11-23T00:00:00.000Z",
  sourceTrust: "registered-official",
  sourceName: "DAAD Scholarship Database",
  contentHash: "a".repeat(64)
};

test("creates and parses a valid portable backup", () => {
  const backup = createLocalBackup([opportunity], [evidence], "2026-11-23T00:00:00.000Z");
  const parsed = parseLocalBackupJson(JSON.stringify(backup));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.backup?.opportunities.length, 1);
  assert.equal(parsed.backup?.evidence.length, 1);
});

test("rejects unsupported schema versions and invalid evidence links", () => {
  assert.equal(validateLocalBackup({ schemaVersion: 9, exportedAt: "2026-11-23", opportunities: [], evidence: [] }).ok, false);
  const backup = createLocalBackup([opportunity], [evidence]);
  backup.evidence[0].opportunityId = "missing";
  assert.equal(validateLocalBackup(backup).ok, false);
});

test("rejects non-HTTPS opportunity URLs", () => {
  const backup = createLocalBackup([opportunity], []);
  backup.opportunities[0].sourceUrl = "http://example.com";
  assert.equal(validateLocalBackup(backup).ok, false);
});

test("merges without overwriting existing records", () => {
  const backup = createLocalBackup([opportunity], [evidence]);
  const result = mergeLocalBackup([], [], backup);
  assert.equal(result.addedOpportunities, 1);
  assert.equal(result.addedEvidence, 1);
  const repeated = mergeLocalBackup(result.opportunities, result.evidence, backup);
  assert.equal(repeated.addedOpportunities, 0);
  assert.equal(repeated.addedEvidence, 0);
});

test("rejects conflicting duplicate IDs rather than overwriting local data", () => {
  const backup = createLocalBackup([opportunity], []);
  const conflicting = { ...opportunity, title: "Changed title" };
  assert.throws(() => mergeLocalBackup([conflicting], [], backup), /تعارض/);
});

test("rejects oversized and malformed JSON", () => {
  assert.equal(parseLocalBackupJson("{").ok, false);
  assert.equal(parseLocalBackupJson(" ".repeat(5 * 1024 * 1024 + 1)).ok, false);
});
