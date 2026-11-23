import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialSourcePage, SourceFetchError } from "@/lib/source-fetch";
import { parseSourceText, SOURCE_PARSER_VERSION } from "@/lib/source-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastFetchAt = 0;
const MIN_GLOBAL_INTERVAL_MS = 5_000;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4096) {
    return NextResponse.json({ error: "حجم الطلب أكبر من الحد المسموح." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "صيغة الطلب غير صالحة." }, { status: 400 });
  }

  const url = body && typeof body === "object" ? (body as Record<string, unknown>).url : null;
  if (typeof url !== "string" || url.length > 2048) {
    return NextResponse.json({ error: "أرسل رابطاً واحداً لا يتجاوز 2048 حرفاً." }, { status: 400 });
  }

  const now = Date.now();
  if (now - lastFetchAt < MIN_GLOBAL_INTERVAL_MS) {
    return NextResponse.json({ error: "انتظر قليلاً قبل جلب صفحة أخرى." }, { status: 429, headers: { "Retry-After": "5" } });
  }
  lastFetchAt = now;
  try {
    const snapshot = await fetchOfficialSourcePage(url);
    const extractedFacts = parseSourceText({ sourceId: snapshot.sourceId, text: snapshot.text });
    return NextResponse.json({
      ...snapshot,
      parserVersion: SOURCE_PARSER_VERSION,
      extractedFacts
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SourceFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء جلب المصدر." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
