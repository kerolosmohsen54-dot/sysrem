import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthProvider';
import { newIdempotencyKey } from '../../shared/api/http';
import { ApiError } from '../../shared/api/errors';
import { PageState } from '../../shared/components/PageState';
import { FormField } from '../../shared/components/FormField';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { whatsappHref } from '../../shared/utils/whatsapp';
import { listContainers } from '../containers/api';
import {
  cashForecast, cancelPendingFund, collectionSummary, createContainerPartner, createInstallmentPlan, createPendingFund,
  createRecurringExpense, financeOptions, getExpenseBudgets, listInstallmentPlans, listPendingFunds,
  listContainerPartners, listRecurringExpenses, monthlyComparison, postRecurringOccurrence, receiveInstallmentPayment,
  receivePendingFund, saveExpenseBudget, stopRecurringExpense, type BudgetRow,
  type PendingFund, type RecurringTemplate,
} from './financialPlanningApi';

const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => today().slice(0, 7);
const inputValue = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? '');
const amountPattern = '^(0|[1-9][0-9]{0,14})(\\.[0-9]{1,4})?$';

function useMay(permission: string) {
  const { user } = useAuth();
  return user?.permissions.includes('*') === true || user?.permissions.includes(permission) === true;
}

function PlanningFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="page inventory-page planning-page" dir="rtl">
    <nav className="planning-subnav" aria-label="أقسام التخطيط المالي">
      <Link to="/finance">المالية</Link><Link to="/finance/pending-funds">الأموال المنتظرة</Link>
      <Link to="/finance/partner-installments">شركاء الحاوية</Link><Link to="/finance/expense-budgets">ميزانية المصروفات</Link>
      <Link to="/finance/recurring-expenses">المصروفات المتكررة</Link><Link to="/finance/monthly-comparison">مقارنة شهر بشهر</Link>
      <Link to="/finance/cash-forecast">توقع السيولة</Link>
    </nav>
    <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div></header>
    {children}
  </section>;
}

function Failure({ retry }: { retry: () => void }) { return <PageState kind="error" message="تعذر تحميل بيانات الخادم." onRetry={retry} />; }
function Loading() { return <PageState kind="loading" />; }
function Money({ value }: { value: string }) { return <bdi dir="ltr">{formatMoney(value)}</bdi>; }

export function PendingFundsPage() {
  const client = useQueryClient();
  const mayManage = useMay('pending_funds.manage');
  const mayReceive = useMay('pending_funds.receive');
  const query = useQuery({ queryKey: ['/pending-funds'], queryFn: () => listPendingFunds({ per_page: '100' }) });
  const options = useQuery({ queryKey: ['/finance/planning-options'], queryFn: financeOptions });
  const [receivedFund, setReceivedFund] = useState<PendingFund | null>(null);
  const receiveKeys = useRef<Record<number, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const create = useMutation({ mutationFn: createPendingFund, onSuccess: async ({ data }) => { setMessage(`تم حفظ المبلغ المنتظر رقم ${data.id} من الخادم.`); await Promise.all([client.invalidateQueries({ queryKey: ['/pending-funds'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  const receive = useMutation({ mutationFn: ({ fund, form, key }: { fund: PendingFund; form: HTMLFormElement; key: string }) => receivePendingFund(fund.id, {
    amount: inputValue(form, 'amount'), treasury_account_id: Number(inputValue(form, 'treasury_account_id')), received_date: inputValue(form, 'received_date'), idempotency_key: key,
  }), onSuccess: async ({ data }, variables) => { delete receiveKeys.current[variables.fund.id]; setMessage(`تم تسجيل التحصيل؛ المتبقي الفعلي ${data.remaining_amount}.`); setReceivedFund(null); await Promise.all([client.invalidateQueries({ queryKey: ['/pending-funds'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  const cancel = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelPendingFund(id, reason), onSuccess: async ({ data }) => { setMessage(`تم إلغاء السجل ${data.id} وتسجيل الإجراء.`); await Promise.all([client.invalidateQueries({ queryKey: ['/pending-funds'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  const submitCreate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const form = event.currentTarget; void create.mutateAsync({
    partner_id: Number(inputValue(form, 'partner_id')), source_label: inputValue(form, 'source_label'), source_reference: inputValue(form, 'source_reference') || null,
    description: inputValue(form, 'description'), due_date: inputValue(form, 'due_date'), amount: inputValue(form, 'amount'),
  }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر حفظ المبلغ المنتظر.')); };
  return <PlanningFrame title="الأموال المنتظرة" description="توقعات التحصيل منفصلة عن حركات الخزينة الفعلية، ولكل مبلغ مصدر وموعد استحقاق وحالة.">
    {message && <p className="inline-success" role="status">{message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    {mayManage && <section className="dashboard-panel"><h2>إضافة مبلغ منتظر</h2>{options.isLoading ? <Loading /> : options.isError ? <Failure retry={() => void options.refetch()} /> : <form className="planning-form" onSubmit={submitCreate}>
      <label className="form-field"><span>الشريك</span><select className="input" name="partner_id" required defaultValue=""><option value="" disabled>اختر الشريك</option>{options.data?.partners.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
      <FormField id="pending-source" label="مصدر المبلغ" name="source_label" required />
      <FormField id="pending-reference" label="مرجع المصدر" name="source_reference" />
      <FormField id="pending-description" label="التفاصيل" name="description" required />
      <FormField id="pending-due" label="تاريخ الاستحقاق" name="due_date" type="date" required />
      <FormField id="pending-amount" label="المبلغ المتوقع" name="amount" type="text" inputMode="decimal" pattern={amountPattern} required />
      <button className="button button-primary" disabled={create.isPending} type="submit">{create.isPending ? 'جارٍ الحفظ…' : 'حفظ المبلغ المنتظر'}</button>
    </form>}</section>}
    <section className="dashboard-panel"><h2>سجل الأموال ومصادرها</h2>{query.isLoading ? <Loading /> : query.isError ? <Failure retry={() => void query.refetch()} /> : (query.data?.data.length ?? 0) === 0 ? <PageState kind="empty" title="لا توجد أموال منتظرة" message="أضف مبلغاً متوقعاً لتتبعه هنا." /> : <div className="table-wrap table-wrap-responsive"><table><thead><tr><th>الشريك / المصدر</th><th>الاستحقاق</th><th>المتوقع</th><th>المحصّل فعلياً</th><th>المتبقي</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{query.data?.data.map((fund) => <tr key={fund.id}>
      <td>{fund.partner_name}<small className="block-subline">{fund.source_label} · {fund.source_reference ?? fund.description}</small></td><td><bdi dir="ltr">{formatDate(fund.due_date)}</bdi></td><td><Money value={fund.amount} /></td><td><Money value={fund.received_amount} /></td><td><Money value={fund.remaining_amount} /></td><td>{fund.status === 'partially_received' ? 'محصّل جزئياً' : fund.status === 'received' ? 'محصّل' : fund.status === 'cancelled' ? 'ملغي' : 'منتظر'}</td><td className="planning-actions">
        {mayReceive && (fund.status === 'pending' || fund.status === 'partially_received') && <button className="button button-secondary" onClick={() => { setReceivedFund(fund); setError(''); }} type="button">استلام فعلي</button>}
        {mayManage && fund.status !== 'received' && fund.status !== 'cancelled' && <form className="inline-action" onSubmit={(event) => { event.preventDefault(); const reason = inputValue(event.currentTarget, 'reason'); if (reason.trim().length < 3) { setError('اكتب سبب الإلغاء.'); return; } void cancel.mutateAsync({ id: fund.id, reason }).catch(() => setError('تعذر الإلغاء.')); }}><input aria-label={`سبب إلغاء ${fund.source_label}`} className="input" name="reason" placeholder="سبب الإلغاء" required minLength={3} /><button className="button button-danger" disabled={cancel.isPending} type="submit">إلغاء</button></form>}
      </td></tr>)}</tbody></table></div>}</section>
    {receivedFund && options.data && <section className="dashboard-panel" aria-labelledby="receive-fund-title"><h2 id="receive-fund-title">استلام من {receivedFund.source_label}</h2><form className="planning-form" onChange={() => { delete receiveKeys.current[receivedFund.id]; }} onSubmit={(event) => { event.preventDefault(); const key = receiveKeys.current[receivedFund.id] ?? (receiveKeys.current[receivedFund.id] = newIdempotencyKey()); void receive.mutateAsync({ fund: receivedFund, form: event.currentTarget, key }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر تسجيل الاستلام.')); }}>
      <FormField id="receive-amount" label="المبلغ المستلم" name="amount" defaultValue={receivedFund.remaining_amount} pattern={amountPattern} required />
      <label className="form-field"><span>الخزينة الفعلية</span><select className="input" name="treasury_account_id" required defaultValue=""><option value="" disabled>اختر حساب الخزينة</option>{options.data.treasury.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <FormField id="receive-date" label="تاريخ الاستلام" name="received_date" type="date" required defaultValue={today()} />
      <button className="button button-primary" disabled={receive.isPending} type="submit">تسجيل الاستلام الفعلي</button><button className="button button-secondary" onClick={() => setReceivedFund(null)} type="button">إغلاق</button>
    </form></section>}
  </PlanningFrame>;
}

export function PartnerInstallmentsPage() {
  const client = useQueryClient(); const mayManage = useMay('partner_installments.manage'); const mayReceive = useMay('partner_installments.receive');
  const paymentKeys = useRef<Record<number, string>>({});
  const [contributionMode, setContributionMode] = useState<'manual' | 'scheduled'>('scheduled');
  const plans = useQuery({ queryKey: ['/partner-installment-plans'], queryFn: listInstallmentPlans });
  const options = useQuery({ queryKey: ['/finance/planning-options'], queryFn: financeOptions });
  const containerPartners = useQuery({ queryKey: ['/container-partners'], queryFn: listContainerPartners });
  const containers = useQuery({ queryKey: ['/containers', 'container-partner-options'], queryFn: () => listContainers({ page: 1, perPage: 100, search: '' }), enabled: mayManage });
  const containerPartnerRows = containerPartners.data ?? [];
  const containerRows = containers.data?.data ?? [];
  const [expanded, setExpanded] = useState<number | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const addContainerPartner = useMutation({ mutationFn: createContainerPartner, onSuccess: async ({ data }) => { setMessage(`تم تسجيل شريك الحاوية ${data.name}.`); await client.invalidateQueries({ queryKey: ['/container-partners'] }); } });
  const create = useMutation({ mutationFn: createInstallmentPlan, onSuccess: async ({ data }) => { setMessage(`تم تسجيل مساهمة ${data.container_partner_name} في ${data.container_number ?? 'الحاوية'} بإجمالي ${data.total_amount}${data.contribution_mode === 'scheduled' ? ` على دفعات شهرية ${data.installment_amount}، تبدأ ${data.first_due_date}` : ''}.`); await Promise.all([client.invalidateQueries({ queryKey: ['/partner-installment-plans'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  const pay = useMutation({ mutationFn: async ({ id, form, key }: { id: number; form: HTMLFormElement; key: string }) => ({ id, ...(await receiveInstallmentPayment(id, { treasury_account_id: Number(inputValue(form, 'treasury_account_id')), amount: inputValue(form, 'amount'), payment_date: inputValue(form, 'payment_date'), idempotency_key: key })) }), onSuccess: async ({ id, data }) => { delete paymentKeys.current[id]; setMessage(`تم تسجيل الدفع. إجمالي المدفوع ${data.paid_amount} والمتبقي ${data.remaining_amount}.`); await Promise.all([client.invalidateQueries({ queryKey: ['/partner-installment-plans'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  return <PlanningFrame title="شركاء الحاوية" description="سجّل اسم الشريك وإجمالي مساهمته في الحاوية، ثم سجّل دفعاته الفعلية وتابع المدفوع والمتبقي.">
    {message && <p className="inline-success" role="status">{message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    {mayManage && <section className="dashboard-panel"><h2>إضافة شريك حاوية</h2><form className="planning-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; setError(''); void addContainerPartner.mutateAsync({ name: inputValue(form, 'container_partner_name').trim(), phone: inputValue(form, 'container_partner_phone').trim() || null }).then(() => form.reset()).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر تسجيل شريك الحاوية.')); }}>
      <FormField id="container-partner-name" label="اسم الشريك" name="container_partner_name" required maxLength={160} />
      <FormField id="container-partner-phone" label="رقم واتساب" name="container_partner_phone" maxLength={80} />
      <button className="button button-primary" disabled={addContainerPartner.isPending} type="submit">تسجيل شريك الحاوية</button>
    </form>{containerPartners.isLoading ? <Loading /> : containerPartners.isError ? <Failure retry={() => void containerPartners.refetch()} /> : containerPartnerRows.length > 0 && <div className="table-wrap table-wrap-responsive"><table><thead><tr><th>شريك الحاوية</th><th>واتساب</th></tr></thead><tbody>{containerPartnerRows.map((partner) => { const href = whatsappHref(partner.phone); return <tr key={partner.id}><td>{partner.name}</td><td>{href ? <a href={href} rel="noreferrer" target="_blank" dir="ltr">{partner.phone}</a> : '—'}</td></tr>; })}</tbody></table></div>}</section>}
    {mayManage && <section className="dashboard-panel"><h2>تسجيل مساهمة الشريك وخطة السداد</h2>{options.isLoading || containerPartners.isLoading || containers.isLoading ? <Loading /> : options.isError || containerPartners.isError || containers.isError ? <Failure retry={() => { void options.refetch(); void containerPartners.refetch(); void containers.refetch(); }} /> : <form className="planning-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; setError(''); const mode = inputValue(form, 'contribution_mode') as 'manual' | 'scheduled'; void create.mutateAsync({ container_partner_id: Number(inputValue(form, 'container_partner_id')), container_id: Number(inputValue(form, 'container_id')), reference: inputValue(form, 'reference'), total_amount: inputValue(form, 'total_amount'), contribution_mode: mode, ...(mode === 'scheduled' ? { installment_amount: inputValue(form, 'installment_amount'), first_due_date: inputValue(form, 'first_due_date') } : {}) }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر تسجيل المساهمة.')); }}>
      <label className="form-field"><span>شريك الحاوية</span><select className="input" name="container_partner_id" defaultValue="" required><option value="" disabled>اختر الشريك</option>{containerPartnerRows.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label>
      <label className="form-field"><span>الحاوية</span><select className="input" name="container_id" defaultValue="" required><option value="" disabled>اختر الحاوية</option>{containerRows.map((container) => <option key={container.id} value={container.id}>{container.container_name || container.container_number}</option>)}</select></label>
      <FormField id="installment-reference" label="مرجع المساهمة" name="reference" />
      <FormField id="installment-total" label="إجمالي مساهمة الشريك" name="total_amount" inputMode="decimal" pattern={amountPattern} required />
      <label className="form-field"><span>طريقة السداد</span><select className="input" name="contribution_mode" value={contributionMode} onChange={(event) => setContributionMode(event.currentTarget.value as 'manual' | 'scheduled')}><option value="scheduled">أقساط شهرية</option><option value="manual">دفعات حسب الاستلام</option></select></label>
      {contributionMode === 'scheduled' && <>
        <FormField id="installment-monthly-amount" label="قيمة القسط الشهري" name="installment_amount" inputMode="decimal" pattern={amountPattern} required />
        <FormField id="installment-first-due" label="تاريخ أول قسط" name="first_due_date" type="date" defaultValue={today()} required />
      </>}
      <button className="button button-primary" disabled={create.isPending || !containerPartnerRows.length || !containerRows.length} type="submit">حفظ إجمالي المساهمة</button>
    </form>}</section>}
    <section className="dashboard-panel"><h2>المساهمات وجدول الدفعات</h2>{plans.isLoading ? <Loading /> : plans.isError ? <Failure retry={() => void plans.refetch()} /> : !plans.data?.data.length ? <PageState kind="empty" title="لا توجد مساهمات مسجلة" message="سجّل الشريك وإجمالي مساهمته في الحاوية لتظهر الدفعات هنا." /> : <div className="table-wrap table-wrap-responsive"><table><thead><tr><th>الشريك / الحاوية / المرجع</th><th>إجمالي المساهمة</th><th>القسط الشهري</th><th>إجمالي الدفعات</th><th>المتبقي</th><th>الحالة / الدفعات</th></tr></thead><tbody>{plans.data.data.map((plan) => <tr key={plan.id}><td>{plan.container_partner_name}<small className="block-subline">{plan.container_number ?? 'حاوية'} · {plan.reference ?? `مساهمة ${plan.id}`}</small></td><td><Money value={plan.total_amount} /></td><td>{plan.contribution_mode === 'scheduled' ? <><Money value={plan.installment_amount} /><small className="block-subline">أول استحقاق <bdi dir="ltr">{plan.first_due_date}</bdi></small></> : 'دفعات يدوية'}</td><td><Money value={plan.paid_amount} /></td><td><Money value={plan.remaining_amount} /></td><td><button className="button button-secondary" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} type="button">{expanded === plan.id ? 'إخفاء سجل الدفعات' : 'سجل الدفعات'}</button>
      {mayReceive && plan.status === 'active' && <form className="installment-pay-form" onChange={() => { delete paymentKeys.current[plan.id]; }} onSubmit={(event) => { event.preventDefault(); const key = paymentKeys.current[plan.id] ?? (paymentKeys.current[plan.id] = newIdempotencyKey()); void pay.mutateAsync({ id: plan.id, form: event.currentTarget, key }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر تسجيل الدفعة.')); }}>
        <input className="input" name="amount" aria-label={`مبلغ دفعة ${plan.container_partner_name}`} type="text" inputMode="decimal" pattern={amountPattern} placeholder="مبلغ الدفعة" required />
        <input className="input" name="payment_date" aria-label="تاريخ الدفعة" type="date" defaultValue={today()} required />
        <select className="input" name="treasury_account_id" aria-label="حساب الخزينة" required defaultValue=""><option value="" disabled>الخزينة</option>{options.data?.treasury.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <button className="button button-primary" disabled={pay.isPending || !options.data?.treasury.length} type="submit">استلام دفعة</button></form>}
      {expanded === plan.id && <div className="installment-details">{plan.contribution_mode === 'scheduled' && <><strong>جدول الأقساط الشهرية</strong>{plan.installments.map((installment) => <p key={installment.id}>قسط {installment.sequence_number} · <bdi dir="ltr">{formatDate(installment.due_date)}</bdi> · المستحق <Money value={installment.amount} /> · المدفوع <Money value={installment.paid_amount} /> · المتبقي <Money value={installment.remaining_amount} /></p>)}</>}<strong>سجل الدفعات الفعلية</strong>{plan.payments.map((payment) => <p key={payment.id}>دفعة · <bdi dir="ltr">{formatDate(payment.payment_date)}</bdi> · <Money value={payment.amount} />{payment.notes ? ` · ${payment.notes}` : ''}</p>)}{plan.payments.length === 0 && <p>لم تُسجل دفعات بعد.</p>}</div>}
    </td></tr>)}</tbody></table></div>}</section>
  </PlanningFrame>;
}

export function ExpenseBudgetsPage() {
  const client = useQueryClient(); const mayManage = useMay('expense_budgets.manage'); const [period, setPeriod] = useState(monthNow()); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const budgets = useQuery({ queryKey: ['/expense-budgets', period], queryFn: () => getExpenseBudgets(period) });
  const save = useMutation({ mutationFn: ({ row, form }: { row: BudgetRow; form: HTMLFormElement }) => saveExpenseBudget({ expense_category_id: row.expense_category_id, period, budget_amount: inputValue(form, 'budget_amount'), notes: inputValue(form, 'notes') }, row.id), onSuccess: async ({ data }) => { setMessage(`تم حفظ ميزانية التصنيف ${data.expense_category_id} للفترة ${period}.`); await Promise.all([client.invalidateQueries({ queryKey: ['/expense-budgets', period] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]); } });
  return <PlanningFrame title="ميزانية المصروفات" description="ميزانية كل تصنيف شهرياً مقارنة بالمصروفات المرحلة فعلياً، مع المتبقي ونسبة الاستخدام.">
    <label className="form-field planning-period"><span>الفترة الشهرية</span><input className="input" type="month" value={period} onChange={(event) => setPeriod(event.currentTarget.value)} /></label>
    {message && <p className="inline-success" role="status">{message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    <section className="dashboard-panel"><h2>التصنيفات والإنفاق الفعلي</h2>{budgets.isLoading ? <Loading /> : budgets.isError ? <Failure retry={() => void budgets.refetch()} /> : !budgets.data?.data.length ? <PageState kind="empty" title="لا توجد تصنيفات مصروفات نشطة" /> : <div className="table-wrap table-wrap-responsive"><table><thead><tr><th>التصنيف</th><th>الميزانية</th><th>الفعلي المرحّل</th><th>المتبقي / التجاوز</th><th>الاستخدام</th><th>الحالة</th>{mayManage && <th>حفظ</th>}</tr></thead><tbody>{budgets.data.data.map((row) => { const formId = `budget-form-${row.expense_category_id}`; return <tr key={row.expense_category_id}><th scope="row">{row.category_name}</th><td>{mayManage ? <form id={formId} className="budget-row-form" onSubmit={(event) => { event.preventDefault(); void save.mutateAsync({ row, form: event.currentTarget }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر حفظ الميزانية.')); }}><input className="input" name="budget_amount" type="text" inputMode="decimal" pattern={amountPattern} aria-label={`ميزانية ${row.category_name}`} defaultValue={row.id === null ? '' : row.budget_amount} required /><input name="notes" aria-label={`ملاحظات ${row.category_name}`} className="input" placeholder="ملاحظات" defaultValue={row.notes ?? ''} /></form> : <Money value={row.budget_amount} />}</td><td><Money value={row.actual_amount} /></td><td>{row.remaining_amount === null ? '—' : <Money value={row.remaining_amount} />}</td><td>{row.usage_percent === null ? '—' : `${row.usage_percent}%`}</td><td>{row.status === 'without_budget' ? 'بدون ميزانية' : row.status === 'near_limit' ? 'قريب من الحد' : row.status === 'exceeded' ? 'متجاوزة' : 'طبيعية'}</td>{mayManage && <td><button form={formId} className="button button-secondary" disabled={save.isPending} type="submit">حفظ</button></td>}</tr>; })}</tbody></table></div>}</section>
  </PlanningFrame>;
}

export function RecurringExpensesPage() {
  const client = useQueryClient(); const mayManage = useMay('recurring_expenses.manage'); const q = useQuery({ queryKey: ['/recurring-expenses'], queryFn: listRecurringExpenses }); const options = useQuery({ queryKey: ['/finance/planning-options'], queryFn: financeOptions });
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [postOccurrence, setPostOccurrence] = useState<number | null>(null);
  const invalidate = () => Promise.all([client.invalidateQueries({ queryKey: ['/recurring-expenses'] }), client.invalidateQueries({ queryKey: ['/finance/cash-forecast'] })]);
  const create = useMutation({ mutationFn: createRecurringExpense, onSuccess: async ({ data }) => { setMessage(`تم إنشاء قالب المصروف ${data.id}؛ سيُنشأ استحقاق واحد لكل شهر.`); await invalidate(); } });
  const stop = useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => stopRecurringExpense(id, reason), onSuccess: async ({ data }) => { setMessage(`تم إيقاف القالب ${data.id} وتسجيل السبب.`); await invalidate(); } });
  const post = useMutation({ mutationFn: ({ templateId, occurrenceId, accountId }: { templateId: number; occurrenceId: number; accountId: number }) => postRecurringOccurrence(templateId, occurrenceId, accountId), onSuccess: async ({ data }) => { setMessage(`تم ترحيل الاستحقاق إلى المصروف ${data.expense_number ?? data.expense_id}.`); setPostOccurrence(null); await invalidate(); } });
  return <PlanningFrame title="المصروفات المتكررة" description="قوالب شهرية واستحقاق واحد فريد لكل دورة، مع إيقاف مسجل وترحيل المصروف الفعلي للخزينة.">
    {message && <p className="inline-success" role="status">{message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    {mayManage && <section className="dashboard-panel"><h2>قالب جديد</h2>{options.isLoading ? <Loading /> : options.isError ? <Failure retry={() => void options.refetch()} /> : <form className="planning-form" onSubmit={(event) => { event.preventDefault(); const f = event.currentTarget; void create.mutateAsync({ name: inputValue(f, 'name'), expense_category_id: Number(inputValue(f, 'expense_category_id')), amount: inputValue(f, 'amount'), due_day: Number(inputValue(f, 'due_day')), start_date: inputValue(f, 'start_date') }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر إنشاء القالب.')); }}>
      <FormField id="recurring-name" label="اسم القالب" name="name" required /><label className="form-field"><span>التصنيف</span><select className="input" name="expense_category_id" required defaultValue=""><option value="" disabled>اختر التصنيف</option>{options.data?.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
      <FormField id="recurring-amount" label="المبلغ الشهري" name="amount" inputMode="decimal" pattern={amountPattern} required /><FormField id="recurring-day" label="يوم الاستحقاق من الشهر" name="due_day" type="number" min="1" max="31" required /><FormField id="recurring-start" label="تاريخ بدء التكرار" name="start_date" type="date" required />
      <button className="button button-primary" disabled={create.isPending} type="submit">إضافة القالب</button>
    </form>}</section>}
    <section className="dashboard-panel"><h2>القوالب والاستحقاقات المنشأة</h2>{q.isLoading ? <Loading /> : q.isError ? <Failure retry={() => void q.refetch()} /> : !q.data?.data.length ? <PageState kind="empty" title="لا توجد مصروفات متكررة" message="أنشئ قالباً لتوليد استحقاقات الدورات تلقائياً." /> : q.data.data.map((template: RecurringTemplate) => <article className="recurring-template-card" key={template.id}><header><div><h3>{template.name}</h3><p>{template.expense_category_name} · {template.due_day} من كل شهر · <Money value={template.amount} /></p></div><span>{template.status === 'active' ? 'نشط' : 'موقوف'}</span></header>
      {mayManage && template.status === 'active' && <form className="inline-action" onSubmit={(event) => { event.preventDefault(); const reason = inputValue(event.currentTarget, 'reason'); if (reason.trim().length < 3) { setError('اكتب سبب إيقاف القالب.'); return; } void stop.mutateAsync({ id: template.id, reason }).catch(() => setError('تعذر إيقاف القالب.')); }}><input className="input" name="reason" minLength={3} aria-label={`سبب إيقاف ${template.name}`} placeholder="سبب الإيقاف" required /><button className="button button-danger" type="submit">إيقاف القالب</button></form>}
      {template.occurrences.map((occurrence) => <div className="recurring-occurrence" key={occurrence.id}><span>{occurrence.period_start.slice(0, 7)} · <bdi dir="ltr">{formatDate(occurrence.due_date)}</bdi> · <Money value={occurrence.amount} /></span><span>{occurrence.status === 'posted' ? `مرحّل ${occurrence.expense_number ?? ''}` : 'مستحق غير مرحّل'}</span>{mayManage && occurrence.status === 'due' && <button className="button button-secondary" onClick={() => setPostOccurrence(occurrence.id)} type="button">ترحيل للخزينة</button>}</div>)}
      {postOccurrence !== null && template.occurrences.some((row) => row.id === postOccurrence) && <form className="inline-action" onSubmit={(event) => { event.preventDefault(); const accountId = Number(inputValue(event.currentTarget, 'treasury_account_id')); void post.mutateAsync({ templateId: template.id, occurrenceId: postOccurrence, accountId }).catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : 'تعذر ترحيل المصروف.')); }}><select className="input" name="treasury_account_id" aria-label="الخزينة التي ستدفع المصروف" required defaultValue=""><option value="" disabled>اختر الخزينة</option>{options.data?.treasury.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><button className="button button-primary" disabled={post.isPending} type="submit">تأكيد الترحيل</button><button className="button button-secondary" type="button" onClick={() => setPostOccurrence(null)}>رجوع</button></form>}
    </article>)}</section>
  </PlanningFrame>;
}

export function MonthlyComparisonPage() {
  const [monthA, setMonthA] = useState(monthNow()); const [monthB, setMonthB] = useState(new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 7));
  const report = useQuery({ queryKey: ['/finance-reports/monthly-comparison', monthA, monthB], queryFn: () => monthlyComparison(monthA, monthB) });
  const labels = { sales: 'صافي المبيعات بعد المرتجعات', expenses: 'المصروفات المرحلة', profit: 'الربح التشغيلي' };
  return <PlanningFrame title="مقارنة شهر بشهر" description="مقارنة فترتين كاملتين بالأرقام المرحلة فقط؛ النسبة لا تُحسب عندما تكون قيمة الفترة المرجعية صفراً.">
    <div className="planning-form"><label className="form-field"><span>الشهر الأول</span><input className="input" type="month" value={monthA} onChange={(event) => setMonthA(event.currentTarget.value)} /></label><label className="form-field"><span>الشهر الثاني / الأساس</span><input className="input" type="month" value={monthB} onChange={(event) => setMonthB(event.currentTarget.value)} /></label></div>
    <section className="dashboard-panel"><h2>نتيجة الفترتين</h2>{report.isLoading ? <Loading /> : report.isError ? <Failure retry={() => void report.refetch()} /> : report.data ? <><p>الفترة الأولى: <bdi dir="ltr">{report.data.data.periods.a.from_date} – {report.data.data.periods.a.to_date}</bdi> · الثانية: <bdi dir="ltr">{report.data.data.periods.b.from_date} – {report.data.data.periods.b.to_date}</bdi></p><div className="table-wrap table-wrap-responsive"><table><thead><tr><th>المؤشر</th><th>{monthA}</th><th>{monthB}</th><th>الفرق</th><th>التغير عن الشهر الثاني</th></tr></thead><tbody>{(Object.keys(labels) as (keyof typeof labels)[]).map((key) => { const row = report.data!.data.metrics[key]; return <tr key={key}><th scope="row">{labels[key]}</th><td><Money value={row.month_a} /></td><td><Money value={row.month_b} /></td><td><Money value={row.difference} /></td><td>{row.change_percent === null ? 'لا توجد قيمة أساس للمقارنة' : `${row.change_percent}%`}</td></tr>; })}</tbody></table></div></> : <PageState kind="empty" title="اختر فترتين للمقارنة" />}</section>
  </PlanningFrame>;
}

export function CashForecastPage() {
  const [fromDate, setFromDate] = useState(today()); const [weeks, setWeeks] = useState(8);
  const report = useQuery({ queryKey: ['/finance/cash-forecast', fromDate, weeks], queryFn: () => cashForecast(fromDate, weeks) });
  return <PlanningFrame title="توقع السيولة" description="الرصيد الفعلي منفصل، ثم حركة الخزينة الفعلية والأموال المنتظرة وأقساط الشركاء والاستحقاقات المتكررة والجزء المتبقي من الميزانية.">
    <div className="planning-form"><label className="form-field"><span>بداية الفترة</span><input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} /></label><label className="form-field"><span>عدد الأسابيع</span><select className="input" value={weeks} onChange={(event) => setWeeks(Number(event.currentTarget.value))}>{[4, 8, 12].map((n) => <option key={n} value={n}>{n} أسابيع</option>)}</select></label></div>
     {report.isLoading ? <Loading /> : report.isError ? <Failure retry={() => void report.refetch()} /> : report.data ? <><section className="finance-metric-grid"><article className="finance-metric-card"><span>الرصيد الفعلي ببداية التوقع</span><strong><Money value={report.data.data.actual_opening_balance} /></strong></article><article className="finance-metric-card"><span>الرصيد المتوقع بنهاية الفترة</span><strong><Money value={report.data.data.projected_closing_balance} /></strong></article></section>{!report.data.data.weeks.length ? <PageState kind="empty" title="لا توجد فترات في التوقع" /> : <div className="table-wrap table-wrap-responsive"><table><thead><tr><th>الأسبوع</th><th>تدفق فعلي داخل</th><th>تدفق فعلي خارج</th><th>أموال منتظرة</th><th>أقساط شركاء</th><th>مصروفات متكررة</th><th>جزء الميزانية</th><th>صافي التدفق</th><th>الرصيد المتوقع</th></tr></thead><tbody>{report.data.data.weeks.map((week) => <tr key={week.index}><th scope="row"><bdi dir="ltr">{week.from_date} – {week.to_date}</bdi></th><td><Money value={week.actual_inflows} /></td><td><Money value={week.actual_outflows} /></td><td><Money value={week.pending_funds} />{week.sources.pending_funds.map((source) => <small className="block-subline" key={source.id}>{source.source} · <bdi dir="ltr">{source.due_date}</bdi></small>)}</td><td><Money value={week.partner_installments} />{week.sources.partner_installments.map((source) => <small className="block-subline" key={source.id}>خطة {source.plan_id} · <bdi dir="ltr">{source.due_date}</bdi></small>)}</td><td><Money value={week.recurring_expenses} />{week.sources.recurring_expenses.map((source) => <small className="block-subline" key={`${source.type}-${source.id}-${source.due_date}`}>{source.template_name} · {source.projected ? 'متوقع من القالب' : 'استحقاق مسجل'} · <bdi dir="ltr">{source.due_date}</bdi> · <Money value={source.amount} /></small>)}</td><td><Money value={week.budgeted_expenses} /></td><td><Money value={week.net_flow} /></td><td><Money value={week.projected_closing_balance} /></td></tr>)}</tbody></table></div>}</> : <PageState kind="empty" title="لا توجد بيانات للتوقع" />}
  </PlanningFrame>;
}

export function CollectionsSummaryCards() {
  const summary = useQuery({ queryKey: ['/collections/summary'], queryFn: collectionSummary });
  if (summary.isLoading) return <Loading />;
  if (summary.isError) return <Failure retry={() => void summary.refetch()} />;
  const data = summary.data?.data; if (!data) return <PageState kind="empty" title="لا توجد مؤشرات تحصيل" />;
  return <section className="finance-metric-grid collections-summary" aria-label="مؤشرات التحصيل">{[
    ['إجمالي المستحقات', data.receivables_egp], ['مستحق اليوم', data.due_today_egp], ['متأخر', data.overdue_egp], ['المحصّل هذا الشهر', data.collected_this_month_egp],
  ].map(([label, value]) => <article className="finance-metric-card" key={label}><span>{label}</span><strong><Money value={value} /></strong></article>)}</section>;
}
