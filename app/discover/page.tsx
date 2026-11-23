"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OFFICIAL_SOURCES } from "@/lib/source-registry";
import { OPPORTUNITIES_STORAGE_KEY } from "@/lib/local-backup";

type DiscoveredLink = { title: string; url: string; sourceId: string; registered: boolean; relevance: number };
type DiscoveryResult = { sourceId: string; sourceName: string; fetchedAt: string; contentHash: string; links: DiscoveredLink[] };
type Opportunity = { id: string; title: string; institution: string; field: string; deadline: string; sourceUrl: string; fundingClaim: "unknown" };

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function DiscoveryWorkspace() {
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [currentSource, setCurrentSource] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<DiscoveredLink | null>(null);
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [field, setField] = useState("");
  const [deadline, setDeadline] = useState("");

  const links = useMemo(() => {
    const byUrl = new Map<string, DiscoveredLink>();
    for (const result of results) for (const link of result.links) {
      const previous = byUrl.get(link.url);
      if (!previous || link.relevance > previous.relevance) byUrl.set(link.url, link);
    }
    return [...byUrl.values()].sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title));
  }, [results]);

  async function scanOne(sourceId: string) {
    const response = await fetch("/api/source-discover", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId })
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "تعذر فحص المصدر.";
      throw new Error(message);
    }
    if (!payload || typeof payload !== "object" || !("links" in payload) || !Array.isArray(payload.links) ||
      !("sourceId" in payload) || typeof payload.sourceId !== "string" ||
      !("sourceName" in payload) || typeof payload.sourceName !== "string" ||
      !("fetchedAt" in payload) || typeof payload.fetchedAt !== "string" ||
      !("contentHash" in payload) || typeof payload.contentHash !== "string") throw new Error("استجابة الاكتشاف غير مكتملة.");
    const result = payload as DiscoveryResult;
    setResults((current) => [...current.filter((item) => item.sourceId !== result.sourceId), result]);
    return result;
  }

  async function scanAll() {
    setScanning(true); setError(""); setNotice(""); setProgress(0); setResults([]);
    let completed = 0;
    const failures: string[] = [];
    for (const source of OFFICIAL_SOURCES) {
      setCurrentSource(source.name);
      try { await scanOne(source.id); }
      catch (cause) { failures.push(source.name + ": " + (cause instanceof Error ? cause.message : "فشل غير معروف")); }
      completed += 1; setProgress(completed);
      if (completed < OFFICIAL_SOURCES.length) await wait(5_200);
    }
    setCurrentSource(""); setScanning(false);
    setNotice("اكتمل فحص " + completed + " مصادر رسمية. " + (failures.length ? "تعذر فحص " + failures.length + ": " + failures.join("؛ ") : "لم تسجل أخطاء."));
  }

  async function scanSingle(sourceId: string) {
    setScanning(true); setError(""); setNotice("");
    setCurrentSource(OFFICIAL_SOURCES.find((source) => source.id === sourceId)?.name ?? sourceId);
    try {
      const result = await scanOne(sourceId);
      setNotice("تم فحص " + result.sourceName + " والعثور على " + result.links.length + " رابط مرشح.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر فحص المصدر."); }
    finally { setCurrentSource(""); setScanning(false); }
  }

  function chooseLink(link: DiscoveredLink) {
    setSelected(link); setTitle(link.title); setInstitution(""); setField(""); setDeadline(""); setError(""); setNotice("");
  }

  function saveOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!selected || !title.trim() || !institution.trim()) { setError("اسم الفرصة والجامعة أو الجهة مطلوبان قبل الحفظ."); return; }
    try {
      const raw = localStorage.getItem(OPPORTUNITIES_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error("بيانات الفرص المحلية غير صالحة؛ لم يتم تغييرها.");
      const items = parsed as Opportunity[];
      if (items.some((item) => item && item.sourceUrl === selected.url)) { setError("هذا الرابط محفوظ مسبقاً في قائمة الفرص."); return; }
      const opportunity: Opportunity = {
        id: crypto.randomUUID(), title: title.trim(), institution: institution.trim(), field: field.trim(),
        deadline, sourceUrl: selected.url, fundingClaim: "unknown"
      };
      localStorage.setItem(OPPORTUNITIES_STORAGE_KEY, JSON.stringify([opportunity, ...items]));
      setNotice("أضيفت الفرصة إلى قائمتك المحلية بحالة تمويل غير متحقق. راجع صفحتها في سجل الأدلة.");
      setSelected(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ الفرصة."); }
  }

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <Link className="workspace-brand" href="/">Scholar <span>INTELLIGENCE</span></Link>
        <Link className="back-link" href="/">العودة إلى لوحة التحكم</Link>
      </header>
      <div className="workspace-content">
        <div className="workspace-heading">
          <div><div className="eyebrow">OFFICIAL OPPORTUNITY DISCOVERY</div><h1>اكتشاف المنح والبرامج</h1><p>افحص صفحات المصادر الرسمية المسجلة، واكتشف روابط البرامج ذات الصلة، ثم اختر بنفسك ما تريد إضافته إلى قائمتك.</p></div>
          <div className="workspace-count"><strong>{links.length}</strong><span>رابط مرشح</span></div>
        </div>
        <div className="local-notice"><span className="notice-dot" /><div><strong>اكتشاف مقيد بالمصادر الرسمية</strong><p>لا يستخدم محرك بحث خارجي ولا يرسل بياناتك. يفحص صفحة المصدر الرئيسية فقط، ويعرض روابط HTTPS داخل النطاق الرسمي نفسه. ظهور الرابط لا يعني أن البرنامج مفتوح أو مناسب أو ممول بالكامل.</p></div></div>
        <section className="discovery-controls">
          <div className="list-panel-heading"><div><h2>مصادر الاكتشاف</h2><p>ثمانية مصادر رسمية مسجلة — فحص متسلسل لتقليل الضغط على المواقع</p></div><button type="button" className="save-opportunity" onClick={scanAll} disabled={scanning}>{scanning ? "جارٍ الفحص…" : "فحص المصادر الثمانية"}</button></div>
          {scanning && <div className="discovery-progress" role="status"><div><strong>{currentSource}</strong><span>{progress} / {OFFICIAL_SOURCES.length}</span></div><progress max={OFFICIAL_SOURCES.length} value={progress} /></div>}
          <div className="source-registry-grid">
            {OFFICIAL_SOURCES.map((source) => {
              const result = results.find((item) => item.sourceId === source.id);
              return <article className="source-registry-card" key={source.id}>
                <div className="source-registry-card-head"><h3>{source.name}</h3><span>{result ? result.links.length + " رابط" : "لم يُفحص"}</span></div>
                <p>{source.description}</p><button type="button" className="discovery-source-button" disabled={scanning} onClick={() => scanSingle(source.id)}>فحص هذا المصدر</button>
              </article>;
            })}
          </div>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="backup-success" role="status">{notice}</p>}
        <section className="discovery-results">
          <div className="list-panel-heading"><div><h2>الروابط المكتشفة</h2><p>مرتبة بمؤشرات صلة نصية فقط، وليست توصية قبول أو أهلية.</p></div><span className="list-count">{links.length}</span></div>
          {links.length === 0 ? <div className="empty-opportunities"><h3>لا توجد نتائج بعد</h3><p>ابدأ بفحص مصدر واحد أو جميع المصادر. قد لا تحتوي الصفحة الرئيسية على روابط برامج مباشرة.</p></div> :
            <div className="discovery-link-list">{links.map((link) => {
              const source = OFFICIAL_SOURCES.find((item) => item.id === link.sourceId);
              return <article className="discovery-link-card" key={link.url}>
                <div><strong>{link.title}</strong><small>{source?.name ?? link.sourceId} · مؤشر صلة {link.relevance}/6</small><a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a></div>
                <button type="button" className="use-extracted-fact" onClick={() => chooseLink(link)}>مراجعة وإضافة</button>
              </article>;
            })}</div>}
        </section>
        {selected && <section className="discovery-save-panel">
          <div className="list-panel-heading"><div><h2>مراجعة فرصة قبل الحفظ</h2><p>راجع العنوان وأدخل اسم الجامعة أو الجهة من الصفحة الرسمية.</p></div><button type="button" className="cancel-edit-opportunity" onClick={() => setSelected(null)}>إلغاء</button></div>
          <form className="opportunity-form" onSubmit={saveOpportunity}>
            <label>اسم البرنامج أو المنحة<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} /></label>
            <label>الجامعة أو الجهة المانحة<input value={institution} onChange={(event) => setInstitution(event.target.value)} required maxLength={200} placeholder="أدخل الاسم كما يظهر في المصدر" /></label>
            <label>التخصص<input value={field} onChange={(event) => setField(event.target.value)} maxLength={160} placeholder="AI / Computer Science / IT" /></label>
            <label>آخر موعد منشور (اختياري)<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
            <label>رابط المصدر الرسمي<input value={selected.url} readOnly /></label>
            <p className="evidence-hint">لن تُستنتج الجامعة أو التخصص أو الموعد تلقائياً. حالة التمويل ستبقى «غير متحقق» حتى تضيف أدلة وتراجعها.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="save-opportunity">حفظ الفرصة في قائمتي المحلية</button>
          </form>
        </section>}
        <div className="backup-toolbar"><Link href="/opportunities">إدارة الفرص المحفوظة ↗</Link><Link href="/evidence">فتح سجل الأدلة ↗</Link></div>
      </div>
    </main>
  );
}
