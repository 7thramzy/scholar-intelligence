import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialSourcePage, SourceFetchError } from "@/lib/source-fetch";
import { OFFICIAL_SOURCES } from "@/lib/source-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastDiscoveryAt = 0;
const MIN_DISCOVERY_INTERVAL_MS = 5_000;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1024) {
    return NextResponse.json({ error: "حجم الطلب أكبر من الحد المسموح." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "صيغة الطلب غير صالحة." }, { status: 400 });
  }

  const sourceId = body && typeof body === "object" ? (body as Record<string, unknown>).sourceId : null;
  if (typeof sourceId !== "string" || sourceId.length > 80) {
    return NextResponse.json({ error: "اختر مصدراً رسمياً مسجلاً." }, { status: 400 });
  }
  const source = OFFICIAL_SOURCES.find((item) => item.id === sourceId);
  if (!source) {
    return NextResponse.json({ error: "المصدر غير موجود في السجل الرسمي." }, { status: 404 });
  }

  const now = Date.now();
  if (now - lastDiscoveryAt < MIN_DISCOVERY_INTERVAL_MS) {
    return NextResponse.json({ error: "انتظر قليلاً قبل فحص مصدر آخر." }, { status: 429, headers: { "Retry-After": "5" } });
  }
  lastDiscoveryAt = now;

  try {
    const snapshot = await fetchOfficialSourcePage(source.baseUrl);
    return NextResponse.json({
      sourceId: snapshot.sourceId,
      sourceName: snapshot.sourceName,
      requestedUrl: snapshot.requestedUrl,
      finalUrl: snapshot.finalUrl,
      fetchedAt: snapshot.fetchedAt,
      httpStatus: snapshot.httpStatus,
      contentHash: snapshot.contentHash,
      title: snapshot.title,
      links: snapshot.discoveredLinks
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SourceFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء اكتشاف الفرص." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
