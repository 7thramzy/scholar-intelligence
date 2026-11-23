import test from "node:test";
import assert from "node:assert/strict";
import { extractPageText, fetchOfficialSourcePage, isAllowedByRobots, parseRobotsRules, SourceFetchError } from "../lib/source-fetch";

test("parses wildcard and named robots groups", () => {
  const rules = parseRobotsRules("User-agent: *\nDisallow: /private\nAllow: /private/public\n\nUser-agent: OtherBot\nDisallow: /");
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

test("rejects redirects to a non-registered host", async () => {
  const fakeFetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/robots.txt")) {
      return new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response(null, { status: 302, headers: { location: "https://attacker.example/collect" } });
  }) as typeof fetch;
  await assert.rejects(
    () => fetchOfficialSourcePage("https://www.daad.de/scholarships", fakeFetch),
    (error: unknown) => error instanceof SourceFetchError && error.statusCode === 403
  );
});

test("respects robots denial and does not fetch the page", async () => {
  const calls: string[] = [];
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\nDisallow: /en/studying-in-germany/scholarships/", {
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
      return new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } });
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

test("rejects redirects from one registered organization to another", async () => {
  const fakeFetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/robots.txt")) {
      return new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response(null, { status: 302, headers: { location: "https://stipendiumhungaricum.hu/" } });
  }) as typeof fetch;
  await assert.rejects(
    () => fetchOfficialSourcePage("https://www.daad.de/scholarships", fakeFetch),
    /نطاق مصدر مختلف/
  );
});


test("extracts only relevant HTTPS links within the same registered official domain", async () => {
  const { extractPageLinks } = await import("../lib/source-fetch");
  const { OFFICIAL_SOURCES } = await import("../lib/source-registry");
  const source = OFFICIAL_SOURCES.find((item) => item.id === "daad");
  assert.ok(source);
  const html = [
    '<a href="/en/studying-in-germany/scholarships/">Scholarship database</a>',
    '<a href="https://www.daad.de/en/study/master-programmes/">Master programmes</a>',
    '<a href="https://attacker.example/scholarship">Scholarship portal</a>',
    '<a href="javascript:alert(1)">Apply scholarship</a>',
    '<a href="https://www.daad.de/files/guide.pdf">Scholarship guide PDF</a>',
    '<a href="https://www.daad.de/en/studying-in-germany/scholarships/">Scholarship database</a>'
  ].join("");
  const links = extractPageLinks(html, "text/html", "https://www.daad.de/en/", source);
  assert.equal(links.length, 2);
  assert.ok(links.every((link) => link.registered && link.sourceId === "daad"));
  assert.ok(links.some((link) => link.title === "Master programmes"));
  assert.ok(links.some((link) => link.url === "https://www.daad.de/en/studying-in-germany/scholarships/"));
});

test("does not discover links from non-HTML pages or anchors without useful labels", async () => {
  const { extractPageLinks } = await import("../lib/source-fetch");
  const { OFFICIAL_SOURCES } = await import("../lib/source-registry");
  const source = OFFICIAL_SOURCES.find((item) => item.id === "daad");
  assert.ok(source);
  assert.deepEqual(extractPageLinks("<a href='/scholarship'> </a>", "text/plain", "https://www.daad.de/", source), []);
  assert.deepEqual(extractPageLinks("<a href='/about'>About us</a>", "text/html", "https://www.daad.de/", source), []);
});
