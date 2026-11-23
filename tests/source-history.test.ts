import test from "node:test";
import assert from "node:assert/strict";
import { classifyFetchChange, createFetchHistoryRecord, isSourceFetchHistoryRecord } from "../lib/source-history";
import type { OfficialPageSnapshot } from "../lib/source-fetch";

const snapshot: OfficialPageSnapshot = {
  sourceId: "daad",
  sourceName: "DAAD Scholarship Database",
  requestedUrl: "https://www.daad.de/scholarships/",
  finalUrl: "https://www.daad.de/scholarships/",
  fetchedAt: "2026-11-23T00:00:00.000Z",
  httpStatus: 200,
  contentType: "text/html; charset=utf-8",
  title: "Scholarships",
  text: "Public scholarship page content",
  contentHash: "a".repeat(64),
  robotsPolicy: "allowed"
};

test("classifies first-seen, changed, and unchanged source content", () => {
  assert.equal(classifyFetchChange(null, "a"), "first-seen");
  assert.equal(classifyFetchChange("a", "b"), "changed");
  assert.equal(classifyFetchChange("a", "a"), "unchanged");
});

test("creates a validated first fetch record", () => {
  const record = createFetchHistoryRecord(snapshot, "opp-1", null, "fetch-1");
  assert.equal(record.changedFromPrevious, null);
  assert.equal(isSourceFetchHistoryRecord(record), true);
});

test("marks a changed page only when the content fingerprint changes", () => {
  const changed = createFetchHistoryRecord({ ...snapshot, contentHash: "b".repeat(64) }, "opp-1", "a".repeat(64), "fetch-2");
  const same = createFetchHistoryRecord(snapshot, "opp-1", "a".repeat(64), "fetch-3");
  assert.equal(changed.changedFromPrevious, true);
  assert.equal(same.changedFromPrevious, false);
});

test("rejects a fetch record whose redirect leaves its registered source", () => {
  const record = createFetchHistoryRecord(snapshot, "opp-1", null, "fetch-4");
  assert.equal(isSourceFetchHistoryRecord({ ...record, finalUrl: "https://attacker.example/" }), false);
});
