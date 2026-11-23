import Link from "next/link";

const metrics = [
  { label: "الفرص المحفوظة", value: "٠", note: "ابدأ ببناء قائمتك" },
  { label: "تحتاج إلى التحقق", value: "٠", note: "لا توجد بيانات مستوردة" },
  { label: "المواعيد القادمة", value: "٠", note: "ستظهر بعد إضافة الفرص" },
  { label: "ملف التقديم", value: "قيد الإعداد", note: "أكمل بياناتك لاحقاً" }
];

const steps = [
  { number: "01", title: "اكتشاف الفرص", description: "اجمع برامج الماجستير والمنح من المواقع الرسمية للجامعات والجهات المانحة." },
  { number: "02", title: "التحقق من الأهلية", description: "قارن شروط الجنسية والتخصص والمعدل واللغة والمواعيد مع ملفك." },
  { number: "03", title: "فحص التمويل الكامل", description: "احسب الرسوم والمعيشة والسكن والتأمين والسفر والتكاليف الإلزامية." },
  { number: "04", title: "إدارة التقديم", description: "رتّب المستندات والمهام والمراسلات والمواعيد في مساحة واحدة." }
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Scholar Intelligence الصفحة الرئيسية">
          <span className="brand-mark">S</span>
          <span><strong>Scholar</strong><small>INTELLIGENCE</small></span>
        </Link>
        <div className="side-label">مساحة العمل</div>
        <nav className="nav-list" aria-label="التنقل الرئيسي">
          <a className="nav-item active" href="#overview"><Icon>⌂</Icon>نظرة عامة</a>
          <Link className="nav-item" href="/discover"><Icon>⌕</Icon>اكتشاف المنح</Link>
          <Link className="nav-item" href="/opportunities"><Icon>◇</Icon>الفرص والمنح</Link>
          <Link className="nav-item" href="/evidence"><Icon>✓</Icon>سجل الأدلة</Link>
          <Link className="nav-item" href="/evaluation"><Icon>◈</Icon>تقييم الأهلية والتمويل</Link>
          <Link className="nav-item" href="/compare"><Icon>⇄</Icon>مقارنة الفرص</Link>
          <a className="nav-item" href="#funding"><Icon>◈</Icon>تحليل التمويل</a>
          <a className="nav-item" href="#applications"><Icon>▤</Icon>طلبات التقديم</a>
          <a className="nav-item" href="#profile"><Icon>◎</Icon>ملفي الأكاديمي</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-dot" />
            <div><strong>مساحة خاصة</strong><p>بياناتك لا تُشارك دون إذنك.</p></div>
          </div>
          <div className="version">نسخة تأسيسية · 0.1.0</div>
        </div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumb">مساحة العمل <span>/</span> نظرة عامة</div>
          <div className="top-actions">
            <span className="connection"><i /> وضع تجريبي محلي</span>
            <div className="avatar" aria-label="حساب المالك">R</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <div className="eyebrow">GRADUATE OPPORTUNITY INTELLIGENCE</div>
              <h1>خطّتك الأكاديمية، <em>بوضوح.</em></h1>
              <p>اكتشف الفرص المناسبة، تحقّق من شروطها، ولا تخلط بين الإعفاء الجزئي والتمويل الكامل.</p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="art-core">S<span>✦</span></div>
              <div className="art-tag tag-top">EVIDENCE FIRST</div>
              <div className="art-tag tag-bottom">YOUR NEXT CHAPTER</div>
            </div>
          </section>

          <section className="metrics" aria-label="ملخص المساحة">
            {metrics.map((item) => (
              <article className="metric-card" key={item.label}>
                <div className="metric-label">{item.label}</div>
                <div className="metric-value">{item.value}</div>
                <div className="metric-note">{item.note}</div>
              </article>
            ))}
          </section>

          <section className="section-block" id="opportunities">
            <div className="section-heading">
              <div><div className="eyebrow">WORKFLOW</div><h2>من البحث إلى التقديم</h2></div>
              <span className="phase-pill"><i /> تأسيس مساحة العمل</span>
            </div>
            <div className="workflow-grid">
              {steps.map((step) => (
                <article className="workflow-card" key={step.number}>
                  <div className="step-number">{step.number}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <span className="card-arrow">↗</span>
                </article>
              ))}
            </div>
          </section>

          <section className="bottom-grid">
            <article className="panel" id="funding">
              <div className="panel-heading"><h3>معيار التمويل الكامل</h3><span className="panel-symbol">◈</span></div>
              <p className="panel-description">لن نصنّف أي فرصة على أنها ممولة بالكامل قبل فحص جميع عناصر التكلفة الإلزامية.</p>
              <div className="coverage-list">
                {["الرسوم الدراسية", "المعيشة والسكن", "التأمين الصحي", "السفر والتأشيرة", "الرسوم الإلزامية الأخرى"].map((x) => <span key={x}><b>✓</b>{x}</span>)}
              </div>
              <div className="panel-foot">المعلومة غير المؤكدة ستبقى «غير معروفة» وليست ميزة محسوبة.</div>
            </article>
            <article className="panel evidence-panel" id="eligibility">
              <div className="panel-heading"><h3>قاعدة التحقق</h3><span className="evidence-badge">EVIDENCE FIRST</span></div>
              <div className="evidence-visual"><div className="evidence-line"><span>مصدر رسمي</span><i /><strong>دليل</strong></div><div className="evidence-line"><span>قواعد أهلية</span><i /><strong>تقييم</strong></div><div className="evidence-line"><span>مساعد ذكي</span><i /><strong>تلخيص</strong></div></div>
              <p className="panel-description">الذكاء الاصطناعي يساعد في الفهم والمقارنة، لكنه لا يخترع المواعيد ولا يتجاوز قواعد الأهلية الحتمية.</p>
            </article>
          </section>

          <footer className="footer"><span>Scholar Intelligence</span><span>مصادر موثوقة · قرارات قابلة للتفسير · تحكم كامل ببياناتك</span></footer>
        </div>
      </section>
    </main>
  );
}
