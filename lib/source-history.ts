import { classifySourceUrl } from "./source-registry";
import type { OfficialPageSnapshot } from "./source-fetch";

export const FETCH_HISTORY_STORAGE_KEY = "scholar-intelligence-fetch-history-v1";
export const MAX_FETCH_HISTORY_RECORDS = 500;

export interface SourceFetchHistoryRecord {
  id: string;
  opportunityId: string;
  sourceId: string;
  sourceName: string;
  requestedUrl: string;
  finalUrl: string;
  fetchedAt: string;
  httpStatus: number;
  contentType: string;
  title: string | null;
  contentHash: string;
  robotsPolicy: "allowed";
  changedFromPrevious: boolean | null;
}

export function classifyFetchChange(previousHash: string | null, currentHash: string): "first-seen" | "changed" | "unchanged" {
  if (!previousHash) return "first-seen";
  return previousHash === currentHash ? "unchanged" : "changed";
}

export function isSourceFetchHistoryRecord(value: unknown): value is SourceFetchHistoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" || !item.id ||
    typeof item.opportunityId !== "string" || !item.opportunityId ||
    typeof item.sourceId !== "string" || typeof item.sourceName !== "string" ||
    typeof item.requestedUrl !== "string" || typeof item.finalUrl !== "string" ||
    typeof item.fetchedAt !== "string" || !Number.isFinite(Date.parse(item.fetchedAt)) ||
    typeof item.httpStatus !== "number" || !Number.isInteger(item.httpStatus) || item.httpStatus < 200 || item.httpStatus > 299 ||
    typeof item.contentType !== "string" ||
    !(item.title === null || typeof item.title === "string") ||
    typeof item.contentHash !== "string" || !/^[a-f0-9]{64}$/i.test(item.contentHash) ||
    item.robotsPolicy !== "allowed" ||
    !(item.changedFromPrevious === null || typeof item.changedFromPrevious === "boolean")
  ) return false;

  const requested = classifySourceUrl(item.requestedUrl);
  const final = classifySourceUrl(item.finalUrl);
  return requested.trust === "registered-official" &&
    final.trust === "registered-official" &&
    requested.matchedSource?.id === item.sourceId &&
    final.matchedSource?.id === item.sourceId &&
    requested.matchedSource.name === item.sourceName;
}

export function createFetchHistoryRecord(
  snapshot: OfficialPageSnapshot,
  opportunityId: string,
  previousHash: string | null,
  id: string
): SourceFetchHistoryRecord {
  const change = classifyFetchChange(previousHash, snapshot.contentHash);
  const record: SourceFetchHistoryRecord = {
    id,
    opportunityId,
    sourceId: snapshot.sourceId,
    sourceName: snapshot.sourceName,
    requestedUrl: snapshot.requestedUrl,
    finalUrl: snapshot.finalUrl,
    fetchedAt: snapshot.fetchedAt,
    httpStatus: snapshot.httpStatus,
    contentType: snapshot.contentType,
    title: snapshot.title,
    contentHash: snapshot.contentHash,
    robotsPolicy: snapshot.robotsPolicy,
    changedFromPrevious: change === "first-seen" ? null : change === "changed"
  };
  if (!isSourceFetchHistoryRecord(record)) {
    throw new Error("استجابة الجلب لا تطابق سجل المصدر الرسمي المتوقع.");
  }
  return record;
}
