import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMoney, parseSourceText, SOURCE_PARSER_VERSION } from "../lib/source-parser";

const OFFICIAL_PAGE_FIXTURES = [
  {
    sourceId: "daad",
    sourceUrl: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database.pdf",
    excerpt: "Scholarship payments of 992 euros a month. Payments towards health, accident and personal liability insurance cover. Travel allowance. DAAD does not cover tuition fees.",
    expected: ["stipend", "insurance", "travel", "tuition"]
  },
  {
    sourceId: "erasmus-mundus",
    sourceUrl: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters",
    excerpt: "Scholarships cover your participation costs and contribute to travel, visa, and a living allowance.",
    expected: ["tuition", "travel", "visa", "stipend"]
  },
  {
    sourceId: "study-in-japan",
    sourceUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/",
    excerpt: "Scholarship ¥143,000～145,000 per month. Tuition: Exempted. Travel allowance: Round-trip travel expenses provided. Research students You must be under 35 years of age.",
    expected: ["stipend", "tuition", "travel", "eligibility"]
  },
  {
    sourceId: "turkiye-scholarships",
    sourceUrl: "https://www.turkiyeburslari.gov.tr/partneredprograms",
    excerpt: "Students' monthly stipend, tuition fees, health insurance, Turkish language education and flight tickets are covered.",
    expected: ["stipend", "tuition", "insurance", "travel"]
  },
  {
    sourceId: "chevening",
    sourceUrl: "https://www.chevening.org/resource-hub/guidance/eligibility/",
    excerpt: "Have at least two years’ work experience, acquired after completing your undergraduate degree, equivalent to 2,800 hours.",
    expected: ["eligibility"]
  },
  {
    sourceId: "commonwealth",
    sourceUrl: "https://cscuk.fcdo.gov.uk/commonwealth-scholarships-frequently-asked-questions/",
    excerpt: "All Commonwealth Scholarships cover approved tuition fees. CSC will cover airfare, visa costs and a living allowance.",
    expected: ["tuition", "travel", "visa", "stipend"]
  },
  {
    sourceId: "stipendium-hungaricum",
    sourceUrl: "https://stipendiumhungaricum.hu/about/",
    excerpt: "Tuition-free education. Monthly stipend. Accommodation contribution. Medical insurance.",
    expected: ["tuition", "stipend", "housing", "insurance"]
  },
  {
    sourceId: "campus-france",
    sourceUrl: "https://www.canada.campusfrance.org/en/scholarship-programs",
    excerpt: "The grant includes: €1,150/month, tuition fee waiver, health insurance, return plane ticket.",
    expected: ["stipend", "tuition", "insurance", "travel"]
  }
] as const;

test("reviewed official-page fixtures produce expected candidate categories", () => {
  for (const fixture of OFFICIAL_PAGE_FIXTURES) {
    const candidates = parseSourceText({ sourceId: fixture.sourceId, text: fixture.excerpt });
    const found = new Set(candidates.map((candidate) => candidate.factType));
    for (const expectedType of fixture.expected) {
      assert.ok(found.has(expectedType), fixture.sourceId + " should extract " + expectedType);
    }
    assert.ok(candidates.length > 0, fixture.sourceId + " should produce at least one candidate");
    assert.ok(candidates.every((candidate) =>
      candidate.reviewStatus === "needs-review" &&
      candidate.parserVersion === SOURCE_PARSER_VERSION &&
      fixture.excerpt.includes(candidate.excerpt)
    ));
  }
});

test("normalizes explicit currency ranges without collapsing them to one amount", () => {
  assert.deepEqual(normalizeMoney("¥143,000～145,000 per month"), {
    minimum: 143000,
    maximum: 145000,
    currency: "JPY"
  });
  assert.deepEqual(normalizeMoney("USD 1,250 to 1,500"), {
    minimum: 1250,
    maximum: 1500,
    currency: "USD"
  });
  assert.deepEqual(normalizeMoney("992 euros per month"), {
    amount: 992,
    currency: "EUR"
  });
});

test("rejects malformed grouped amounts, reversed ranges, and implicit currencies", () => {
  assert.equal(normalizeMoney("EUR 1,,250"), null);
  assert.equal(normalizeMoney("USD 1,500–1,200"), null);
  assert.equal(normalizeMoney("1,250 per month"), null);
});
