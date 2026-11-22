import { EVIDENCE_FACT_TYPES, type EvidenceSnapshot } from "./evidence";

export const OPPORTUNITIES_STORAGE_KEY = "scholar-intelligence-opportunities-v1";
export const EVIDENCE_STORAGE_KEY = "scholar-intelligence-evidence-v1";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type BackupFundingClaim = "unknown" | "partial" | "claimed";

export interface BackupOpportunity {
  id: string;
  title: string;
  institution: string;
  field: string;
  deadline: string;
  sourceUrl: string;
  fundingClaim: BackupFundingClaim;
}

export interface LocalBackup {
  schemaVersion: 1;
  exportedAt: string;
  opportunities: BackupOpportunity[];
  evidence: EvidenceSnapshot[];
}

export interface BackupValidation {
  ok: boolean;
  errors: string[];
  backup: LocalBackup | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isOpportunity(value: unknown): value is BackupOpportunity {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 300 &&
    typeof value.institution === "string" && value.institution.trim().length > 0 && value.institution.length <= 300 &&
    typeof value.field === "string" && value.field.length <= 200 &&
    typeof value.deadline === "string" && (value.deadline === "" || /^\d{4}-\d{2}-\d{2}$/.test(value.deadline)) &&
    typeof value.sourceUrl === "string" && isHttpsUrl(value.sourceUrl) &&
    (value.fundingClaim === "unknown" || value.fundingClaim === "partial" || value.fundingClaim === "claimed");
}

function isEvidence(value: unknown): value is EvidenceSnapshot {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 1 &&
    typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.opportunityId === "string" && value.opportunityId.length > 0 &&
    typeof value.sourceUrl === "string" && isHttpsUrl(value.sourceUrl) &&
    typeof value.factType === "string" && EVIDENCE_FACT_TYPES.includes(value.factType as EvidenceSnapshot["factType"]) &&
    typeof value.excerpt === "string" && value.excerpt.length >= 20 && value.excerpt.length <= 12000 &&
    typeof value.capturedAt === "string" && Number.isFinite(Date.parse(value.capturedAt)) &&
    (value.sourceTrust === "registered-official" || value.sourceTrust === "unverified") &&
    (value.sourceName === null || typeof value.sourceName === "string") &&
    typeof value.contentHash === "string" && /^[a-f0-9]{64}$/i.test(value.contentHash);
}

export function validateLocalBackup(value: unknown): BackupValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["ملف النسخة الاحتياطية ليس كائناً صالحاً."], backup: null };
  if (value.schemaVersion !== 1) errors.push("إصدار النسخة الاحتياطية غير مدعوم.");
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) errors.push("تاريخ تصدير النسخة غير صالح.");
  if (!Array.isArray(value.opportunities) || value.opportunities.length > 500) errors.push("قائمة الفرص غير صالحة أو تتجاوز 500 فرصة.");
  if (!Array.isArray(value.evidence) || value.evidence.length > 5000) errors.push("قائمة الأدلة غير صالحة أو تتجاوز 5000 دليل.");

  const opportunities = Array.isArray(value.opportunities) ? value.opportunities : [];
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  const validOpportunities = opportunities.filter(isOpportunity);
  const validEvidence = evidence.filter(isEvidence);
  if (validOpportunities.length !== opportunities.length) errors.push("توجد سجلات فرص ناقصة أو غير صالحة.");
  if (validEvidence.length !== evidence.length) errors.push("توجد سجلات أدلة ناقصة أو غير صالحة.");

  const opportunityIds = new Set(validOpportunities.map((item) => item.id));
  const evidenceIds = new Set<string>();
  const opportunityIdSet = new Set<string>();
  for (const item of validOpportunities) {
    if (opportunityIdSet.has(item.id)) errors.push("توجد معرفات فرص مكررة داخل النسخة.");
    opportunityIdSet.add(item.id);
  }
  for (const item of validEvidence) {
    if (evidenceIds.has(item.id)) errors.push("توجد معرفات أدلة مكررة داخل النسخة.");
    evidenceIds.add(item.id);
    if (!opportunityIds.has(item.opportunityId)) errors.push("يوجد دليل مرتبط بفرصة غير موجودة في النسخة.");
  }

  if (errors.length > 0) return { ok: false, errors, backup: null };
  return {
    ok: true,
    errors: [],
    backup: {
      schemaVersion: 1,
      exportedAt: value.exportedAt as string,
      opportunities: validOpportunities,
      evidence: validEvidence
    }
  };
}

export function parseLocalBackupJson(json: string): BackupValidation {
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES) {
    return { ok: false, errors: ["حجم النسخة الاحتياطية يتجاوز 5 ميغابايت."], backup: null };
  }
  try {
    return validateLocalBackup(JSON.parse(json) as unknown);
  } catch {
    return { ok: false, errors: ["ملف النسخة الاحتياطية ليس JSON صالحاً."], backup: null };
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (isRecord(value)) {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[], label: string): T[] {
  const merged = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    const current = merged.get(item.id);
    if (!current) merged.set(item.id, item);
    else if (stableStringify(current) !== stableStringify(item)) {
      throw new Error("تعارض في معرف " + label + " " + item.id + "؛ لم يتم استبدال أي بيانات.");
    }
  }
  return [...merged.values()];
}

export function mergeLocalBackup(
  existingOpportunities: BackupOpportunity[],
  existingEvidence: EvidenceSnapshot[],
  incoming: LocalBackup
): { opportunities: BackupOpportunity[]; evidence: EvidenceSnapshot[]; addedOpportunities: number; addedEvidence: number } {
  const opportunities = mergeById(existingOpportunities, incoming.opportunities, "الفرصة");
  const evidence = mergeById(existingEvidence, incoming.evidence, "الدليل");
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  if (evidence.some((item) => !opportunityIds.has(item.opportunityId))) {
    throw new Error("توجد أدلة مرتبطة بفرص غير موجودة؛ أوقفنا الاستيراد دون تغيير البيانات.");
  }
  return {
    opportunities,
    evidence,
    addedOpportunities: opportunities.length - existingOpportunities.length,
    addedEvidence: evidence.length - existingEvidence.length
  };
}

export function createLocalBackup(opportunities: BackupOpportunity[], evidence: EvidenceSnapshot[], exportedAt = new Date().toISOString()): LocalBackup {
  const candidate: LocalBackup = { schemaVersion: 1, exportedAt, opportunities, evidence };
  const validation = validateLocalBackup(candidate);
  if (!validation.ok || !validation.backup) {
    throw new Error(validation.errors.join(" "));
  }
  return validation.backup;
}
