import Link from "next/link";

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type FundingClaim = "unknown" | "partial" | "claimed";
type Opportunity = {
  id: string;
  title: string;
  institution: string;
  field: string;
  deadline: string;
  sourceUrl: string;
  fundingClaim: FundingClaim;
};

const STORAGE_KEY = "scholar-intelligence-opportunities-v1";

const fundingLabels: Record<FundingClaim, string> = {
  unknown: "التمويل غير متحقق",
  partial: "تمويل جزئي بحسب المصدر",
  claimed: "المصدر يدّعي التمويل الكامل — يحتاج تدقيق"
};

const emptyForm = {
  title: "",
  institution: "",
  field: "",
  deadline: "",
  sourceUrl: "",
  fundingClaim: "unknown" as FundingClaim
};

function isSafeOfficialUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function isValidOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.institution === "string" &&
    typeof item.field === "string" &&
    typeof item.deadline === "string" &&
    typeof item.sourceUrl === "string" && isSafeOfficialUrl(item.sourceUrl) &&
    (item.fundingClaim === "unknown" || item.fundingClaim === "partial" || item.fundingClaim === "claimed");
}

export default function OpportunityManager() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed.filter(isValidOpportunity));
      }
    } catch {
      setError("تعذر قراءة البيانات المحلية لهذا المتصفح.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      setError("تعذر حفظ البيانات محلياً. تحقق من مساحة التخزين في المتصفح.");
    }
  }, [items, loaded]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    }),
    [items]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.title.trim() || !form.institution.trim()) {
      setError("اسم الفرصة والجامعة مطلوبان.");
      return;
    }
    if (!isSafeOfficialUrl(form.sourceUrl.trim())) {
      setError("أدخل رابطاً رسمياً يبدأ بـ https://");
      return;
    }

    const opportunity: Opportunity = {
      ...form,
      id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: form.title.trim(),
      institution: form.institution.trim(),
      field: form.field.trim(),
      sourceUrl: form.sourceUrl.trim()
    };

    setItems((current) => [opportunity, ...current]);
    setForm(emptyForm);
  }

  function removeOpportunity(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <Link className="workspace-brand" href="/">Scholar <span>INTELLIGENCE</span></Link>
        <Link className="back-link" href="/">العودة إلى لوحة التحكم</Link>
      </header>

      <div className="workspace-content">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">OPPORTUNITY TRACKER</div>
            <h1>الفرص والمنح</h1>
            <p>اجمع الفرص التي تعثر عليها، واحفظ رابط المصدر الرسمي وموعد التقديم وحالة التمويل الأولية.</p>
          </div>
          <div className="workspace-count"><strong>{items.length}</strong><span>فرصة محفوظة</span></div>
        </div>

        <div className="local-notice">
          <span className="notice-dot" />
          <div><strong>حفظ محلي على هذا المتصفح</strong><p>هذه النسخة لا تستخدم قاعدة بيانات بعد. لا تحفظ كلمات مرور أو مستندات شخصية هنا.</p></div>
        </div>

        <div className="opportunity-layout">
          <section className="opportunity-list-panel">
            <div className="list-panel-heading">
              <div><h2>قائمة الفرص</h2><p>مرتبة حسب أقرب موعد منشور</p></div>
              <span className="list-count">{items.length}</span>
            </div>

            {!loaded ? (
              <div className="empty-opportunities">جارٍ تحميل بيانات هذا المتصفح…</div>
            ) : sortedItems.length === 0 ? (
              <div className="empty-opportunities">
                <div className="empty-mark">＋</div>
                <h3>لا توجد فرص محفوظة بعد</h3>
                <p>أضف أول برنامج ماجستير أو منحة مع رابطها الرسمي للبدء.</p>
              </div>
            ) : (
              <div className="opportunity-cards">
                {sortedItems.map((item) => (
                  <article className="opportunity-card" key={item.id}>
                    <div className="opportunity-card-top">
                      <div><h3>{item.title}</h3><p>{item.institution}{item.field ? ` · ${item.field}` : ""}</p></div>
                      <button className="remove-opportunity" type="button" onClick={() => removeOpportunity(item.id)} aria-label={`حذف ${item.title}`}>×</button>
                    </div>
                    <div className="opportunity-meta">
                      <span className={`funding-tag funding-${item.fundingClaim}`}>{fundingLabels[item.fundingClaim]}</span>
                      <span className="deadline-tag">{item.deadline ? `آخر موعد: ${item.deadline}` : "الموعد غير محدد"}</span>
                    </div>
                    <a className="source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">فتح المصدر الرسمي ↗</a>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="opportunity-form-panel">
            <div className="form-panel-heading"><span className="form-icon">＋</span><div><h2>إضافة فرصة</h2><p>أدخل البيانات المنشورة في المصدر</p></div></div>
            <form className="opportunity-form" onSubmit={handleSubmit}>
              <label>اسم البرنامج أو المنحة<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: MSc Artificial Intelligence" required /></label>
              <label>الجامعة أو الجهة المانحة<input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="اسم الجامعة" required /></label>
              <label>التخصص<input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="AI / Computer Science" /></label>
              <label>آخر موعد للتقديم<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
              <label>رابط المصدر الرسمي<input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://university.edu/..." required /></label>
              <label>حالة التمويل المعلنة<select value={form.fundingClaim} onChange={(e) => setForm({ ...form, fundingClaim: e.target.value as FundingClaim })}><option value="unknown">غير متحقق</option><option value="partial">تمويل جزئي</option><option value="claimed">ادعاء تمويل كامل — يحتاج تدقيق</option></select></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="save-opportunity" type="submit">حفظ الفرصة</button>
            </form>
            <p className="form-footnote">لن تُصنّف الفرصة ممولة بالكامل لمجرد أن المصدر يصفها بذلك؛ يجب التحقق من جميع عناصر التكلفة.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
