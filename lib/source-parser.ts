import { OFFICIAL_SOURCES } from "./source-registry";
import { EVIDENCE_FACT_TYPES, type EvidenceFactType } from "./evidence";

export const SOURCE_PARSER_VERSION = "0.1.0";
export const MAX_EXTRACTED_FACTS = 100;

export type NormalizedFactValue =
  | { kind: "date"; isoDate: string }
  | { kind: "money"; amount: number; currency: string }
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
  { factType: "insurance", label: "Insurance", pattern: /health insurance|medical insurance|insurance coverage/i, confidence: "high" },
  { factType: "travel", label: "Travel", pattern: /travel allowance|airfare|flight ticket|travel cost|return ticket/i, confidence: "high" },
  { factType: "visa", label: "Visa and residence", pattern: /visa|residence permit|immigration fee/i, confidence: "high" },
  { factType: "mandatory-fees", label: "Mandatory fees", pattern: /mandatory fee|compulsory fee|enrolment fee|registration fee|application fee/i, confidence: "high" },
  { factType: "language", label: "Language requirements", pattern: /language requirement|english proficiency|medium of instruction|\bIELTS\b|\bTOEFL\b|\bDuolingo English Test\b/i, confidence: "high" },
  { factType: "eligibility", label: "Eligibility", pattern: /eligibility|eligible applicants|eligible candidates|who can apply|citizenship requirement|nationality requirement|minimum GPA|academic requirement|entry requirement/i, confidence: "high" },
  { factType: "program-details", label: "Program duration", pattern: /program duration|programme duration|duration of study|study period|degree duration/i, confidence: "medium" },
  { factType: "program-details", label: "Intake", pattern: /application intake|intake|enrolment period|enrollment period|academic year/i, confidence: "medium" }
];

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

export function normalizeMoney(value: string): { amount: number; currency: string } | null {
  const match = value.match(/\b(USD|EUR|GBP|JPY|CNY|RMB|TRY|HUF|CHF|CAD|AUD|SAR|YER)\s*([\d,]+(?:\.\d{1,2})?)|([€£$])\s*([\d,]+(?:\.\d{1,2})?)|\b([\d,]+(?:\.\d{1,2})?)\s*(USD|EUR|GBP|JPY|CNY|RMB|TRY|HUF|CHF|CAD|AUD|SAR|YER)\b/i);
  if (!match) return null;
  const currency = (match[1] ?? match[6] ?? ({ "€": "EUR", "£": "GBP", "$": "USD" } as Record<string, string>)[match[3]] ?? "").toUpperCase();
  const rawAmount = match[2] ?? match[4] ?? match[5];
  const amount = Number(rawAmount.replace(/,/g, ""));
  if (!currency || !Number.isFinite(amount) || amount < 0) return null;
  return { amount, currency: currency === "RMB" ? "CNY" : currency };
}

function normalizeValue(factType: EvidenceFactType, rawValue: string): NormalizedFactValue | null {
  if (factType === "deadline") {
    const isoDate = normalizeDate(rawValue);
    return isoDate ? { kind: "date", isoDate } : null;
  }
  const money = normalizeMoney(rawValue);
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

  for (const segment of segments) {
    for (const rule of LABEL_RULES) {
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
