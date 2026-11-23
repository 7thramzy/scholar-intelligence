import { classifySourceUrl, type OfficialSource } from "./source-registry";

const USER_AGENT = "ScholarIntelligenceBot/0.1";
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 10_000;

export class SourceFetchError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "SourceFetchError";
  }
}

export interface OfficialPageSnapshot {
  sourceId: string;
  sourceName: string;
  requestedUrl: string;
  finalUrl: string;
  fetchedAt: string;
  httpStatus: number;
  contentType: string;
  title: string | null;
  text: string;
  contentHash: string;
  robotsPolicy: "allowed";
  discoveredLinks: DiscoveredSourceLink[];
}

export interface DiscoveredSourceLink {
  title: string;
  url: string;
  sourceId: string;
  registered: boolean;
  relevance: number;
}

type Fetcher = typeof fetch;
interface FetchResult { response: Response; finalUrl: URL; }

function registeredUrl(value: string, expectedSource?: OfficialSource): { url: URL; source: OfficialSource } {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new SourceFetchError("الرابط غير صالح."); }
  const classification = classifySourceUrl(url.toString());
  if (url.protocol !== "https:" || !classification.matchedSource || url.username || url.password) {
    throw new SourceFetchError("الجلب مسموح فقط لنطاق HTTPS مدرج في سجل المصادر الرسمية.", 403);
  }
  if (expectedSource && classification.matchedSource.id !== expectedSource.id) {
    throw new SourceFetchError("تم رفض إعادة التوجيه إلى نطاق مصدر مختلف.", 403);
  }
  if (url.port && url.port !== "443") throw new SourceFetchError("المنافذ المخصصة غير مسموحة.", 403);
  url.hash = "";
  return { url, source: classification.matchedSource };
}

async function fetchWithSafeRedirects(initialUrl: URL, source: OfficialSource, fetcher: Fetcher, accept: string): Promise<FetchResult> {
  let current = initialUrl;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    registeredUrl(current.toString(), source);
    let response: Response;
    try {
      response = await fetcher(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": USER_AGENT, "Accept": accept }
      });
    } catch {
      throw new SourceFetchError("تعذر الاتصال بالمصدر الرسمي أو انتهت مهلة الطلب.", 502);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) throw new SourceFetchError("أعاد المصدر تحويلاً دون عنوان صالح.", 502);
      if (redirects === MAX_REDIRECTS) throw new SourceFetchError("تجاوز المصدر الحد المسموح لإعادة التوجيه.", 502);
      current = registeredUrl(new URL(location, current).toString(), source).url;
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new SourceFetchError("تعذر إكمال طلب المصدر.", 502);
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SourceFetchError("حجم الصفحة أكبر من الحد المسموح.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export function parseRobotsRules(content: string, agent = "ScholarIntelligenceBot"): Array<{ type: "allow" | "disallow"; path: string }> {
  const groups: Array<{ agents: string[]; rules: Array<{ type: "allow" | "disallow"; path: string }> }> = [];
  let current: { agents: string[]; rules: Array<{ type: "allow" | "disallow"; path: string }> } | null = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current && value) {
      current.rules.push({ type: key, path: value });
    }
  }
  const named = groups.filter((group) => group.agents.includes(agent.toLowerCase()));
  const wildcard = groups.filter((group) => group.agents.includes("*"));
  return (named.length > 0 ? named : wildcard).flatMap((group) => group.rules);
}

function robotsPathMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split("*");
  let cursor = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const found = path.indexOf(part, cursor);
    if (found < 0 || (index === 0 && found !== 0)) return false;
    cursor = found + part.length;
  }
  return !anchored || cursor === path.length;
}

export function isAllowedByRobots(path: string, rules: Array<{ type: "allow" | "disallow"; path: string }>): boolean {
  const matching = rules
    .filter((rule) => robotsPathMatches(rule.path, path))
    .sort((a, b) => b.path.replace(/[*$]/g, "").length - a.path.replace(/[*$]/g, "").length);
  if (matching.length === 0) return true;
  const longest = matching[0].path.replace(/[*$]/g, "").length;
  return matching.filter((rule) => rule.path.replace(/[*$]/g, "").length === longest).some((rule) => rule.type === "allow");
}

function decodeBasicEntities(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function extractPageLinks(content: string, contentType: string, baseUrl: string, source: OfficialSource): DiscoveredSourceLink[] {
  if (!contentType.toLowerCase().includes("html")) return [];
  const seen = new Set<string>();
  const links: DiscoveredSourceLink[] = [];
  const anchorPattern = /<a\\b([^>]*?)href\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))([^>]*)>([\\s\\S]*?)<\\/a>/gi;
  const discoveryTerms = /scholarship|funding|master|graduate|postgraduate|programme|program|study|student|admission|application|apply|degree|eligib/i;
  const priorityTerms = /scholarship|funding|master|graduate|postgraduate|computer science|artificial intelligence|information technology|data science|engineering/i;
  for (const match of content.matchAll(anchorPattern)) {
    const href = match[2] ?? match[3] ?? match[4] ?? "";
    const title = decodeBasicEntities((match[6] ?? "").replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim()).slice(0, 240);
    if (!href || !title || !discoveryTerms.test(title + " " + href)) continue;
    let parsed: URL;
    try { parsed = new URL(decodeBasicEntities(href), baseUrl); } catch { continue; }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) continue;
    if (/\\.(?:pdf|docx?|xlsx?|zip|jpg|jpeg|png)(?:$|\\?)/i.test(parsed.pathname)) continue;
    const host = parsed.hostname.toLowerCase().replace(/\\.$/, "");
    const registered = source.domains.some((domain) => host === domain || host.endsWith("." + domain));
    if (!registered) continue;
    parsed.hash = "";
    const url = parsed.toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const relevance = (priorityTerms.test(title) ? 2 : 0) + (/master|graduate|postgraduate/i.test(title + " " + url) ? 2 : 0) + (/scholarship|funding/i.test(title + " " + url) ? 2 : 0);
    links.push({ title, url, sourceId: source.id, registered: true, relevance });
    if (links.length >= 80) break;
  }
  return links.sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title)).slice(0, 60);
}

export function extractPageText(content: string, contentType: string): { title: string | null; text: string } {
  if (!contentType.toLowerCase().includes("html")) {
    return { title: null, text: content.replace(/\s+/g, " ").trim().slice(0, 30_000) };
  }
  const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeBasicEntities(titleMatch[1].replace(/<[^>]*>/g, "").trim()).slice(0, 300) : null;
  const text = decodeBasicEntities(content
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim().slice(0, 30_000);
  return { title, text };
}

async function fetchRobots(url: URL, source: OfficialSource, fetcher: Fetcher): Promise<string> {
  const { response } = await fetchWithSafeRedirects(new URL("/robots.txt", url.origin), source, fetcher, "text/plain");
  if (response.status === 404 || response.status === 410) return "";
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceFetchError("تعذر التحقق من سياسة robots.txt؛ أوقفنا الجلب احتياطياً.", 503);
  }
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/plain")) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceFetchError("استجابة robots.txt غير صالحة؛ أوقفنا الجلب احتياطياً.", 503);
  }
  return readBoundedText(response, 128_000);
}

export async function fetchOfficialSourcePage(inputUrl: string, fetcher: Fetcher = fetch, now: () => Date = () => new Date()): Promise<OfficialPageSnapshot> {
  const { url, source } = registeredUrl(inputUrl);
  const rules = parseRobotsRules(await fetchRobots(url, source, fetcher));
  if (!isAllowedByRobots(url.pathname + url.search, rules)) {
    throw new SourceFetchError("سياسة robots.txt تمنع جلب هذه الصفحة.", 403);
  }
  const { response, finalUrl } = await fetchWithSafeRedirects(url, source, fetcher, "text/html, application/xhtml+xml, text/plain;q=0.9");
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceFetchError("أعاد المصدر حالة HTTP " + response.status + ".", 502);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
    await response.body?.cancel().catch(() => undefined);
    throw new SourceFetchError("نوع محتوى المصدر غير مدعوم؛ نقبل HTML أو نصاً عادياً فقط.", 415);
  }
  const rawContent = await readBoundedText(response, MAX_BODY_BYTES);
  const { title, text } = extractPageText(rawContent, contentType);
  const discoveredLinks = extractPageLinks(rawContent, contentType, finalUrl.toString(), source);
  if (!text) throw new SourceFetchError("لم نتمكن من استخراج نص قابل للقراءة من الصفحة.", 422);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawContent));
  const contentHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    sourceId: source.id, sourceName: source.name, requestedUrl: url.toString(), finalUrl: finalUrl.toString(),
    fetchedAt: now().toISOString(), httpStatus: response.status, contentType, title, text, contentHash, robotsPolicy: "allowed", discoveredLinks
  };
}
