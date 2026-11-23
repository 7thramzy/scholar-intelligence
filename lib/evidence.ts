import { classifySourceUrl, type SourceTrust } from "./source-registry";

export const EVIDENCE_FACT_TYPES = [
  "deadline",
  "tuition",
  "stipend",
  "living",
  "housing",
  "insurance",
  "travel",
  "visa",
  "mandatory-fees",
  "eligibility",
  "language",
  "program-details",
  "other"
] as const;

export type EvidenceFactType = (typeof EVIDENCE_FACT_TYPES)[number];

export interface EvidenceDraft {
  opportunityId: string;
  sourceUrl: string;
  factType: EvidenceFactType;
  excerpt: string;
}

export interface EvidenceSnapshot extends EvidenceDraft {
  id: string;
  capturedAt: string;
  sourceTrust: SourceTrust;
  sourceName: string | null;
  contentHash: string;
  schemaVersion: 1;
}

export function normalizeEvidenceExcerpt(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
}

export function validateEvidenceDraft(draft: EvidenceDraft): string | null {
  if (!draft.opportunityId.trim()) return "اختر فرصة مرتبطة بالدليل.";
  const source = classifySourceUrl(draft.sourceUrl.trim());
  if (!source.hostname || source.trust !== "registered-official") {
    return "مصدر الدليل غير موجود في سجل المصادر الرسمية المعتمد.";
  }
  if (!EVIDENCE_FACT_TYPES.includes(draft.factType)) return "نوع الدليل غير صالح.";
  const excerpt = normalizeEvidenceExcerpt(draft.excerpt);
  if (excerpt.length < 20) return "مقتطف الدليل قصير جداً؛ أدخل نصاً كافياً للتحقق.";
  if (excerpt.length > 12000) return "مقتطف الدليل أطول من الحد المسموح (12000 حرف).";
  return null;
}

export async function createEvidenceSnapshot(
  draft: EvidenceDraft,
  options: { id: string; capturedAt: string }
): Promise<EvidenceSnapshot> {
  const error = validateEvidenceDraft(draft);
  if (error) throw new Error(error);

  const source = classifySourceUrl(draft.sourceUrl.trim());
  const normalizedExcerpt = normalizeEvidenceExcerpt(draft.excerpt);
  const canonical = JSON.stringify({
    schemaVersion: 1,
    opportunityId: draft.opportunityId.trim(),
    sourceUrl: draft.sourceUrl.trim(),
    factType: draft.factType,
    excerpt: normalizedExcerpt,
    capturedAt: options.capturedAt
  });
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const contentHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  return {
    schemaVersion: 1,
    id: options.id,
    opportunityId: draft.opportunityId.trim(),
    sourceUrl: draft.sourceUrl.trim(),
    factType: draft.factType,
    excerpt: normalizedExcerpt,
    capturedAt: options.capturedAt,
    sourceTrust: source.trust,
    sourceName: source.matchedSource?.name ?? null,
    contentHash
  };
}
