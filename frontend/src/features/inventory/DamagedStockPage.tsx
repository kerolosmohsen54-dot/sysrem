import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';

export function DamagedStockPage() {
  return (
    <section className="page inventory-page damaged-stock-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.damagedStock}</h1>
          <p>متابعة الأصناف المرتجعة أو التالفة بعد اعتماد حركة المخزون</p>
        </div>
        <button className="button button-primary" disabled type="button">
          + تسجيل مرتجع مخازن
        </button>
      </header>
      <div className="summary-grid">
        <article className="summary-card"><span>بانتظار المراجعة</span><strong>0</strong></article>
        <article className="summary-card"><span>معتمد</span><strong>0</strong></article>
        <article className="summary-card"><span>القيمة التقديرية</span><strong>—</strong></article>
      </div>
      <PageState
        kind="empty"
        title="لا توجد مرتجعات مخازن"
        message={ar.admin.damagedStockWaiting}
      />
      <p className="page-note">واجهة مرتجع المخازن جاهزة للحالات الفارغة، لكن عقد الربط الخاص بالتسجيل والاعتماد غير موجود في النسخة الحالية. لم تتم إضافة بيانات تجريبية أو تخزين بديل.</p>
    </section>
  );
}
