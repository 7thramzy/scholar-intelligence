"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createLocalBackup, mergeLocalBackup, MAX_BACKUP_BYTES, OPPORTUNITIES_STORAGE_KEY, EVIDENCE_STORAGE_KEY, parseLocalBackupJson, verifyLocalBackupEvidence, type BackupOpportunity } from "@/lib/local-backup";
import type { EvidenceSnapshot } from "@/lib/evidence";
import { evaluateDeadline } from "@/lib/deadline";
import { FETCH_HISTORY_STORAGE_KEY, isSourceFetchHistoryRecord, type SourceFetchHistoryRecord } from "@/lib/source-history";

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

const STORAGE_KEY = OPPORTUNITIES_STORAGE_KEY;

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      id: editingId ?? `opp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: form.title.trim(),
      institution: form.institution.trim(),
      field: form.field.trim(),
      sourceUrl: form.sourceUrl.trim()
    };

    setItems((current) => editingId
      ? current.map((item) => item.id === editingId ? opportunity : item)
      : [opportunity, ...current]);
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(item: Opportunity) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      institution: item.institution,
      field: item.field,
      deadline: item.deadline,
      sourceUrl: item.sourceUrl,
      fundingClaim: item.fundingClaim
    });
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function removeOpportunity(id: string) {
    try {
      const rawEvidence = localStorage.getItem(EVIDENCE_STORAGE_KEY);
      const parsed: unknown = rawEvidence ? JSON.parse(rawEvidence) : [];
      if (!Array.isArray(parsed)) throw new Error("تعذر التحقق من سجل الأدلة؛ لم يتم حذف الفرصة.");
      const rawHistory = localStorage.getItem(FETCH_HISTORY_STORAGE_KEY);
      const parsedHistory: unknown = rawHistory ? JSON.parse(rawHistory) : [];
      if (!Array.isArray(parsedHistory)) throw new Error("تعذر التحقق من سجل الجلب؛ لم يتم حذف الفرصة.");
      if (parsed.some((item) => item && typeof item === "object" && "opportunityId" in item && item.opportunityId === id) || parsedHistory.some((item) => item && typeof item === "object" && "opportunityId" in item && item.opportunityId === id)) {
        setError("لا يمكن حذف هذه الفرصة لأنها مرتبطة بأدلة محفوظة. احتفظ بسجلها أو صدّر نسخة احتياطية أولاً.");
        return;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف الفرصة.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) cancelEditing();
  }

  async function exportBackup() {
    setError("");
    setBackupMessage("");
    try {
      const rawEvidence = localStorage.getItem(EVIDENCE_STORAGE_KEY);
      const rawHistory = localStorage.getItem(FETCH_HISTORY_STORAGE_KEY);
      const parsedEvidence: unknown = rawEvidence ? JSON.parse(rawEvidence) : [];
      const parsedHistory: unknown = rawHistory ? JSON.parse(rawHistory) : [];
      if (!Array.isArray(parsedEvidence) || !Array.isArray(parsedHistory)) throw new Error("سجل الأدلة أو الجلب المحلي غير صالح؛ لم يتم إنشاء النسخة.");
      const validHistory = parsedHistory.filter(isSourceFetchHistoryRecord);
      if (validHistory.length !== parsedHistory.length) throw new Error("سجل الجلب يحتوي على سجلات غير صالحة؛ لم يتم تصدير نسخة ناقصة.");
      const backup = createLocalBackup(items as BackupOpportunity[], parsedEvidence as EvidenceSnapshot[], new Date().toISOString(), validHistory);
      await verifyLocalBackupEvidence(backup);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `scholar-intelligence-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setBackupMessage("تم تجهيز نسخة احتياطية من الفرص والأدلة وتاريخ جلب المصادر.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تصدير النسخة الاحتياطية.");
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setBackupMessage("");
    if (file.size > MAX_BACKUP_BYTES) {
      setError("حجم الملف يتجاوز 5 ميغابايت.");
      return;
    }

    const oldOpportunities = localStorage.getItem(STORAGE_KEY);
    const oldEvidence = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    const oldHistory = localStorage.getItem(FETCH_HISTORY_STORAGE_KEY);
    try {
      const validation = parseLocalBackupJson(await file.text());
      if (!validation.ok || !validation.backup) {
        setError(validation.errors.join(" "));
        return;
      }
      await verifyLocalBackupEvidence(validation.backup);
      const parsedEvidence: unknown = oldEvidence ? JSON.parse(oldEvidence) : [];
      const parsedHistory: unknown = oldHistory ? JSON.parse(oldHistory) : [];
      if (!Array.isArray(parsedEvidence) || !Array.isArray(parsedHistory)) throw new Error("سجل الأدلة أو الجلب الحالي غير صالح؛ أوقفنا الاستيراد.");
      const validHistory = parsedHistory.filter(isSourceFetchHistoryRecord);
      if (validHistory.length !== parsedHistory.length) throw new Error("سجل الجلب الحالي يحتوي على سجلات غير صالحة؛ أوقفنا الاستيراد.");
      const merged = mergeLocalBackup(
        items as BackupOpportunity[],
        parsedEvidence as EvidenceSnapshot[],
        validation.backup,
        validHistory
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.opportunities));
        localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(merged.evidence));
        localStorage.setItem(FETCH_HISTORY_STORAGE_KEY, JSON.stringify(merged.fetchHistory));
      } catch (storageError) {
        if (oldOpportunities === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, oldOpportunities);
        if (oldEvidence === null) localStorage.removeItem(EVIDENCE_STORAGE_KEY);
        else localStorage.setItem(EVIDENCE_STORAGE_KEY, oldEvidence);
        if (oldHistory === null) localStorage.removeItem(FETCH_HISTORY_STORAGE_KEY);
        else localStorage.setItem(FETCH_HISTORY_STORAGE_KEY, oldHistory);
        throw storageError;
      }
      setItems(merged.opportunities);
      setBackupMessage(`اكتمل الدمج: ${merged.addedOpportunities} فرصة و${merged.addedEvidence} دليل و${merged.addedFetchHistory} سجل جلب جديد. لم تُستبدل السجلات الموجودة.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر استيراد النسخة الاحتياطية.");
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
          <div>
            <div className="eyebrow">OPPORTUNITY TRACKER</div>
            <h1>الفرص والمنح</h1>
            <p>اجمع الفرص التي تعثر عليها، واحفظ رابط المصدر الرسمي وموعد التقديم وحالة التمويل الأولية.</p>
          </div>
          <div className="workspace-count"><strong>{items.length}</strong><span>فرصة محفوظة</span></div>
        </div>

        <div className="backup-toolbar"><button type="button" onClick={exportBackup}>تصدير نسخة احتياطية</button><button type="button" onClick={() => fileInputRef.current?.click()}>استيراد ودمج نسخة</button><input ref={fileInputRef} type="file" accept=".json,application/json" onChange={importBackup} hidden /></div>
        {backupMessage && <p className="backup-success" role="status">{backupMessage}</p>}
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
                      <div className="opportunity-actions"><button className="edit-opportunity" type="button" onClick={() => startEditing(item)}>تعديل</button><button className="remove-opportunity" type="button" onClick={() => removeOpportunity(item.id)} aria-label={`حذف ${item.title}`}>×</button></div>
                    </div>
                    <div className="opportunity-meta">
                      <span className={`funding-tag funding-${item.fundingClaim}`}>{fundingLabels[item.fundingClaim]}</span>
                      <span className="deadline-tag">{item.deadline ? "آخر موعد: " + item.deadline : "الموعد غير محدد"} {item.deadline && <span className={"deadline-state deadline-" + evaluateDeadline(item.deadline).status}>{evaluateDeadline(item.deadline).status === "closed" ? "انتهى" : evaluateDeadline(item.deadline).status === "closing-soon" ? "قريب" : evaluateDeadline(item.deadline).status === "upcoming" ? "قادم" : "غير معروف"}</span>}</span>
                    </div>
                    <a className="source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">فتح المصدر الرسمي ↗</a>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="opportunity-form-panel">
            <div className="form-panel-heading"><span className="form-icon">{editingId ? "✎" : "＋"}</span><div><h2>{editingId ? "تعديل الفرصة" : "إضافة فرصة"}</h2><p>أدخل البيانات المنشورة في المصدر</p></div></div>
            <form className="opportunity-form" onSubmit={handleSubmit}>
              <label>اسم البرنامج أو المنحة<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: MSc Artificial Intelligence" required /></label>
              <label>الجامعة أو الجهة المانحة<input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="اسم الجامعة" required /></label>
              <label>التخصص<input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="AI / Computer Science" /></label>
              <label>آخر موعد للتقديم<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
              <label>رابط المصدر الرسمي<input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://university.edu/..." required /></label>
              <label>حالة التمويل المعلنة<select value={form.fundingClaim} onChange={(e) => setForm({ ...form, fundingClaim: e.target.value as FundingClaim })}><option value="unknown">غير متحقق</option><option value="partial">تمويل جزئي</option><option value="claimed">ادعاء تمويل كامل — يحتاج تدقيق</option></select></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="save-opportunity" type="submit">{editingId ? "حفظ التعديلات" : "حفظ الفرصة"}</button>
              {editingId && <button className="cancel-edit-opportunity" type="button" onClick={cancelEditing}>إلغاء التعديل</button>}
            </form>
            <p className="form-footnote">لن تُصنّف الفرصة ممولة بالكامل لمجرد أن المصدر يصفها بذلك؛ يجب التحقق من جميع عناصر التكلفة.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
