import test from "node:test";
import assert from "node:assert/strict";
import { extractPageText, fetchOfficialSourcePage, isAllowedByRobots, parseRobotsRules, SourceFetchError } from "../lib/source-fetch";

test("parses wildcard and named robots groups", () => {
  const rules = parseRobotsRules("User-agent: *\\nDisallow: /private\\nAllow: /private/public\\n\\nUser-agent: OtherBot\\nDisallow: /");
  assert.equal(isAllowedByRobots("/private/secret", rules), false);
  assert.equal(isAllowedByRobots("/private/public/info", rules), true);
  assert.equal(isAllowedByRobots("/open", rules), true);
});

test("extracts a page title and readable text while removing scripts", () => {
  const result = extractPageText("<html><head><title>Scholarship &amp; Study</title><script>ignore me</script></head><body><h1>Funding</h1><p>Full tuition support</p></body></html>", "text/html");
  assert.equal(result.title, "Scholarship & Study");
  assert.match(result.text, /Full tuition support/);
  assert.doesNotMatch(result.text, /ignore me/);
});

test("rejects sources outside the official registry before making requests", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;
  await assert.rejects(() => fetchOfficialSourcePage("https://not-official.example", fakeFetch), SourceFetchError);
  assert.equal(called, false);
});

test("respects robots denial and does not fetch the page", async () => {
  const calls: string[] = [];
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\\nDisallow: /en/studying-in-germany/scholarships/", {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    }
    return new Response("<html><body>Page content</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }) as typeof fetch;

  await assert.rejects(
    () => fetchOfficialSourcePage("https://www.daad.de/en/studying-in-germany/scholarships/", fakeFetch),
    /robots.txt/
  );
  assert.equal(calls.length, 1);
});

test("fetches an allowed official page and returns a fingerprint", async () => {
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response("<html><head><title>DAAD</title></head><body><p>Scholarship applications open now.</p></body></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  }) as typeof fetch;

  const snapshot = await fetchOfficialSourcePage(
    "https://www.daad.de/en/scholarships/",
    fakeFetch,
    () => new Date("2026-11-23T00:00:00.000Z")
  );
  assert.equal(snapshot.sourceId, "daad");
  assert.equal(snapshot.title, "DAAD");
  assert.match(snapshot.text, /Scholarship applications open now/);
  assert.equal(snapshot.contentHash.length, 64);
  assert.equal(snapshot.robotsPolicy, "allowed");
});
