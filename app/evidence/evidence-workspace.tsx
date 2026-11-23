"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createEvidenceSnapshot, EVIDENCE_FACT_TYPES, type EvidenceFactType, type EvidenceSnapshot } from "@/lib/evidence";
import { OFFICIAL_SOURCES, type SourceCategory } from "@/lib/source-registry";

type Opportunity = {
  id: string;
  title: string;
  institution: string;
  sourceUrl: string;
};

const OPPORTUNITIES_KEY = "scholar-intelligence-opportunities-v1";
const EVIDENCE_KEY = "scholar-intelligence-evidence-v1";
const FACT_LABELS: Record<EvidenceFactType, string> = {
  deadline: "موعد التقديم",
  tuition: "الرسوم الدراسية",
  stipend: "المخصص المالي",
  living: "تكاليف المعيشة",
  housing: "السكن",
  insurance: "التأمين",
  travel: "السفر",
  visa: "التأشيرة والإقامة",
  "mandatory-fees": "الرسوم الإلزامية",
  eligibility: "الأهلية",
  language: "متطلبات اللغة",
  "program-details": "تفاصيل البرنامج",
  other: "أخرى"
};
const CATEGORY_LABELS: Record<SourceCategory, string> = {
  "scholarship-portal": "بوابة منح",
  government: "جهة حكومية",
  "university-network": "شبكة جامعات",
  "international-program": "برنامج دولي"
};

function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.institution === "string" && typeof item.sourceUrl === "string";
}

function isSnapshot(value: unknown): value is EvidenceSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.schemaVersion === 1 && typeof item.id === "string" &&
    typeof item.opportunityId === "string" && typeof item.sourceUrl === "string" &&
    typeof item.excerpt === "string" && typeof item.contentHash === "string" &&
    typeof item.capturedAt === "string" && typeof item.factType === "string" &&
    typeof item.sourceTrust === "string";
}

export default function EvidenceWorkspace() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [snapshots, setSnapshots] = useState<EvidenceSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [factType, setFactType] = useState<EvidenceFactType>("deadline");
  const [sourceUrl, setSourceUrl] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchingPage, setFetchingPage] = useState(false);
  const [pagePreview, setPagePreview] = useState<{ title: string | null; text: string; contentHash: string; finalUrl: string } | null>(null);

  useEffect(() => {
    try {
      const rawOpportunities = localStorage.getItem(OPPORTUNITIES_KEY);
      const rawEvidence = localStorage.getItem(EVIDENCE_KEY);
      const parsedOpportunities: unknown = rawOpportunities ? JSON.parse(rawOpportunities) : [];
      const parsedEvidence: unknown = rawEvidence ? JSON.parse(rawEvidence) : [];
      const validOpportunities = Array.isArray(parsedOpportunities) ? parsedOpportunities.filter(isOpportunity) : [];
      const validSnapshots = Array.isArray(parsedEvidence) ? parsedEvidence.filter(isSnapshot) : [];
      setOpportunities(validOpportunities);
      setSnapshots(validSnapshots);
      if (validOpportunities[0]) {
        setSelectedId(validOpportunities[0].id);
        setSourceUrl(validOpportunities[0].sourceUrl);
      }
    } catch {
      setError("تعذر قراءة السجل المحلي. لا تحذف بيانات المتصفح قبل أخذ نسخة احتياطية.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const selectedOpportunity = opportunities.find((item) => item.id === selectedId) ?? null;
  const selectedSnapshots = useMemo(
    () => snapshots.filter((item) => item.opportunityId === selectedId).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [snapshots, selectedId]
  );

  function chooseOpportunity(id: string) {
    setSelectedId(id);
    const found = opportunities.find((item) => item.id === id);
    if (found) setSourceUrl(found.sourceUrl);
  }

  async function fetchSourcePage() {
    setError("");
    setFetchingPage(true);
    setPagePreview(null);
    try {
      const response = await fetch("/api/source-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl })
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "تعذر جلب الصفحة الرسمية.";
        throw new Error(message);
      }
      if (!result || typeof result !== "object" || !("text" in result) || typeof result.text !== "string" ||
          !("contentHash" in result) || typeof result.contentHash !== "string" ||
          !("finalUrl" in result) || typeof result.finalUrl !== "string") {
        throw new Error("استجابة المصدر غير مكتملة.");
      }
      setPagePreview({
        title: "title" in result && typeof result.title === "string" ? result.title : null,
        text: result.text,
        contentHash: result.contentHash,
        finalUrl: result.finalUrl
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر جلب الصفحة الرسمية.");
    } finally {
      setFetchingPage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedOpportunity) {
      setError("أضف فرصة أولاً من صفحة الفرص والمنح.");
      return;
    }
    setSaving(true);
    try {
      const snapshot = await createEvidenceSnapshot(
        { opportunityId: selectedId, sourceUrl, factType, excerpt },
        { id: crypto.randomUUID(), capturedAt: new Date().toISOString() }
      );
      const next = [snapshot, ...snapshots];
      localStorage.setItem(EVIDENCE_KEY, JSON.stringify(next));
      setSnapshots(next);
      setExcerpt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء سجل الدليل.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <Link className="workspace-brand" href="/">Scholar <span>INTELLIGENCE</span></Link>
        <Link className="back-link" href="/">العودة إلى لوحة التحكم</Link>
      </header>
      <div className="workspace-content">
        <div className="workspace-heading">
          <div><div className="eyebrow">SOURCE & EVIDENCE REGISTER</div><h1>سجل المصادر والأدلة</h1><p>احفظ مقتطفاً حرفياً من المصدر الرسمي مع رابط وتاريخ وبصمة رقمية.</p></div>
          <div className="workspace-count"><strong>{snapshots.length}</strong><span>دليل محفوظ</span></div>
        </div>

        <div className="local-notice">
          <span className="notice-dot" />
          <div><strong>سجل أدلة محلي غير قابل للتحرير من الواجهة</strong><p>تُضاف الأدلة كسجلات جديدة ولا تُعدّل الأدلة السابقة. لا يوجد جلب آلي للصفحات أو تحقق من صحة محتواها حتى الآن.</p></div>
        </div>

        <section className="source-registry-panel">
          <div className="list-panel-heading"><div><h2>مصادر رسمية مسجلة</h2><p>القائمة أولية وليست شاملة؛ تُستخدم لمطابقة نطاق الرابط فقط.</p></div><span className="list-count">{OFFICIAL_SOURCES.length}</span></div>
          <div className="source-registry-grid">
            {OFFICIAL_SOURCES.map((source) => (
              <article className="source-registry-card" key={source.id}>
                <div className="source-registry-card-head"><h3>{source.name}</h3><span>{CATEGORY_LABELS[source.category]}</span></div>
                <p>{source.description}</p>
                <a href={source.baseUrl} target="_blank" rel="noopener noreferrer">{source.domains[0]} ↗</a>
              </article>
            ))}
          </div>
        </section>

        <div className="evidence-layout">
          <section className="opportunity-form-panel">
            <div className="form-panel-heading"><span className="form-icon">＋</span><div><h2>إضافة دليل جديد</h2><p>انسخ المقتطف من صفحة المصدر كما هو</p></div></div>
            {!loaded ? <p>جارٍ تحميل السجلات…</p> : opportunities.length === 0 ? (
              <div className="empty-opportunities compact-empty"><h3>لا توجد فرص مرتبطة</h3><p>أضف فرصة أولاً، ثم ارجع هنا لتوثيق أدلتها.</p><Link href="/opportunities">الانتقال إلى الفرص والمنح ↗</Link></div>
            ) : (
              <form className="opportunity-form" onSubmit={handleSubmit}>
                <label>الفرصة المرتبطة<select value={selectedId} onChange={(event) => chooseOpportunity(event.target.value)}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.institution}</option>)}</select></label>
                <label>رابط الصفحة الرسمية<input type="url" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setPagePreview(null); }} required /></label>
                <button className="fetch-source-button" type="button" onClick={fetchSourcePage} disabled={fetchingPage}>{fetchingPage ? "جارٍ جلب الصفحة وفحص سياسة الموقع…" : "جلب الصفحة من المصدر الرسمي"}</button>
                {pagePreview && <div className="source-page-preview"><div className="source-preview-heading"><strong>{pagePreview.title ?? "نص الصفحة"}</strong><span>تم الجلب مع احترام robots.txt</span></div><a href={pagePreview.finalUrl} target="_blank" rel="noopener noreferrer">{pagePreview.finalUrl}</a><pre>{pagePreview.text}</pre><div className="source-preview-hash">SHA-256: {pagePreview.contentHash}</div><p>انسخ فقط الفقرة التي تثبت المعلومة المطلوبة والصقها في حقل المقتطف أدناه.</p></div>}
                <label>نوع المعلومة<select value={factType} onChange={(event) => setFactType(event.target.value as EvidenceFactType)}>{EVIDENCE_FACT_TYPES.map((type) => <option key={type} value={type}>{FACT_LABELS[type]}</option>)}</select></label>
                <label>المقتطف النصي من المصدر<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={6} minLength={20} maxLength={12000} placeholder="الصق النص الذي يثبت الموعد أو شرط الأهلية أو عنصر التمويل…" required /></label>
                <p className="evidence-hint">يمكنك حفظ مقتطف يدوي من أي رابط HTTPS. النطاقات المسجلة تُطابق القائمة الرسمية؛ أما غير المسجلة فتُحفظ بصفة غير متحققة. الجلب الآلي يظل محصوراً بالقائمة.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="save-opportunity" type="submit" disabled={saving}>{saving ? "جارٍ إنشاء البصمة…" : "إضافة الدليل إلى السجل"}</button>
              </form>
            )}
          </section>

          <section className="evidence-ledger-panel">
            <div className="list-panel-heading"><div><h2>الأدلة المحفوظة</h2><p>{selectedOpportunity ? selectedOpportunity.title : "اختر فرصة لعرض أدلتها"}</p></div><span className="list-count">{selectedSnapshots.length}</span></div>
            {selectedSnapshots.length === 0 ? <div className="empty-opportunities compact-empty"><h3>لا توجد أدلة لهذه الفرصة</h3><p>أضف أول مقتطف موثق من النموذج.</p></div> : (
              <div className="evidence-snapshot-list">
                {selectedSnapshots.map((snapshot) => (
                  <article className="evidence-snapshot" key={snapshot.id}>
                    <div className="evidence-snapshot-head"><span className="funding-tag">{FACT_LABELS[snapshot.factType as EvidenceFactType] ?? "معلومة أخرى"}</span><time>{new Date(snapshot.capturedAt).toLocaleString("ar")}</time></div>
                    <blockquote>{snapshot.excerpt}</blockquote>
                    <div className="evidence-snapshot-source"><a href={snapshot.sourceUrl} target="_blank" rel="noopener noreferrer">{snapshot.sourceName ?? "المصدر"} ↗</a><span className={snapshot.sourceTrust === "registered-official" ? "verified-source" : "unverified-source"}>{snapshot.sourceTrust === "registered-official" ? "نطاق مسجل" : "نطاق غير مسجل — غير متحقق"}</span></div>
                    <div className="hash-row"><span>SHA-256</span><code>{snapshot.contentHash}</code></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
