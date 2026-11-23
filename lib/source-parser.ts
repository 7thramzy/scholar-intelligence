import { OFFICIAL_SOURCES } from "./source-registry";
import { EVIDENCE_FACT_TYPES, type EvidenceFactType } from "./evidence";

export const SOURCE_PARSER_VERSION = "0.2.0";
export const MAX_EXTRACTED_FACTS = 100;

export type NormalizedFactValue =
  | { kind: "date"; isoDate: string }
  | { kind: "money"; amount: number; currency: string }
  | { kind: "money-range"; minimum: number; maximum: number; currency: string }
  | { kind: "text"; value: string };

export interface ExtractedFact {
  id: string;
  factType: EvidenceFactType;
  label: string;
  rawValue: string;
  normalizedValue: NormalizedFactValue | null;
  excerpt: string;
  confidence: "high" | "medium";
  reviewStatus: "needs-review";
  parserVersion: string;
}

export interface ParseSourceTextInput {
  sourceId: string;
  text: string;
}

const LABEL_RULES: Array<{ factType: EvidenceFactType; label: string; pattern: RegExp; confidence: "high" | "medium" }> = [
  { factType: "deadline", label: "Application deadline", pattern: /application deadline|deadline|apply by|applications close|closing date|last date to apply|submission deadline/i, confidence: "high" },
  { factType: "tuition", label: "Tuition and fees", pattern: /tuition|academic fee|study fee/i, confidence: "high" },
  { factType: "stipend", label: "Stipend", pattern: /stipend|monthly allowance|living allowance|monthly grant/i, confidence: "high" },
  { factType: "living", label: "Living costs", pattern: /living cost|cost of living|subsistence|maintenance allowance/i, confidence: "high" },
  { factType: "housing", label: "Housing", pattern: /housing|accommodation|dormitory|residence hall/i, confidence: "high" },
  { factType: "insurance", label: "Insurance", pattern: /health insurance|medical insurance|insurance coverage|insurance cover/i, confidence: "high" },
  { factType: "travel", label: "Travel", pattern: /travel allowance|airfare|flight ticket|travel cost|return ticket/i, confidence: "high" },
  { factType: "visa", label: "Visa and residence", pattern: /visa|residence permit|immigration fee/i, confidence: "high" },
  { factType: "mandatory-fees", label: "Mandatory fees", pattern: /mandatory fee|compulsory fee|enrolment fee|registration fee|application fee/i, confidence: "high" },
  { factType: "language", label: "Language requirements", pattern: /language requirement|english proficiency|medium of instruction|\bIELTS\b|\bTOEFL\b|\bDuolingo English Test\b/i, confidence: "high" },
  { factType: "eligibility", label: "Eligibility", pattern: /eligibility|eligible applicants|eligible candidates|who can apply|citizenship requirement|nationality requirement|minimum GPA|academic requirement|entry requirement/i, confidence: "high" },
  { factType: "program-details", label: "Program duration", pattern: /program duration|programme duration|duration of study|study period|degree duration/i, confidence: "medium" },
  { factType: "program-details", label: "Intake", pattern: /application intake|intake|enrolment period|enrollment period|academic year/i, confidence: "medium" }
];

const SOURCE_SPECIFIC_RULES: Record<string, Array<{ factType: EvidenceFactType; label: string; pattern: RegExp; confidence: "high" | "medium" }>> = {
  daad: [
    { factType: "eligibility", label: "DAAD academic requirements", pattern: /academic admission requirements|subject-specific requirements/i, confidence: "medium" },
    { factType: "stipend", label: "DAAD scholarship benefits", pattern: /scholarship payments? of?\s*[€£$¥￥]?\s*[\d,]+(?:\.\d{1,2})?\s*(?:euros?|eur)?\s*(?:a|per) month/i, confidence: "medium" }
  ],
  "erasmus-mundus": [
    { factType: "tuition", label: "Erasmus participation costs", pattern: /participation costs|participation fee/i, confidence: "high" },
    { factType: "stipend", label: "Erasmus scholarship amount", pattern: /scholarship amount|individual support/i, confidence: "medium" },
    { factType: "travel", label: "Erasmus travel contribution", pattern: /travel contribution|travel costs|contribute to travel/i, confidence: "high" }
  ],
  "study-in-japan": [
    { factType: "travel", label: "MEXT airfare", pattern: /round-trip airfare|air ticket to japan/i, confidence: "high" },
    { factType: "tuition", label: "MEXT school fees", pattern: /school fees|entrance examination fee/i, confidence: "medium" },
    { factType: "stipend", label: "MEXT monthly scholarship amount", pattern: /scholarship\s*[¥￥]\s*[\d,]+\s*(?:[～~–—-]\s*[¥￥]?\s*[\d,]+)?\s*per month/i, confidence: "high" },
    { factType: "eligibility", label: "MEXT research-student eligibility", pattern: /research students?\s+you must be under\s+\d+\s+years? of age/i, confidence: "high" }
  ],
  "turkiye-scholarships": [
    { factType: "travel", label: "Türkiye Scholarships flight ticket", pattern: /flight ticket|one-off flight/i, confidence: "high" },
    { factType: "housing", label: "Türkiye Scholarships accommodation", pattern: /university dormitory|dormitory accommodation/i, confidence: "medium" }
  ],
  chevening: [
    { factType: "eligibility", label: "Chevening work experience", pattern: /work experience requirement|years of work experience|work experience.{0,140}(?:hours|years)|(?:\d[\d,]*\s+hours).{0,140}work experience/i, confidence: "high" },
    { factType: "travel", label: "Chevening travel costs", pattern: /travel to and from the uk|return flight/i, confidence: "medium" }
  ],
  commonwealth: [
    { factType: "travel", label: "Commonwealth return airfare", pattern: /return airfare|approved return travel/i, confidence: "high" },
    { factType: "living", label: "Commonwealth living allowance", pattern: /approved living allowance|living allowance rate/i, confidence: "high" }
  ],
  "stipendium-hungaricum": [
    { factType: "housing", label: "Stipendium accommodation contribution", pattern: /accommodation contribution|dormitory placement/i, confidence: "high" },
    { factType: "insurance", label: "Stipendium medical coverage", pattern: /medical insurance|health care services/i, confidence: "high" }
  ],
  "campus-france": [
    { factType: "tuition", label: "Campus France tuition exemption", pattern: /tuition fee waiver|tuition fee exemption|exemption from tuition fees/i, confidence: "high" },
    { factType: "travel", label: "Campus France travel support", pattern: /return plane ticket|round-trip airfare|return flight/i, confidence: "high" },
    { factType: "stipend", label: "Campus France monthly grant", pattern: /grant includes?:?\s*[€£$¥]\s*[\d,]+\s*\/\s*month|[€£$¥]\s*[\d,]+\s*\/\s*month/i, confidence: "high" },
    { factType: "insurance", label: "Campus France social protection", pattern: /social security coverage|health protection|health insurance/i, confidence: "medium" }
  ]
};

const MONTHS: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
  apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
  aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10",
  october: "10", nov: "11", november: "11", dec: "12", december: "12"
};

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeDate(value: string): string | null {
  const iso = value.match(/\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dayFirst = value.match(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[,]?\s+(20\d{2})\b/i);
  const monthFirst = value.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase().slice(0, 3)] ?? MONTHS[dayFirst[2].toLowerCase()];
    return validIsoDate(Number(dayFirst[3]), Number(month), Number(dayFirst[1]));
  }
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase().slice(0, 3)] ?? MONTHS[monthFirst[1].toLowerCase()];
    return validIsoDate(Number(monthFirst[3]), Number(month), Number(monthFirst[2]));
  }
  return null;
}

export type NormalizedMoney =
  | { amount: number; currency: string }
  | { minimum: number; maximum: number; currency: string };

const MONEY_CODE_PREFIX = /\b(USD|EUR|GBP|JPY|CNY|RMB|TRY|HUF|CHF|CAD|AUD|SAR|YER)\s*([\d,]+(?:\.\d{1,2})?)(?:\s*(?:-|–|—|~|～|to)\s*([\d,]+(?:\.\d{1,2})?))?/i;
const MONEY_SYMBOL_PREFIX = /([€£$¥￥])\s*([\d,]+(?:\.\d{1,2})?)(?:\s*(?:-|–|—|~|～|to)\s*([\d,]+(?:\.\d{1,2})?))?/i;
const MONEY_CODE_SUFFIX = /\b([\d,]+(?:\.\d{1,2})?)(?:\s*(?:-|–|—|~|～|to)\s*([\d,]+(?:\.\d{1,2})?))?\s*(USD|EUR|GBP|JPY|CNY|RMB|TRY|HUF|CHF|CAD|AUD|SAR|YER)\b/i;
const MONEY_WORD_SUFFIX = /\b([\d,]+(?:\.\d{1,2})?)(?:\s*(?:-|–|—|~|～|to)\s*([\d,]+(?:\.\d{1,2})?))?\s*(euros?|pounds?|yen)\b/i;

function parseAmount(value: string): number | null {
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function normalizeMoney(value: string): NormalizedMoney | null {
  const codePrefix = MONEY_CODE_PREFIX.exec(value);
  const symbolPrefix = MONEY_SYMBOL_PREFIX.exec(value);
  const codeSuffix = MONEY_CODE_SUFFIX.exec(value);
  const wordSuffix = MONEY_WORD_SUFFIX.exec(value);
  const match = codePrefix ?? symbolPrefix ?? codeSuffix ?? wordSuffix;
  if (!match) return null;

  let currency: string;
  let rawMinimum: string;
  let rawMaximum: string | undefined;
  if (codePrefix) {
    currency = codePrefix[1];
    rawMinimum = codePrefix[2];
    rawMaximum = codePrefix[3];
  } else if (symbolPrefix) {
    currency = ({ "€": "EUR", "£": "GBP", "$": "USD", "¥": "JPY", "￥": "JPY" } as Record<string, string>)[symbolPrefix[1]];
    rawMinimum = symbolPrefix[2];
    rawMaximum = symbolPrefix[3];
  } else if (codeSuffix) {
    currency = codeSuffix[3];
    rawMinimum = codeSuffix[1];
    rawMaximum = codeSuffix[2];
  } else {
    const word = wordSuffix![3].toLowerCase();
    currency = word.startsWith("euro") ? "EUR" : word.startsWith("pound") ? "GBP" : "JPY";
    rawMinimum = wordSuffix![1];
    rawMaximum = wordSuffix![2];
  }

  const minimum = parseAmount(rawMinimum);
  if (!currency || minimum === null) return null;
  const normalizedCurrency = currency.toUpperCase() === "RMB" ? "CNY" : currency.toUpperCase();
  if (!rawMaximum) return { amount: minimum, currency: normalizedCurrency };
  const maximum = parseAmount(rawMaximum);
  if (maximum === null || maximum < minimum) return null;
  return { minimum, maximum, currency: normalizedCurrency };
}

function normalizeValue(factType: EvidenceFactType, rawValue: string): NormalizedFactValue | null {
  if (factType === "deadline") {
    const isoDate = normalizeDate(rawValue);
    return isoDate ? { kind: "date", isoDate } : null;
  }
  const money = normalizeMoney(rawValue);
  if (money && "minimum" in money) return { kind: "money-range", ...money };
  if (money) return { kind: "money", ...money };
  const value = rawValue.trim();
  return value ? { kind: "text", value } : null;
}

function cleanValue(line: string, matchIndex: number, labelLength: number): string {
  const tail = line.slice(matchIndex + labelLength).replace(/^\s*[:：–—-]?\s*/, "").trim();
  return tail || line.trim();
}

export function parseSourceText(input: ParseSourceTextInput): ExtractedFact[] {
  if (!OFFICIAL_SOURCES.some((source) => source.id === input.sourceId)) return [];
  const text = input.text.replace(/\r\n?/g, "\n").slice(0, 30_000);
  const segments = text.split(/\n+/).flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z])/)).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  const rules = [...LABEL_RULES, ...(SOURCE_SPECIFIC_RULES[input.sourceId] ?? [])];
  for (const segment of segments) {
    for (const rule of rules) {
      const match = rule.pattern.exec(segment);
      if (!match) continue;
      const excerpt = segment.slice(0, 700);
      const rawValue = cleanValue(segment, match.index, match[0].length).slice(0, 500);
      const key = `${rule.factType}|${excerpt.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({
        id: `candidate-${facts.length + 1}`,
        factType: rule.factType,
        label: rule.label,
        rawValue: rawValue || excerpt,
        normalizedValue: normalizeValue(rule.factType, rawValue || excerpt),
        excerpt,
        confidence: rule.confidence,
        reviewStatus: "needs-review",
        parserVersion: SOURCE_PARSER_VERSION
      });
      if (facts.length >= MAX_EXTRACTED_FACTS) return facts;
    }
  }
  return facts;
}

export function isEvidenceFactType(value: string): value is EvidenceFactType {
  return (EVIDENCE_FACT_TYPES as readonly string[]).includes(value);
}
