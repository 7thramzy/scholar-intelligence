import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDeadline } from "../lib/deadline";

test("classifies expired, today, closing-soon and future deadlines", () => {
  assert.deepEqual(evaluateDeadline("2026-11-22", "2026-11-23"), { status: "closed", daysRemaining: -1 });
  assert.deepEqual(evaluateDeadline("2026-11-23", "2026-11-23"), { status: "closing-soon", daysRemaining: 0 });
  assert.deepEqual(evaluateDeadline("2026-12-10", "2026-11-23"), { status: "closing-soon", daysRemaining: 17 });
  assert.deepEqual(evaluateDeadline("2027-02-01", "2026-11-23"), { status: "upcoming", daysRemaining: 70 });
});

test("rejects malformed and impossible dates", () => {
  assert.deepEqual(evaluateDeadline("", "2026-11-23"), { status: "unknown", daysRemaining: null });
  assert.deepEqual(evaluateDeadline("2026-02-30", "2026-11-23"), { status: "unknown", daysRemaining: null });
  assert.deepEqual(evaluateDeadline("2026/11/23", "2026-11-23"), { status: "unknown", daysRemaining: null });
});

test("supports a configurable closing-soon window", () => {
  assert.equal(evaluateDeadline("2026-12-10", "2026-11-23", 10).status, "upcoming");
  assert.equal(evaluateDeadline("2026-12-10", "2026-11-23", 20).status, "closing-soon");
});
