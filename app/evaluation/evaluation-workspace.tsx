"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { evaluateEligibility, type EligibilityComparator, type EligibilityCriterion, type EligibilityEvaluation } from "@/lib/eligibility";
import { evaluateFunding, REQUIRED_FUNDING_CATEGORIES, type FundingCategory, type FundingEvaluation, type FundingLine } from "@/lib/funding";
import type { EvidenceFactType, EvidenceSnapshot } from "@/lib/evidence";

type Opportunity = { id: string; title: string; institution: string; sourceUrl: string };
type FundingInput = { expected: string; covered: string };
type CriterionDraft = {
  id: string;
  label: string;
  hard: boolean;
  comparator: EligibilityComparator;
  applicantValue: string;
  requiredValue: string;
  evidenceId: string;
};

const OPPORTUNITIES_KEY = "scholar-intelligence-opportunities-v1";
const EVIDENCE_KEY = "scholar-intelligence-evidence-v1";
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CNY", "SAR", "YER", "TRY"] as const;

const CATEGORY_LABELS: Record<FundingCategory, string> = {
  tuition: "الرسوم الدراسية",
  living: "تكاليف المعيشة",
  housing: "السكن",
  insurance: "التأمين الصحي",
  travel: "السفر",
  visa: "التأشيرة والإقامة",
  mandatory_fees: "الرسوم الإلزامية"
};

const CATEGORY_EVIDENCE: Record<FundingCategory, EvidenceFactType[]> = {
  tuition: ["tuition"],
  living: ["living", "stipend"],
  housing: ["housing"],
  insurance: ["insurance"],
  travel: ["travel"],
  visa: ["visa"],
  mandatory_fees: ["mandatory-fees"]
};

const emptyCriterion = (): Omit<CriterionDraft, "id"> => ({
  label: "",
  hard: true,
  comparator: "equals",
  applicantValue: "",
  requiredValue: "",
  evidenceId: ""
});

function emptyFundingInputs(): Record<FundingCategory, FundingInput> {
  return Object.fromEntries(REQUIRED_FUNDING_CATEGORIES.map((category) => [category, { expected: "", covered: "" }])) as Record<FundingCategory, FundingInput>;
}

function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.institution === "string" && typeof item.sourceUrl === "string";
}

function isEvidenceSnapshot(value: unknown): value is EvidenceSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.schemaVersion === 1 && typeof item.id === "string" &&
    typeof item.opportunityId === "string" && typeof item.sourceUrl === "string" &&
    typeof item.factType === "string" && typeof item.excerpt === "string" &&
    typeof item.capturedAt === "string" && typeof item.contentHash === "string";
}

function parseAmount(value: string): { amount: number | null; error: boolean } {
  const normalized = value.trim();
  if (!normalized) return { amount: null, error: false };
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(normalized)) return { amount: null, error: true };
  const amount = Number(normalized);
  const minorUnits = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(minorUnits)) return { amount: null, error: true };
  return { amount: minorUnits, error: false };
}

function formatMoney(minorUnits: number | null, currency: string): string {
  if (minorUnits === null) return "غير متاح";
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(minorUnits / 100);
}

function eligibilityStatusLabel(status: EligibilityEvaluation["status"]): string {
  return {
    eligible: "مستوفٍ للشروط المدخلة",
    ineligible: "يوجد شرط إلزامي غير مستوفى",
    uncertain: "البيانات غير كافية للحسم",
    "needs-review": "راجع التفضيلات أو الشروط غير الإلزامية"
  }[status];
}

function fundingStatusLabel(status: FundingEvaluation["status"]): string {
  return {
    "fully-funded-confirmed": "تغطية كاملة بحسب الأدلة التي راجعتها",
    "partially-funded": "تمويل جزئي — توجد تكاليف غير مغطاة",
    unknown: "لا يمكن تأكيد التمويل حالياً"
  }[status];
}

export default function EvaluationWorkspace() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [evidence, setEvidence] = useState<EvidenceSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [fundingInputs, setFundingInputs] = useState<Record<string, Record<FundingCategory, FundingInput>>>({});
  const [fundingCurrency, setFundingCurrency] = useState<Record<string, string>>({});
  const [reviewedEvidence, setReviewedEvidence] = useState<Record<string, Partial<Record<FundingCategory, boolean>>>>({});
  const [fundingResults, setFundingResults] = useState<Record<string, FundingEvaluation>>({});

  const [criteria, setCriteria] = useState<Record<string, CriterionDraft[]>>({});
  const [criterionForm, setCriterionForm] = useState(emptyCriterion());
  const [eligibilityResults, setEligibilityResults] = useState<Record<string, EligibilityEvaluation>>({});

  useEffect(() => {
    try {
      const rawOpportunities = localStorage.getItem(OPPORTUNITIES_KEY);
      const rawEvidence = localStorage.getItem(EVIDENCE_KEY);
      const parsedOpportunities: unknown = rawOpportunities ? JSON.parse(rawOpportunities) : [];
      const parsedEvidence: unknown = rawEvidence ? JSON.parse(rawEvidence) : [];
      const validOpportunities = Array.isArray(parsedOpportunities) ? parsedOpportunities.filter(isOpportunity) : [];
      const validEvidence = Array.isArray(parsedEvidence) ? parsedEvidence.filter(isEvidenceSnapshot) : [];
      setOpportunities(validOpportunities);
      setEvidence(validEvidence);
      if (validOpportunities[0]) setSelectedId(validOpportunities[0].id);
    } catch {
      setError("تعذر قراءة البيانات المحلية لهذا المتصفح.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setCriterionForm(emptyCriterion());
    setError("");
  }, [selectedId]);

  const selectedOpportunity = opportunities.find((item) => item.id === selectedId) ?? null;
  const selectedEvidence = evidence.filter((item) => item.opportunityId === selectedId);
  const currentFundingInputs = fundingInputs[selectedId] ?? emptyFundingInputs();
  const currentCurrency = fundingCurrency[selectedId] ?? "USD";
  const currentCriteria = criteria[selectedId] ?? [];
  const fundingResult = fundingResults[selectedId];
  const eligibilityResult = eligibilityResults[selectedId];
  const eligibleEvidence = selectedEvidence.filter((item) => ["eligibility", "language", "program-details"].includes(item.factType));

  function updateFunding(category: FundingCategory, field: keyof FundingInput, value: string) {
    setFundingInputs((current) => ({
      ...current,
      [selectedId]: {
        ...(current[selectedId] ?? emptyFundingInputs()),
        [category]: { ...(current[selectedId] ?? emptyFundingInputs())[category], [field]: value }
      }
    }));
    setFundingResults((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
  }

  function evaluateFundingForSelected() {
    setError("");
    if (!selectedOpportunity) return;
    try {
      const lines: FundingLine[] = REQUIRED_FUNDING_CATEGORIES.map((category) => {
        const input = currentFundingInputs[category];
        const expected = parseAmount(input.expected);
        const covered = parseAmount(input.covered);
        if (expected.error || covered.error) throw new Error("أدخل مبالغ موجبة أو صفراً وبحد أقصى منزلتين عشريتين.");
        const evidenceForCategory = selectedEvidence.filter((item) => CATEGORY_EVIDENCE[category].includes(item.factType as EvidenceFactType));
        const reviewed = reviewedEvidence[selectedId]?.[category] === true;
        return {
          category,
          currency: currentCurrency,
          expectedMinorUnits: expected.amount,
          coveredMinorUnits: covered.amount,
          evidenceStatus: evidenceForCategory.length === 0 ? "missing" : reviewed ? "verified" : "unverified"
        };
      });
      setFundingResults((current) => ({ ...current, [selectedId]: evaluateFunding(lines) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تقييم التمويل.");
    }
  }

  function addCriterion() {
    setError("");
    if (!criterionForm.label.trim() || !criterionForm.requiredValue.trim() || !criterionForm.evidenceId) {
      setError("أدخل اسم الشرط والقيمة المطلوبة واختر دليلاً من المصدر.");
      return;
    }
    const requiredValue = criterionForm.comparator === "one_of"
      ? criterionForm.requiredValue.split(",").map((item) => item.trim()).filter(Boolean)
      : criterionForm.comparator === "min" || criterionForm.comparator === "max"
        ? Number(criterionForm.requiredValue)
        : criterionForm.requiredValue.trim();
    if ((criterionForm.comparator === "min" || criterionForm.comparator === "max") && !Number.isFinite(requiredValue as number)) {
      setError("قيمة الشرط الرقمي غير صالحة.");
      return;
    }
    if (criterionForm.comparator === "one_of" && (requiredValue as string[]).length === 0) {
      setError("أدخل خياراً واحداً على الأقل.");
      return;
    }
    const nextCriterion: CriterionDraft = {
      ...criterionForm,
      id: "criterion-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      label: criterionForm.label.trim(),
      requiredValue: criterionForm.requiredValue.trim()
    };
    setCriteria((current) => ({ ...current, [selectedId]: [...(current[selectedId] ?? []), nextCriterion] }));
    setEligibilityResults((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
    setCriterionForm(emptyCriterion());
  }

  function evaluateEligibilityForSelected() {
    if (!selectedOpportunity) return;
    const mapped: EligibilityCriterion[] = currentCriteria.map((item) => {
      const requiredValue = item.comparator === "one_of"
        ? item.requiredValue.split(",").map((value) => value.trim()).filter(Boolean)
        : item.comparator === "min" || item.comparator === "max"
          ? Number(item.requiredValue)
          : item.requiredValue;
      const applicantValue = item.applicantValue.trim() === ""
        ? null
        : item.comparator === "min" || item.comparator === "max"
          ? Number(item.applicantValue)
          : item.applicantValue.trim();
      return { id: item.label, hard: item.hard, comparator: item.comparator, applicantValue, requiredValue };
    });
    setEligibilityResults((current) => ({ ...current, [selectedId]: evaluateEligibility(mapped) }));
  }

  function removeCriterion(id: string) {
    setCriteria((current) => ({ ...current, [selectedId]: (current[selectedId] ?? []).filter((item) => item.id !== id) }));
    setEligibilityResults((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
  }

  function updateApplicantValue(id: string, value: string) {
    setCriteria((current) => ({
      ...current,
      [selectedId]: (current[selectedId] ?? []).map((item) => item.id === id ? { ...item, applicantValue: value } : item)
    }));
    setEligibilityResults((current) => {
      const next = { ...current };
      delete next[selectedId];
      return next;
    });
  }

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <Link className="workspace-brand" href="/">Scholar <span>INTELLIGENCE</span></Link>
        <Link className="back-link" href="/">العودة إلى لوحة التحكم</Link>
      </header>
      <div className="workspace-content">
        <div className="workspace-heading">
          <div><div className="eyebrow">DETERMINISTIC EVALUATION</div><h1>تقييم الأهلية والتمويل</h1><p>حسابات حتمية مبنية على شروط الفرصة والأدلة التي راجعتها، لا على تخمين نموذج ذكاء اصطناعي.</p></div>
          <div className="workspace-count"><strong>{selectedEvidence.length}</strong><span>دليل مرتبط</span></div>
        </div>

        <div className="local-notice"><span className="notice-dot" /><div><strong>التقييم لا يحفظ بياناتك الشخصية</strong><p>قيم المتقدم التي تدخلها تبقى في ذاكرة الصفحة الحالية فقط، ولا تُكتب في localStorage. تكاليف الفرصة أيضاً مؤقتة في هذه النسخة.</p></div></div>

        {!loaded ? <div className="empty-opportunities">جارٍ تحميل البيانات…</div> : opportunities.length === 0 ? (
          <div className="empty-opportunities"><h3>أضف فرصة أولاً</h3><p>التقييم يحتاج برنامجاً محفوظاً وأدلة مرتبطة به.</p><Link href="/opportunities">الانتقال إلى الفرص والمنح ↗</Link></div>
        ) : (
          <>
            <section className="evaluation-selector">
              <label>الفرصة المراد تقييمها<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.institution}</option>)}</select></label>
              {selectedOpportunity && <a href={selectedOpportunity.sourceUrl} target="_blank" rel="noopener noreferrer">فتح المصدر الأساسي ↗</a>}
            </section>

            <div className="evaluation-grid">
              <section className="evaluation-panel">
                <div className="evaluation-panel-heading"><div><span className="eyebrow">TOTAL COST COVERAGE</span><h2>تحليل التمويل الكامل</h2></div><span className="evaluation-icon">◈</span></div>
                <p className="evaluation-intro">أدخل إجمالي تكلفة البرنامج كاملاً، وليس التكلفة الشهرية. العملة واحدة لجميع البنود، ولا نجمع عملات مختلفة.</p>
                <label className="currency-select">العملة<select value={currentCurrency} onChange={(event) => { setFundingCurrency((current) => ({ ...current, [selectedId]: event.target.value })); setFundingResults((current) => { const next = { ...current }; delete next[selectedId]; return next; }); }}>{CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
                <div className="funding-input-table">
                  <div className="funding-input-head"><span>عنصر التكلفة</span><span>التكلفة الكلية</span><span>المغطى بالمنحة</span></div>
                  {REQUIRED_FUNDING_CATEGORIES.map((category) => {
                    const supporting = selectedEvidence.filter((item) => CATEGORY_EVIDENCE[category].includes(item.factType as EvidenceFactType));
                    const reviewed = reviewedEvidence[selectedId]?.[category] === true;
                    return (
                      <div className="funding-input-row" key={category}>
                        <div className="funding-category-name"><strong>{CATEGORY_LABELS[category]}</strong><small>{supporting.length ? supporting.length + " دليل مرتبط" : "لا يوجد دليل محفوظ"}</small></div>
                        <input type="number" min="0" step="0.01" value={currentFundingInputs[category].expected} onChange={(event) => updateFunding(category, "expected", event.target.value)} placeholder="0.00" aria-label={"إجمالي " + CATEGORY_LABELS[category]} />
                        <input type="number" min="0" step="0.01" value={currentFundingInputs[category].covered} onChange={(event) => updateFunding(category, "covered", event.target.value)} placeholder="0.00" aria-label={"المغطى من " + CATEGORY_LABELS[category]} />
                        <div className="funding-evidence-review">
                          <label><input type="checkbox" checked={reviewed} disabled={supporting.length === 0} onChange={(event) => { setReviewedEvidence((current) => ({ ...current, [selectedId]: { ...(current[selectedId] ?? {}), [category]: event.target.checked } })); setFundingResults((current) => { const next = { ...current }; delete next[selectedId]; return next; }); }} /> راجعت الدليل</label>
                          {supporting.slice(0, 2).map((item) => <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName ?? "المصدر"} · {new Date(item.capturedAt).toLocaleDateString("ar")} ↗</a>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="evaluation-footnote">لا يُعتبر البند موثقاً لمجرد إدخال مبلغ. يجب وجود مقتطف مرتبط به، ثم تأكيدك أنك راجعته. هذا تأكيد يدوي وليس تدقيقاً مستقلاً من الجهة المانحة.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="save-opportunity" type="button" onClick={evaluateFundingForSelected}>احسب تغطية التمويل</button>
                {fundingResult && (
                  <div className={"evaluation-result result-" + fundingResult.status}>
                    <strong>{fundingStatusLabel(fundingResult.status)}</strong>
                    {fundingResult.status !== "unknown" && <div className="result-amounts"><span>إجمالي التكلفة: {formatMoney(fundingResult.requiredMinorUnits, currentCurrency)}</span><span>غير مغطى: {formatMoney(fundingResult.uncoveredMinorUnits, currentCurrency)}</span></div>}
                    {fundingResult.missingCategories.length > 0 && <p>بنود بلا بيانات: {fundingResult.missingCategories.map((item) => CATEGORY_LABELS[item]).join("، ")}</p>}
                    {fundingResult.unverifiedCategories.length > 0 && <p>بنود تحتاج دليلاً ومراجعة: {fundingResult.unverifiedCategories.map((item) => CATEGORY_LABELS[item]).join("، ")}</p>}
                  </div>
                )}
              </section>

              <section className="evaluation-panel">
                <div className="evaluation-panel-heading"><div><span className="eyebrow">HARD & SOFT RULES</span><h2>تقييم الأهلية</h2></div><span className="evaluation-icon">✓</span></div>
                <p className="evaluation-intro">أضف شرطاً من شروط البرنامج، واربطه بدليل محفوظ، ثم أدخل قيمة المتقدم للمقارنة. لا تُحفظ قيم المتقدم بعد مغادرة الصفحة.</p>
                <div className="criterion-builder">
                  <label>اسم الشرط<input value={criterionForm.label} onChange={(event) => setCriterionForm({ ...criterionForm, label: event.target.value })} placeholder="الجنسية / المعدل / اللغة" /></label>
                  <label>نوع المقارنة<select value={criterionForm.comparator} onChange={(event) => setCriterionForm({ ...criterionForm, comparator: event.target.value as EligibilityComparator })}><option value="equals">يساوي</option><option value="min">الحد الأدنى</option><option value="max">الحد الأعلى</option><option value="one_of">واحد من الخيارات</option></select></label>
                  <label>القيمة المطلوبة من البرنامج<input value={criterionForm.requiredValue} onChange={(event) => setCriterionForm({ ...criterionForm, requiredValue: event.target.value })} placeholder={criterionForm.comparator === "one_of" ? "Yemen, Jordan, Egypt" : "مثال: 3.5 أو English"} /></label>
                  <label>الدليل الرسمي<select value={criterionForm.evidenceId} onChange={(event) => setCriterionForm({ ...criterionForm, evidenceId: event.target.value })}><option value="">اختر دليلاً</option>{eligibleEvidence.map((item) => <option key={item.id} value={item.id}>{item.sourceName ?? "المصدر"} — {item.excerpt.slice(0, 65)}</option>)}</select></label>
                  <label className="hard-rule-toggle"><input type="checkbox" checked={criterionForm.hard} onChange={(event) => setCriterionForm({ ...criterionForm, hard: event.target.checked })} /> شرط إلزامي للقبول</label>
                  <button className="secondary-action" type="button" onClick={addCriterion}>إضافة الشرط</button>
                </div>

                <div className="criterion-list">
                  {currentCriteria.length === 0 ? <div className="compact-empty"><h3>لم تضف شروطاً بعد</h3><p>ابدأ بإضافة شرط موثق من صفحة المصدر.</p></div> : currentCriteria.map((item) => {
                    const linkedEvidence = eligibleEvidence.find((evidenceItem) => evidenceItem.id === item.evidenceId);
                    return (
                      <article className="criterion-card" key={item.id}>
                        <div className="criterion-card-head"><strong>{item.label}</strong><button type="button" onClick={() => removeCriterion(item.id)}>إزالة</button></div>
                        <p>{item.hard ? "شرط إلزامي" : "تفضيل غير إلزامي"} · {item.comparator === "min" ? "الحد الأدنى" : item.comparator === "max" ? "الحد الأعلى" : item.comparator === "one_of" ? "واحد من" : "يساوي"} · المطلوب: {item.requiredValue}</p>
                        {linkedEvidence && <a href={linkedEvidence.sourceUrl} target="_blank" rel="noopener noreferrer">عرض دليل الشرط ↗</a>}
                        <label>قيمة المتقدم<input value={item.applicantValue} onChange={(event) => updateApplicantValue(item.id, event.target.value)} placeholder="أدخل القيمة للمقارنة" /></label>
                      </article>
                    );
                  })}
                </div>
                <button className="save-opportunity" type="button" onClick={evaluateEligibilityForSelected}>قيّم الأهلية</button>
                {eligibilityResult && (
                  <div className={"evaluation-result result-" + eligibilityResult.status}>
                    <strong>{eligibilityStatusLabel(eligibilityResult.status)}</strong>
                    {eligibilityResult.criteria.map((item) => <p key={item.id}>{item.id}: {item.result === "pass" ? "مستوفى" : item.result === "fail" ? "غير مستوفى" : "غير معروف"}</p>)}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
