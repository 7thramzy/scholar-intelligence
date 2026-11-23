"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { classifySourceUrl } from "@/lib/source-registry";
import { evaluateDeadline } from "@/lib/deadline";

type Opportunity = {
  id: string;
  title: string;
  institution: string;
  field: string;
  deadline: string;
  sourceUrl: string;
  fundingClaim: "unknown" | "partial" | "claimed";
};
type Evidence = { id: string; opportunityId: string; sourceTrust: "registered-official" | "unverified" };
type FetchHistory = { id: string; opportunityId: string; changedFromPrevious: boolean | null; fetchedAt: string };

const OPPORTUNITIES_KEY = "scholar-intelligence-opportunities-v1";
const EVIDENCE_KEY = "scholar-intelligence-evidence-v1";
const HISTORY_KEY = "scholar-intelligence-fetch-history-v1";
const FUNDING_LABELS = {
  unknown: "غير متحقق",
  partial: "تمويل جزئي",
  claimed: "المصدر يدّعي التمويل الكامل"
};

function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.institution === "string" && typeof item.field === "string" &&
    typeof item.deadline === "string" && typeof item.sourceUrl === "string" &&
    (item.fundingClaim === "unknown" || item.fundingClaim === "partial" || item.fundingClaim === "claimed");
}

export default function OpportunityComparison() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [history, setHistory] = useState<FetchHistory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawOpportunities: unknown = JSON.parse(localStorage.getItem(OPPORTUNITIES_KEY) ?? "[]");
      const rawEvidence: unknown = JSON.parse(localStorage.getItem(EVIDENCE_KEY) ?? "[]");
      const rawHistory: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      const validOpportunities = Array.isArray(rawOpportunities) ? rawOpportunities.filter(isOpportunity) : [];
      setOpportunities(validOpportunities);
      setEvidence(Array.isArray(rawEvidence) ? rawEvidence as Evidence[] : []);
      setHistory(Array.isArray(rawHistory) ? rawHistory as FetchHistory[] : []);
    } catch {
      setOpportunities([]);
      setEvidence([]);
      setHistory([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  const selected = useMemo(
    () => selectedIds.map((id) => opportunities.find((item) => item.id === id)).filter((item): item is Opportunity => Boolean(item)),
    [selectedIds, opportunities]
  );

  function toggleSelection(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  function evidenceCount(id: string) {
    return evidence.filter((item) => item.opportunityId === id).length;
  }

  function officialEvidenceCount(id: string) {
    return evidence.filter((item) => item.opportunityId === id && item.sourceTrust === "registered-official").length;
  }

  function fetchCount(id: string) {
    return history.filter((item) => item.opportunityId === id).length;
  }

  function latestFetch(id: string) {
    return history.filter((item) => item.opportunityId === id).sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0] ?? null;
  }

  function cellValue(item: Opportunity, key: string): ReactNode {
    if (key === "institution") return item.institution;
    if (key === "field") return item.field || "غير محدد";
    if (key === "deadline") {
      const result = evaluateDeadline(item.deadline);
      const label = result.status === "closed" ? "انتهى" : result.status === "closing-soon" ? "قريب" : result.status === "upcoming" ? "قادم" : "غير معروف";
      return <div className="deadline-compare-cell"><span>{item.deadline || "غير محدد"}</span><span className={"deadline-state deadline-" + result.status}>{label}{result.daysRemaining !== null && result.daysRemaining >= 0 ? " · " + result.daysRemaining + " يوم" : ""}</span></div>;
    }
    if (key === "funding") return FUNDING_LABELS[item.fundingClaim];
    if (key === "source") {
      const trust = classifySourceUrl(item.sourceUrl);
      return <span className={trust.trust === "registered-official" ? "compare-trust-good" : "compare-trust-unknown"}>{trust.matchedSource?.name ?? "نطاق غير مسجل — غير متحقق"}</span>;
    }
    if (key === "evidence") return <span>{evidenceCount(item.id)} إجمالي · {officialEvidenceCount(item.id)} نطاق مسجل</span>;
    if (key === "history") {
      const latest = latestFetch(item.id);
      return <span>{fetchCount(item.id)} جلبات{latest ? <small>آخر جلب: {new Date(latest.fetchedAt).toLocaleDateString("ar")}{latest.changedFromPrevious === true ? " · تغيّر" : ""}</small> : null}</span>;
    }
    if (key === "url") return <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">فتح المصدر ↗</a>;
    return "—";
  }

  const rows = [
    ["institution", "الجامعة / الجهة"],
    ["field", "التخصص"],
    ["deadline", "آخر موعد"],
    ["funding", "ادعاء التمويل"],
    ["source", "موثوقية نطاق المصدر"],
    ["evidence", "الأدلة المحفوظة"],
    ["history", "تاريخ جلب المصدر"],
    ["url", "المصدر الأساسي"]
  ] as const;

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <Link className="workspace-brand" href="/">Scholar <span>INTELLIGENCE</span></Link>
        <Link className="back-link" href="/">العودة إلى لوحة التحكم</Link>
      </header>
      <div className="workspace-content">
        <div className="workspace-heading">
          <div><div className="eyebrow">OPPORTUNITY COMPARISON</div><h1>مقارنة الفرص</h1><p>قارن حتى أربع فرص محفوظة جنباً إلى جنب قبل اتخاذ قرار التقديم.</p></div>
          <div className="workspace-count"><strong>{selectedIds.length}/4</strong><span>فرص محددة</span></div>
        </div>
        <div className="local-notice"><span className="notice-dot" /><div><strong>المقارنة تعرض البيانات المثبتة فقط</strong><p>لا يوجد ترتيب تلقائي أو نقاط تقييم. ادعاء التمويل الكامل لا يعني أنه تم التحقق منه، وعدد الأدلة لا يثبت كفايتها.</p></div></div>

        {!loaded ? <div className="empty-opportunities">جارٍ تحميل الفرص…</div> : opportunities.length === 0 ? (
          <div className="empty-opportunities"><h3>لا توجد فرص محفوظة</h3><p>أضف البرامج أولاً حتى تتمكن من مقارنتها.</p><Link href="/opportunities">إضافة فرصة ↗</Link></div>
        ) : (
          <>
            <section className="compare-picker">
              <div className="list-panel-heading"><div><h2>اختر الفرص</h2><p>يمكنك تحديد أربع فرص كحد أقصى</p></div><span className="list-count">{opportunities.length}</span></div>
              <div className="compare-picker-grid">
                {opportunities.map((item) => (
                  <label className={selectedIds.includes(item.id) ? "compare-pick-card selected" : "compare-pick-card"} key={item.id}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} disabled={!selectedIds.includes(item.id) && selectedIds.length >= 4} />
                    <span><strong>{item.title}</strong><small>{item.institution}</small></span>
                  </label>
                ))}
              </div>
            </section>

            {selected.length >= 2 ? (
              <section className="comparison-table-panel">
                <div className="list-panel-heading"><div><h2>جدول المقارنة</h2><p>الحقول غير المتوفرة تظهر بوضوح ولا تُستنتج</p></div><button type="button" onClick={() => setSelectedIds([])}>مسح الاختيار</button></div>
                <div className="comparison-scroll">
                  <table className="comparison-table">
                    <thead><tr><th>المعيار</th>{selected.map((item) => <th key={item.id}>{item.title}</th>)}</tr></thead>
                    <tbody>{rows.map(([key, label]) => <tr key={key}><th>{label}</th>{selected.map((item) => <td key={item.id}>{cellValue(item, key)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </section>
            ) : (
              <div className="empty-comparison"><strong>حدد فرصتين على الأقل لعرض المقارنة</strong><p>يمكنك البدء بفرصتين ثم إضافة ثالثة أو رابعة.</p></div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
