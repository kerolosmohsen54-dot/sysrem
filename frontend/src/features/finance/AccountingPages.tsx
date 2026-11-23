import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthProvider';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { newIdempotencyKey } from '../../shared/api/http';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { accountingApi, type Account, type AccountType, type FinancialAccountMapping, type JournalLine, type JournalRow, type Period, type PostingMappingOption, type Statements, type TrialBalance } from './accountingApi';
import { listTreasuryAccounts } from './api';
import { exportExcel, type ExportColumn, printReport } from '../reports/export';

const typeNames: Record<AccountType, string> = { asset: 'الأصول', liability: 'الالتزامات', equity: 'حقوق الملكية', revenue: 'الإيرادات', expense: 'المصروفات' };
const adjustmentTypeNames: Record<string, string> = { add: 'إضافة', deduct: 'خصم', expense: 'مصروف', revenue: 'إيراد', settlement: 'تسوية', correction: 'تصحيح' };
const typeOptions = Object.keys(typeNames) as AccountType[];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const monthStart = () => `${today().slice(0, 7)}-01`;
const emptyPeriod = (): Period => ({ from_date: monthStart(), to_date: today() });
const flatten = (rows: Account[]): Account[] => rows.flatMap((row) => [row, ...flatten(row.children)]);
const label = (account: Account) => `${account.code} — ${account.name}`;
const cashError = (queryError: unknown) => queryError instanceof Error ? queryError.message : ar.common.requestFailed;

function Notice({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'error' | 'success' }) {
  return <p className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>;
}

function AccountSelect({ accounts, value, onChange, label: fieldLabel }: { accounts: Account[]; value: string; onChange: (value: string) => void; label: string }) {
  const usable = flatten(accounts).filter((account) => account.posting_allowed);
  return <label className="form-field"><span>{fieldLabel}</span><select aria-label={fieldLabel} value={value} onChange={(event) => onChange(event.currentTarget.value)} required>
    <option value="">اختر الحساب</option>{usable.map((account) => <option key={account.id} value={account.id}>{label(account)}</option>)}
  </select></label>;
}

export function ChartOfAccountsPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('chart_of_accounts.manage'));
  const [selected, setSelected] = useState<Account | null>(null);
  const [formError, setFormError] = useState('');
  const accounts = useQuery({ queryKey: ['accounting', 'accounts'], queryFn: accountingApi.accounts });
  const save = useMutation({
    mutationFn: (input: { id?: number; body: Partial<Account> }) => input.id ? accountingApi.updateAccount(input.id, input.body) : accountingApi.createAccount(input.body),
    onSuccess: async () => { setSelected(null); setFormError(''); await client.invalidateQueries({ queryKey: ['accounting', 'accounts'] }); },
    onError: (error) => setFormError(error instanceof Error ? error.message : ar.common.requestFailed),
  });
  const rows = accounts.data?.data ?? [];
  const form = selected;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = data.get('account_id');
    const body = {
      code: String(data.get('code') ?? '').trim(), name: String(data.get('name') ?? '').trim(),
      description: String(data.get('description') ?? '').trim() || null,
      parent_account_id: String(data.get('parent_account_id') ?? '') ? Number(data.get('parent_account_id')) : null,
      account_type: String(data.get('account_type')) as AccountType,
      normal_balance: String(data.get('normal_balance')) as 'debit' | 'credit',
      is_control_account: data.get('is_control_account') === 'on', is_active: data.get('is_active') === 'on',
    };
    save.mutate({ ...(id ? { id: Number(id) } : {}), body });
  };
  const renderRows = (list: Account[], depth = 0): ReactNode => list.map((account) => <div className="account-tree-node" key={account.id}>
    <div className="account-tree-row" style={{ paddingInlineStart: `${depth * 24}px` }}>
      <span className="account-code" dir="ltr">{account.code}</span><span>{account.name}</span><span>{typeNames[account.account_type]}</span>
      <span className="numeric-value" dir="ltr">{formatMoney(account.balance_egp)}</span>
      <span>{account.is_active ? 'نشط' : 'موقوف'}{account.is_control_account ? ' · رقابي' : ''}</span>
      <span>{canManage && <button className="button button-quiet" type="button" disabled={account.has_posted_entries} aria-label={`تعديل ${account.code}`} onClick={() => { setSelected(account); setFormError(''); }}>تعديل</button>}</span>
    </div>
    {renderRows(account.children, depth + 1)}
  </div>);
  if (accounts.isLoading) return <PageState kind="loading" />;
  if (accounts.isError) return <PageState kind="error" message={cashError(accounts.error)} onRetry={() => void accounts.refetch()} />;
  return <section className="page inventory-page accounting-page">
    <header className="page-heading"><div><h1>دليل الحسابات</h1><p>شجرة الحسابات وأرصدتها من القيود المرحّلة.</p></div>
      {canManage && <button className="button button-primary" type="button" onClick={() => { setSelected({ id: 0, parent_account_id: null, code: '', name: '', description: null, account_type: 'asset', normal_balance: 'debit', is_control_account: false, is_active: true, balance_egp: '0', total_debit: '0', total_credit: '0', has_posted_entries: false, posting_allowed: true, children: [] }); setFormError(''); }}>حساب جديد</button>}
    </header>
    {canManage && form && <form key={form.id || 'new-account'} className="dashboard-panel stack-form" onSubmit={submit} aria-label="بيانات الحساب">
      <h2>{form.id ? `تعديل ${form.code}` : 'إنشاء حساب'}</h2>
      {formError && <Notice kind="error">{formError}</Notice>}
      <input type="hidden" name="account_id" value={form.id || ''} />
      <div className="form-grid">
        <FormField id="account-code" name="code" label="كود الحساب" required defaultValue={form.code} dir="ltr" />
        <FormField id="account-name" name="name" label="اسم الحساب" required defaultValue={form.name} />
        <label className="form-field"><span>نوع الحساب</span><select name="account_type" defaultValue={form.account_type}>{typeOptions.map((type) => <option key={type} value={type}>{typeNames[type]}</option>)}</select></label>
        <label className="form-field"><span>الرصيد الطبيعي</span><select name="normal_balance" defaultValue={form.normal_balance}><option value="debit">مدين</option><option value="credit">دائن</option></select></label>
        <label className="form-field"><span>الحساب الأب</span><select name="parent_account_id" defaultValue={form.parent_account_id ?? ''}><option value="">بدون حساب أب</option>{flatten(rows).filter((row) => row.id !== form.id && !row.is_control_account && !row.has_posted_entries).map((row) => <option key={row.id} value={row.id}>{label(row)}</option>)}</select></label>
        <FormField id="account-description" name="description" label="ملاحظات" defaultValue={form.description ?? ''} />
      </div>
      <label className="check-field"><input name="is_control_account" type="checkbox" defaultChecked={form.is_control_account} /> حساب رقابي</label>
      <label className="check-field"><input name="is_active" type="checkbox" defaultChecked={form.is_active} /> نشط</label>
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={save.isPending}>{save.isPending ? 'جارٍ الحفظ…' : 'حفظ الحساب'}</button><button className="button button-secondary" type="button" onClick={() => setSelected(null)}>إلغاء</button></div>
    </form>}
    {rows.length === 0 ? <PageState kind="empty" title="لا توجد حسابات في الدليل." /> : <section className="dashboard-panel" aria-label="شجرة الحسابات">
      <div className="account-tree-head"><span>الكود</span><span>اسم الحساب</span><span>النوع</span><span>الرصيد</span><span>الحالة</span><span>الإجراء</span></div>
      {renderRows(rows)}
    </section>}
    <nav className="accounting-shortcuts" aria-label="الشاشات المحاسبية"><Link to="/finance/journals">قيود اليومية</Link><Link to="/finance/ledger">دفتر الأستاذ</Link><Link to="/finance/trial-balance">ميزان المراجعة</Link></nav>
  </section>;
}

export function AutoPostingMappingsPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const canManage = Boolean(user?.permissions.includes('*') || user?.permissions.includes('chart_of_accounts.manage'));
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['accounting', 'auto-posting-mappings'], queryFn: accountingApi.accountMappings });
  const save = useMutation({
    mutationFn: (input: { key: string; accountId: number }) => accountingApi.updateAccountMapping(input.key, input.accountId),
    onSuccess: async () => { setError(''); await client.invalidateQueries({ queryKey: ['accounting', 'auto-posting-mappings'] }); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : ar.common.requestFailed),
  });
  if (query.isLoading) return <PageState kind="loading" />;
  if (query.isError) return <PageState kind="error" message={cashError(query.error)} onRetry={() => void query.refetch()} />;

  const mappings = query.data?.data ?? [];
  const accounts = query.data?.accounts ?? [];
  const accountLabel = (account: PostingMappingOption) => `${account.code} — ${account.name}`;
  return <section className="page inventory-page accounting-page">
    <header className="page-heading"><div><h1>ربط الحسابات التلقائي</h1><p>تحدد الحسابات التي تستخدمها قيود البيع والشراء والتحصيل والمصروفات والمخزون. تغيير الربط يؤثر على القيود الجديدة فقط.</p></div></header>
    {error && <Notice kind="error">{error}</Notice>}
    <section className="dashboard-panel" aria-label="إعدادات الحسابات التلقائية"><div className="filter-bar">
      {mappings.map((mapping: FinancialAccountMapping) => {
        const options = accounts.filter((account) => account.account_type === mapping.account_type && account.normal_balance === mapping.normal_balance);
        const value = selected[mapping.mapping_key] ?? mapping.account_id;
        return <div className="form-grid" key={mapping.mapping_key}>
          <div><strong>{mapping.label}</strong><p className="muted">{typeNames[mapping.account_type]} · {mapping.normal_balance === 'debit' ? 'طبيعته مدين' : 'طبيعته دائن'}</p></div>
          <label className="form-field"><span>الحساب</span><select aria-label={`حساب ${mapping.label}`} value={value} onChange={(event) => { const accountId = Number(event.currentTarget.value); setSelected((current) => ({ ...current, [mapping.mapping_key]: accountId })); }} disabled={!canManage}>
            {options.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
          </select></label>
          {canManage && <div className="form-actions"><button className="button button-primary" type="button" disabled={save.isPending || value === mapping.account_id} onClick={() => save.mutate({ key: mapping.mapping_key, accountId: value })}>{save.isPending ? 'جارٍ الحفظ…' : 'حفظ الربط'}</button></div>}
        </div>;
      })}
    </div></section>
  </section>;
}

type DraftLine = { account_id: string; debit_amount: string; credit_amount: string; treasury_account_id: string };
const blankLine = (): DraftLine => ({ account_id: '', debit_amount: '', credit_amount: '', treasury_account_id: '' });
function amountUnits(value: string): bigint {
  if (!/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/.test(value)) return 0n;
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole || '0') * 10000n + BigInt(fraction.padEnd(4, '0') || '0');
}

export function JournalsPage() {
  const { entryId } = useParams();
  const id = entryId ? Number(entryId) : null;
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<Period>(emptyPeriod);
  const [formLines, setFormLines] = useState<DraftLine[]>([blankLine(), blankLine()]);
  const [formError, setFormError] = useState('');
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('journal_entries.create'));
  const canPost = Boolean(user?.permissions.includes('*') || user?.permissions.includes('journal_entries.post'));
  const canReverse = Boolean(user?.permissions.includes('*') || user?.permissions.includes('journal_entries.reverse'));
  const rows = useQuery({ queryKey: ['accounting', 'journals', { page, search, status, period }], queryFn: () => accountingApi.journals({ page, per_page: 20, search, status, ...period }), enabled: !id });
  const detail = useQuery({ queryKey: ['accounting', 'journal', id], queryFn: () => accountingApi.journal(id!), enabled: Boolean(id) });
  const accountQuery = useQuery({ queryKey: ['accounting', 'accounts'], queryFn: accountingApi.accounts });
  const treasuryQuery = useQuery({ queryKey: ['treasury', 'accounts', 'journal'], queryFn: () => listTreasuryAccounts({ page: 1, perPage: 100, search: '' }), enabled: createOpen });
  const current = detail.data?.data;
  const units = useMemo(() => formLines.reduce((totals, line) => ({
    debit: totals.debit + (line.debit_amount ? amountUnits(line.debit_amount) : 0n),
    credit: totals.credit + (line.credit_amount ? amountUnits(line.credit_amount) : 0n),
  }), { debit: 0n, credit: 0n }), [formLines]);
  const validAmounts = formLines.every((line) => [line.debit_amount, line.credit_amount].every((value) => !value || /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(value)));
  const balanced = validAmounts && units.debit > 0n && units.debit === units.credit && formLines.every((line) => line.account_id && ((!!line.debit_amount && !line.credit_amount) || (!!line.credit_amount && !line.debit_amount)));
  const save = useMutation({ mutationFn: accountingApi.createJournal, onSuccess: async (response) => { setCreateOpen(false); setFormError(''); await client.invalidateQueries({ queryKey: ['accounting', 'journals'] }); navigate(`/finance/journals/${response.data.id}`); }, onError: (error) => setFormError(error instanceof Error ? error.message : ar.common.requestFailed) });
  const post = useMutation({ mutationFn: () => accountingApi.postJournal(id!), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['accounting', 'journal', id] }); await client.invalidateQueries({ queryKey: ['accounting', 'journals'] }); } });
  const reverse = useMutation({ mutationFn: (body: { reason: string; reversal_date: string }) => accountingApi.reverseJournal(id!, body), onSuccess: async (response) => { setReverseOpen(false); await client.invalidateQueries({ queryKey: ['accounting', 'journal', id] }); await client.invalidateQueries({ queryKey: ['accounting', 'journals'] }); navigate(`/finance/journals/${response.data.id}`); } });
  const submitJournal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError('');
    const data = new FormData(event.currentTarget);
    if (!balanced) { setFormError(`القيد غير متوازن؛ الفرق ${formatUnits(units.debit - units.credit)} ج.م.`); return; }
    save.mutate({ entry_date: String(data.get('entry_date')), description: String(data.get('description')).trim(), lines: formLines.map((line) => ({ account_id: Number(line.account_id), debit_amount: line.debit_amount || '0', credit_amount: line.credit_amount || '0', treasury_account_id: line.treasury_account_id ? Number(line.treasury_account_id) : null })) });
  };
  if (id && detail.isLoading) return <PageState kind="loading" />;
  if (id && detail.isError) return <PageState kind="error" message={cashError(detail.error)} onRetry={() => void detail.refetch()} />;
  if (!id && rows.isLoading) return <PageState kind="loading" />;
  if (!id && rows.isError) return <PageState kind="error" message={cashError(rows.error)} onRetry={() => void rows.refetch()} />;
  if (id && !current) return <PageState kind="error" message="القيد غير موجود." onRetry={() => void detail.refetch()} />;
  const columns: DataColumn<JournalRow>[] = [
    { key: 'number', header: 'رقم القيد', render: (row) => <Link to={`/finance/journals/${row.id}`} dir="ltr">{row.entry_number}</Link> },
    { key: 'date', header: 'التاريخ', render: (row) => <span dir="ltr">{formatDate(row.entry_date)}</span> },
    { key: 'description', header: 'البيان', render: (row) => row.description },
    { key: 'debit', header: 'المدين', render: (row) => <span className="numeric-value" dir="ltr">{formatMoney(row.total_debit)}</span> },
    { key: 'credit', header: 'الدائن', render: (row) => <span className="numeric-value" dir="ltr">{formatMoney(row.total_credit)}</span> },
    { key: 'status', header: 'الحالة', render: (row) => row.status === 'posted' ? 'مرحّل' : row.status === 'reversed' ? 'معكوس' : 'مسودة' },
  ];
  return <section className="page inventory-page accounting-page">
    <header className="page-heading"><div><h1>{current ? `القيد ${current.entry_number}` : 'قيود اليومية'}</h1><p>{current ? current.description : 'إنشاء ومراجعة وترحيل القيود المزدوجة.'}</p></div>
      {current ? <Link className="button button-secondary" to="/finance/journals">قائمة القيود</Link> : canCreate && <button className="button button-primary" type="button" onClick={() => { setFormLines([blankLine(), blankLine()]); setFormError(''); setCreateOpen(true); }}>قيد جديد</button>}
    </header>
    {!id && <div className="filter-bar" aria-label="تصفية القيود"><FormField id="journal-search" label="بحث" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} /><label className="form-field"><span>الحالة</span><select value={status} onChange={(event) => { setStatus(event.currentTarget.value); setPage(1); }}><option value="">كل الحالات</option><option value="draft">مسودة</option><option value="posted">مرحّل</option><option value="reversed">معكوس</option></select></label><FormField id="journal-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => setPeriod({ ...period, from_date: event.currentTarget.value })} /><FormField id="journal-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => setPeriod({ ...period, to_date: event.currentTarget.value })} /></div>}
    {!id && rows.data && <><DataTable columns={columns} rows={rows.data.data} getRowKey={(row) => row.id} emptyMessage="لا توجد قيود بهذه الفلاتر." />{rows.data.meta.last_page > 1 && <div className="pagination"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button><span>{page} / {rows.data.meta.last_page}</span><button className="button button-secondary" disabled={page >= rows.data.meta.last_page} onClick={() => setPage(page + 1)}>التالي</button></div>}</>}
    {current && <>
      <section className="summary-grid"><article className="summary-card"><span>التاريخ</span><strong dir="ltr">{formatDate(current.entry_date)}</strong></article><article className="summary-card"><span>إجمالي المدين</span><strong dir="ltr">{formatMoney(current.total_debit)}</strong></article><article className="summary-card"><span>إجمالي الدائن</span><strong dir="ltr">{formatMoney(current.total_credit)}</strong></article><article className="summary-card"><span>الحالة</span><strong>{current.status === 'posted' ? 'مرحّل' : current.status === 'reversed' ? 'معكوس' : 'مسودة'}</strong></article></section>
      <DataTable columns={[
        { key: 'account', header: 'الحساب', render: (line: JournalLine) => <span dir="ltr">{line.account_code}</span>},
        { key: 'name', header: 'اسم الحساب', render: (line: JournalLine) => line.account_name},
        { key: 'debit', header: 'مدين', render: (line: JournalLine) => <span dir="ltr">{formatMoney(line.debit_amount)}</span>},
        { key: 'credit', header: 'دائن', render: (line: JournalLine) => <span dir="ltr">{formatMoney(line.credit_amount)}</span>},
        { key: 'line', header: 'البيان', render: (line: JournalLine) => <span>{line.description || current.description}{line.partner_name && <small className="muted">الشريك: {line.partner_name}</small>}</span>},
      ]} rows={current.lines} getRowKey={(line) => line.id ?? line.line_number ?? line.account_id} emptyMessage="لا توجد سطور." />
      {current.reversal_of_entry_id && <Notice>هذا القيد عكس القيد <Link to={`/finance/journals/${current.reversal_of_entry_id}`}>#{current.reversal_of_entry_id}</Link>.</Notice>}
      {current.reversal_entry_id && <Notice>تم عكس القيد في <Link to={`/finance/journals/${current.reversal_entry_id}`}>القيد #{current.reversal_entry_id}</Link>.</Notice>}
      {post.isError && <Notice kind="error">{cashError(post.error)}</Notice>}{reverse.isError && <Notice kind="error">{cashError(reverse.error)}</Notice>}
      <div className="form-actions">{current.status === 'draft' && canPost && <button className="button button-primary" type="button" disabled={post.isPending || !current.is_balanced} onClick={() => post.mutate()}>{post.isPending ? 'جارٍ الترحيل…' : 'ترحيل القيد'}</button>}{current.status === 'posted' && !current.reversal_entry_id && canReverse && <button className="button button-danger" type="button" onClick={() => setReverseOpen(true)}>عكس بقيد جديد</button>}</div>
    </>}
    <Modal open={createOpen} title="قيد يومية جديد" onClose={() => setCreateOpen(false)}><form className="stack-form" onSubmit={submitJournal}>
      {formError && <Notice kind="error">{formError}</Notice>}
      {accountQuery.isError && <PageState kind="error" message={cashError(accountQuery.error)} onRetry={() => void accountQuery.refetch()} />}
      {treasuryQuery.isError && <PageState kind="error" message={cashError(treasuryQuery.error)} onRetry={() => void treasuryQuery.refetch()} />}
      <div className="form-grid"><FormField id="new-journal-date" name="entry_date" label="التاريخ" type="date" required defaultValue={today()} /><FormField id="new-journal-description" name="description" label="البيان" aria-label="بيان القيد" required /></div>
      <div className="journal-line-editor"><div className="journal-line-head"><span>الحساب</span><span>مدين</span><span>دائن</span><span>الخزينة</span><span>حذف</span></div>
        {formLines.map((line, index) => <div className="journal-line-row" key={index}>
          <AccountSelect accounts={accountQuery.data?.data ?? []} value={line.account_id} onChange={(value) => setFormLines((lines) => lines.map((item, i) => i === index ? { ...item, account_id: value } : item))} label={`حساب السطر ${index + 1}`} />
          <input aria-label={`مدين السطر ${index + 1}`} dir="ltr" inputMode="decimal" value={line.debit_amount} onChange={(event) => { const value = event.currentTarget.value; setFormLines((lines) => lines.map((item, i) => i === index ? { ...item, debit_amount: value, credit_amount: '' } : item)); }} />
          <input aria-label={`دائن السطر ${index + 1}`} dir="ltr" inputMode="decimal" value={line.credit_amount} onChange={(event) => { const value = event.currentTarget.value; setFormLines((lines) => lines.map((item, i) => i === index ? { ...item, credit_amount: value, debit_amount: '' } : item)); }} />
          <select aria-label={`خزينة السطر ${index + 1}`} value={line.treasury_account_id} onChange={(event) => { const value = event.currentTarget.value; setFormLines((lines) => lines.map((item, i) => i === index ? { ...item, treasury_account_id: value } : item)); }}><option value="">بدون</option>{(treasuryQuery.data?.data ?? []).filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="button button-quiet" type="button" aria-label={`حذف السطر ${index + 1}`} disabled={formLines.length <= 2} onClick={() => setFormLines((lines) => lines.filter((_, i) => i !== index))}>حذف</button>
        </div>)}
      </div>
      <button className="button button-secondary" type="button" onClick={() => setFormLines((lines) => [...lines, blankLine()])}>إضافة سطر</button>
      <div className="journal-totals"><span>المدين: <b dir="ltr">{formatUnits(units.debit)}</b></span><span>الدائن: <b dir="ltr">{formatUnits(units.credit)}</b></span><span>الفرق: <b dir="ltr">{formatUnits(units.debit - units.credit)}</b></span></div>
      {!balanced && <Notice kind="error">الحفظ معطّل حتى يتساوى المدين والدائن وتكتمل الحسابات.</Notice>}
      <button className="button button-primary" type="submit" disabled={!balanced || save.isPending || accountQuery.isLoading || treasuryQuery.isLoading}>حفظ كمسودة</button>
    </form></Modal>
    <Modal open={reverseOpen} title="عكس القيد" onClose={() => setReverseOpen(false)}><form className="stack-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); reverse.mutate({ reason: String(data.get('reason')).trim(), reversal_date: String(data.get('reversal_date')) }); }}>
      <p>سيُنشأ قيد جديد بالسطور المعاكسة ويرتبط بالقيد الأصلي.</p><FormField id="reverse-date" name="reversal_date" label="تاريخ العكس" type="date" required defaultValue={today()} /><FormField id="reverse-reason" name="reason" label="سبب العكس" required />{reverse.isError && <Notice kind="error">{cashError(reverse.error)}</Notice>}<button className="button button-danger" type="submit" disabled={reverse.isPending}>تأكيد العكس</button>
    </form></Modal>
  </section>;
}

export function LedgerPage() {
  const [accountId, setAccountId] = useState(() => new URLSearchParams(window.location.search).get('account') ?? ''); const [period, setPeriod] = useState<Period>(emptyPeriod);
  const accounts = useQuery({ queryKey: ['accounting', 'accounts'], queryFn: accountingApi.accounts });
  const ledger = useQuery({ queryKey: ['accounting', 'ledger', accountId, period], queryFn: () => accountingApi.ledger(Number(accountId), period), enabled: Boolean(accountId && period.from_date && period.to_date) });
  if (accounts.isLoading) return <PageState kind="loading" />;
  if (accounts.isError) return <PageState kind="error" message={cashError(accounts.error)} onRetry={() => void accounts.refetch()} />;
  const accountList = flatten(accounts.data?.data ?? []).filter((account) => account.posting_allowed);
  const columns: DataColumn<NonNullable<typeof ledger.data>['data']['lines'][number]>[] = [
    { key: 'date', header: 'التاريخ', render: (row) => <span dir="ltr">{formatDate(row.entry_date)}</span> },
    { key: 'entry', header: 'رقم القيد', render: (row) => <Link to={`/finance/journals/${row.journal_entry_id}`} dir="ltr">{row.entry_number}</Link> },
    { key: 'description', header: 'البيان', render: (row) => row.description },
    { key: 'debit', header: 'مدين', render: (row) => <span dir="ltr">{formatMoney(row.debit_amount)}</span> },
    { key: 'credit', header: 'دائن', render: (row) => <span dir="ltr">{formatMoney(row.credit_amount)}</span> },
    { key: 'balance', header: 'الرصيد', render: (row) => <span dir="ltr">{formatMoney(row.running_balance)}</span> },
  ];
  return <section className="page inventory-page accounting-page"><header className="page-heading"><div><h1>دفتر الأستاذ</h1><p>يعرض الحركات المرحلة مع الرصيد الافتتاحي والختامي للفترة.</p></div></header>
    <div className="filter-bar"><label className="form-field"><span>الحساب</span><select value={accountId} onChange={(event) => setAccountId(event.currentTarget.value)}><option value="">اختر حساباً</option>{accountList.map((account) => <option key={account.id} value={account.id}>{label(account)}</option>)}</select></label><FormField id="ledger-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => setPeriod({ ...period, from_date: event.currentTarget.value })} /><FormField id="ledger-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => setPeriod({ ...period, to_date: event.currentTarget.value })} /></div>
    {ledger.isLoading && <PageState kind="loading" />}{ledger.isError && <PageState kind="error" message={cashError(ledger.error)} onRetry={() => void ledger.refetch()} />}
    {ledger.data && <><section className="summary-grid"><article className="summary-card"><span>الرصيد الافتتاحي</span><strong dir="ltr">{formatMoney(ledger.data.data.opening_balance)}</strong></article><article className="summary-card"><span>إجمالي المدين</span><strong dir="ltr">{formatMoney(ledger.data.data.period_debit)}</strong></article><article className="summary-card"><span>إجمالي الدائن</span><strong dir="ltr">{formatMoney(ledger.data.data.period_credit)}</strong></article><article className="summary-card"><span>الرصيد الختامي</span><strong dir="ltr">{formatMoney(ledger.data.data.closing_balance)}</strong></article></section><DataTable columns={columns} rows={ledger.data.data.lines} getRowKey={(row) => `${row.journal_entry_id}-${row.entry_number}`} emptyMessage="لا توجد قيود مرحلة على هذا الحساب في الفترة." /></>}
  </section>;
}

export function TrialBalancePage() {
  const [period, setPeriod] = useState<Period>(emptyPeriod);
  const trial = useQuery({ queryKey: ['accounting', 'trial-balance', period], queryFn: () => accountingApi.trialBalance(period) });
  const columns: DataColumn<TrialBalance['accounts'][number]>[] = [
    { key: 'code', header: 'الكود', render: (row) => <Link to={`/finance/ledger?account=${row.id}`} dir="ltr">{row.code}</Link> },
    { key: 'account', header: 'الحساب', render: (row) => row.name },
    { key: 'opening', header: 'الافتتاحي', render: (row) => <span dir="ltr">{formatMoney(row.opening_balance)}</span> },
    { key: 'debit', header: 'مدين الفترة', render: (row) => <span dir="ltr">{formatMoney(row.period_debit)}</span> },
    { key: 'credit', header: 'دائن الفترة', render: (row) => <span dir="ltr">{formatMoney(row.period_credit)}</span> },
    { key: 'closing-debit', header: 'رصيد مدين', render: (row) => <span dir="ltr">{formatMoney(row.closing_debit)}</span> },
    { key: 'closing-credit', header: 'رصيد دائن', render: (row) => <span dir="ltr">{formatMoney(row.closing_credit)}</span> },
  ];
  return <section className="page inventory-page accounting-page"><header className="page-heading"><div><h1>ميزان المراجعة</h1><p>كل الحسابات وحركة الفترة وأرصدتها الختامية.</p></div></header>
    <div className="filter-bar"><FormField id="trial-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => setPeriod({ ...period, from_date: event.currentTarget.value })} /><FormField id="trial-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => setPeriod({ ...period, to_date: event.currentTarget.value })} /></div>
    {trial.isLoading && <PageState kind="loading" />}{trial.isError && <PageState kind="error" message={cashError(trial.error)} onRetry={() => void trial.refetch()} />}
    {trial.data && <><section className="summary-grid"><article className="summary-card"><span>مدين الفترة</span><strong dir="ltr">{formatMoney(trial.data.data.totals.period_debit)}</strong></article><article className="summary-card"><span>دائن الفترة</span><strong dir="ltr">{formatMoney(trial.data.data.totals.period_credit)}</strong></article><article className="summary-card"><span>الرصيد المدين</span><strong dir="ltr">{formatMoney(trial.data.data.totals.closing_debit)}</strong></article><article className="summary-card"><span>الرصيد الدائن</span><strong dir="ltr">{formatMoney(trial.data.data.totals.closing_credit)}</strong></article></section>
      {!trial.data.data.totals.is_balanced && <Notice kind="error">تحذير: ميزان المراجعة غير متوازن. فرق حركة الفترة {formatMoney(trial.data.data.totals.period_difference)}، وفرق الرصيد الختامي {formatMoney(trial.data.data.totals.difference)}. الحسابات ظاهرة أدناه كما هي.</Notice>}
      {trial.data.data.accounts.length ? <DataTable columns={columns} rows={trial.data.data.accounts} getRowKey={(row) => row.id} emptyMessage="لا توجد حسابات." /> : <PageState kind="empty" title="لا توجد حسابات مسجلة في الفترة." />}</>}
  </section>;
}

export function StatementsPanel() {
  const [period, setPeriod] = useState<Period>(emptyPeriod);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('statement');
  const tab: 'income' | 'balance' | 'cash' = requestedTab === 'balance' || requestedTab === 'cash' ? requestedTab : 'income';
  const statements = useQuery({ queryKey: ['accounting', 'statements', period], queryFn: () => accountingApi.statements(period) });
  if (statements.isLoading) return <PageState kind="loading" />;
  if (statements.isError) return <PageState kind="error" message={cashError(statements.error)} onRetry={() => void statements.refetch()} />;
  const data = statements.data?.data;
  if (!data) return <PageState kind="empty" title="لا توجد بيانات للقوائم في الفترة المحددة." />;
  const tabs: { key: typeof tab; title: string }[] = [{ key: 'income', title: 'قائمة الدخل' }, { key: 'balance', title: 'المركز المالي' }, { key: 'cash', title: 'التدفقات النقدية' }];
  const groupColumns: DataColumn<{ id: number; code: string; name: string; amount: string }>[] = [
    { key: 'code', header: 'الكود', render: (row) => <Link to={`/finance/ledger?account=${row.id}`} dir="ltr">{row.code}</Link> },
    { key: 'name', header: 'الحساب', render: (row) => row.name },
    { key: 'amount', header: 'الرصيد', render: (row) => <span dir="ltr">{formatMoney(row.amount)}</span> },
  ];
  const rows = tab === 'income' ? [...(data.income_statement.revenues ?? []), ...(data.income_statement.expenses ?? [])]
    : tab === 'balance' ? [...(data.balance_sheet.assets ?? []), ...(data.balance_sheet.liabilities ?? []), ...(data.balance_sheet.equity ?? [])]
      : [];
  const exportRows: { id: number; code: string; name: string; amount: string }[] = tab === 'cash'
    ? (data.cash_flow.accounts ?? []).map((account) => ({ id: account.treasury_account_id, code: '', name: account.name, amount: account.closing_balance }))
    : rows;
  const exportColumns: ExportColumn<{ id: number; code: string; name: string; amount: string }>[] = [
    { label: 'الكود', value: (row) => row.code },
    { label: 'الحساب', value: (row) => row.name },
    { label: 'الرصيد', value: (row) => row.amount },
  ];
  const exportSelectedStatement = () => {
    const filename = `financial-${tab}-${period.from_date}-${period.to_date}`;
    if (tab === 'cash') {
      exportExcel(filename, [
        { label: 'الخزينة', value: (row) => row.name },
        { label: 'الرصيد الافتتاحي', value: (row) => row.opening_balance },
        { label: 'مدين الفترة', value: (row) => row.period_debit },
        { label: 'دائن الفترة', value: (row) => row.period_credit },
        { label: 'الرصيد الختامي', value: (row) => row.closing_balance },
      ], data.cash_flow.accounts ?? []);
      return;
    }
    exportExcel(filename, exportColumns, exportRows);
  };
  const totals = tab === 'income' ? [ ['إجمالي الإيرادات', data.income_statement.total_revenue], ['إجمالي المصروفات', data.income_statement.total_expenses], ['صافي الدخل', data.income_statement.net_income] ]
    : tab === 'balance' ? [['إجمالي الأصول', data.balance_sheet.total_assets], ['إجمالي الالتزامات', data.balance_sheet.total_liabilities], ['حقوق الملكية بعد الأرباح المتراكمة', data.balance_sheet.total_equity], ['الفرق', data.balance_sheet.difference]]
      : [['الرصيد الافتتاحي', data.cash_flow.opening_balance], ['المقبوضات', data.cash_flow.inflows], ['المدفوعات', data.cash_flow.outflows], ['صافي التدفق', data.cash_flow.net_cash_flow], ['الرصيد الختامي', data.cash_flow.closing_balance]];
  return <section className="dashboard-panel accounting-statements"><header><h2>القوائم المالية</h2><p>مشتقة من القيود المرحلة للفترة نفسها.</p></header>
    <div className="filter-bar"><FormField id="statements-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => setPeriod({ ...period, from_date: event.currentTarget.value })} /><FormField id="statements-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => setPeriod({ ...period, to_date: event.currentTarget.value })} /></div>
    <div className="report-actions"><button className="button button-secondary" onClick={exportSelectedStatement} type="button">Excel</button><button className="button button-secondary" onClick={printReport} type="button">طباعة</button></div>
    <div className="tabs" role="tablist" aria-label="القوائم المالية">{tabs.map((item) => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'tab active' : 'tab'} type="button" onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('statement', item.key); return next; })}>{item.title}</button>)}</div>
    <div role="tabpanel" aria-label={tabs.find((item) => item.key === tab)?.title}>
    {tab !== 'cash' && <DataTable columns={groupColumns} rows={rows} getRowKey={(row) => row.id} emptyMessage="لا توجد أرصدة مرحلة في هذه القائمة." />}
    {tab === 'cash' && ((data.cash_flow.accounts?.length ?? 0) > 0 ? <DataTable columns={[
      { key: 'treasury', header: 'الخزينة', render: (row: NonNullable<Statements['cash_flow']['accounts']>[number]) => row.name },
      { key: 'opening', header: 'افتتاحي', render: (row: NonNullable<Statements['cash_flow']['accounts']>[number]) => <span dir="ltr">{formatMoney(row.opening_balance)}</span> },
      { key: 'in', header: 'مدين الفترة', render: (row: NonNullable<Statements['cash_flow']['accounts']>[number]) => <span dir="ltr">{formatMoney(row.period_debit)}</span> },
      { key: 'out', header: 'دائن الفترة', render: (row: NonNullable<Statements['cash_flow']['accounts']>[number]) => <span dir="ltr">{formatMoney(row.period_credit)}</span> },
      { key: 'closing', header: 'ختامي', render: (row: NonNullable<Statements['cash_flow']['accounts']>[number]) => <span dir="ltr">{formatMoney(row.closing_balance)}</span> },
    ]} rows={data.cash_flow.accounts ?? []} getRowKey={(row) => row.treasury_account_id} emptyMessage="لا توجد حركات خزينة مرحلة في الفترة." /> : <PageState kind="empty" title="لا توجد حركات نقدية مرحلة في الفترة." />)}
    <section className="summary-grid">{totals.map(([title, amount]) => <article className="summary-card" key={title}><span>{title}</span><strong dir="ltr">{formatMoney(amount ?? '0')}</strong></article>)}</section>
    {tab === 'balance' && !data.balance_sheet.is_balanced && <Notice kind="error">المركز المالي غير متوازن؛ الفرق {formatMoney(data.balance_sheet.difference ?? '0')}.</Notice>}
    </div>
  </section>;
}

export function AdjustmentDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const item = useQuery({ queryKey: ['accounting', 'adjustment', id], queryFn: () => accountingApi.adjustment(id) });
  const adjustment = item.data?.data;
  const effectColumns: DataColumn<JournalLine>[] = [
    { key: 'account', header: 'الحساب', render: (line) => <span dir="ltr">{line.account_code} — {line.account_name}</span> },
    { key: 'debit', header: 'مدين', render: (line) => <span dir="ltr">{formatMoney(line.debit_amount)}</span> },
    { key: 'credit', header: 'دائن', render: (line) => <span dir="ltr">{formatMoney(line.credit_amount)}</span> },
    { key: 'treasury', header: 'الخزينة / الشريك', render: (line) => [line.treasury_account_name, line.partner_name].filter(Boolean).join(' · ') || '—' },
  ];
  return <Modal open title="أثر التسوية وسجلها" onClose={onClose}>
    {item.isLoading && <PageState kind="loading" />}
    {item.isError && <PageState kind="error" message={cashError(item.error)} onRetry={() => void item.refetch()} />}
    {adjustment && <div className="stack-form">
      <h3 dir="ltr">{adjustment.adjustment_number}</h3>
      <p>المرجع: <b dir="ltr">{adjustment.reference_number}</b> · {adjustment.reason}</p>
      <p>المبلغ: <b dir="ltr">{formatMoney(adjustment.amount)}</b> · تاريخ {formatDate(adjustment.adjustment_date)}</p>
      <p>القيد المرحل: <Link to={`/finance/journals/${adjustment.journal_entry.id}`}>{adjustment.journal_entry.entry_number}</Link></p>
      <DataTable columns={effectColumns} rows={adjustment.journal_entry.lines} getRowKey={(line) => line.id ?? line.line_number ?? line.account_id} emptyMessage="لا توجد سطور للقيد." />
      <h4>سجل التدقيق</h4>
      {adjustment.audit.map((event) => <p key={event.id}>{event.actor_name_snapshot} · {event.action} · <time dir="ltr">{event.created_at}</time></p>)}
    </div>}
  </Modal>;
}

export function FinancialAdjustmentsPage() {
  const { user } = useAuth(); const client = useQueryClient();
  const canCreate = Boolean(user?.permissions.includes('*') || user?.permissions.includes('financial_adjustments.manage'));
  const [period, setPeriod] = useState<Period>(emptyPeriod); const [selectedId, setSelectedId] = useState<number | null>(null); const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const idempotency = useRef('');
  const accounts = useQuery({ queryKey: ['accounting', 'accounts'], queryFn: accountingApi.accounts });
  const treasury = useQuery({ queryKey: ['treasury', 'accounts', 'adjustment'], queryFn: () => listTreasuryAccounts({ page: 1, perPage: 100, search: '' }) });
  const list = useQuery({ queryKey: ['accounting', 'adjustments', period, page, search], queryFn: () => accountingApi.adjustments({ ...period, page, search, per_page: 25 }) });
  const create = useMutation({ mutationFn: (input: { body: Record<string, unknown>; key: string }) => accountingApi.createAdjustment(input.body, input.key), onSuccess: async (response) => { setFormError(''); await client.invalidateQueries({ queryKey: ['accounting', 'adjustments'] }); setSelectedId(response.data.id); }, onError: (error) => setFormError(error instanceof Error ? error.message : ar.common.requestFailed) });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (create.isPending) return; const data = new FormData(event.currentTarget); if (!idempotency.current) idempotency.current = newIdempotencyKey(); create.mutate({ body: {
    reference_number: String(data.get('reference_number')).trim(), adjustment_type: String(data.get('adjustment_type')),
    adjustment_date: String(data.get('adjustment_date')), debit_account_id: Number(data.get('debit_account_id')),
    credit_account_id: Number(data.get('credit_account_id')), debit_treasury_account_id: data.get('debit_treasury_account_id') ? Number(data.get('debit_treasury_account_id')) : null,
    credit_treasury_account_id: data.get('credit_treasury_account_id') ? Number(data.get('credit_treasury_account_id')) : null,
    amount: String(data.get('amount')), reason: String(data.get('reason')).trim(), notes: String(data.get('notes') ?? '').trim() || null,
  }, key: idempotency.current }); };
  if (accounts.isLoading || list.isLoading) return <PageState kind="loading" />;
  if (accounts.isError) return <PageState kind="error" message={cashError(accounts.error)} onRetry={() => void accounts.refetch()} />;
  if (list.isError) return <PageState kind="error" message={cashError(list.error)} onRetry={() => void list.refetch()} />;
  const accountList = flatten(accounts.data?.data ?? []).filter((account) => account.posting_allowed);
  const listRows = (list.data?.data ?? []) as { id: number; journal_entry_id: number; adjustment_number: string; reference_number: string; adjustment_type: string; adjustment_date: string; amount: string; reason: string; entry_number: string; debit_account_name: string; credit_account_name: string }[];
  const columns: DataColumn<(typeof listRows)[number]>[] = [
    { key: 'number', header: 'رقم التسوية', render: (row) => <button type="button" className="link-button" onClick={() => setSelectedId(row.id)} dir="ltr">{row.adjustment_number}</button> },
    { key: 'reference', header: 'المرجع', render: (row) => <span dir="ltr">{row.reference_number}</span> },
    { key: 'date', header: 'التاريخ', render: (row) => <span dir="ltr">{formatDate(row.adjustment_date)}</span> },
    { key: 'type', header: 'النوع', render: (row) => adjustmentTypeNames[row.adjustment_type] ?? row.adjustment_type },
    { key: 'debit', header: 'مدين', render: (row) => row.debit_account_name },
    { key: 'credit', header: 'دائن', render: (row) => row.credit_account_name },
    { key: 'reason', header: 'السبب', render: (row) => row.reason },
    { key: 'amount', header: 'المبلغ', render: (row) => <span dir="ltr">{formatMoney(row.amount)}</span> },
    { key: 'entry', header: 'القيد', render: (row) => <Link to={`/finance/journals/${row.journal_entry_id}`} dir="ltr">{row.entry_number}</Link> },
  ];
  return <section className="page inventory-page accounting-page"><header className="page-heading"><div><h1>التسويات المالية</h1><p>كل تسوية تحفظ قيداً مزدوجاً مرحّلاً، مع مرجع وسجل تدقيق.</p></div></header>
    {canCreate && <form className="dashboard-panel stack-form" onChange={() => { idempotency.current = ''; }} onSubmit={submit}>
      <h2>تسوية جديدة</h2>{formError && <Notice kind="error">{formError}</Notice>}{treasury.isError && <PageState kind="error" message={cashError(treasury.error)} onRetry={() => void treasury.refetch()} />}
      <div className="form-grid"><FormField id="adjustment-reference" name="reference_number" label="رقم المرجع" required dir="ltr" /><label className="form-field"><span>نوع التسوية</span><select name="adjustment_type" defaultValue="correction"><option value="add">إضافة</option><option value="deduct">خصم</option><option value="expense">مصروف</option><option value="revenue">إيراد</option><option value="settlement">تسوية</option><option value="correction">تصحيح</option></select></label><FormField id="adjustment-date" name="adjustment_date" label="التاريخ" type="date" required defaultValue={today()} /><FormField id="adjustment-amount" name="amount" label="المبلغ" required inputMode="decimal" dir="ltr" />
        <select aria-label="الحساب المدين" name="debit_account_id" required defaultValue=""><option value="">اختر الحساب المدين</option>{accountList.map((account) => <option key={account.id} value={account.id}>{label(account)}</option>)}</select>
        <select aria-label="خزينة الجانب المدين" name="debit_treasury_account_id" defaultValue=""><option value="">بدون خزينة</option>{(treasury.data?.data ?? []).filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="الحساب الدائن" name="credit_account_id" required defaultValue=""><option value="">اختر الحساب الدائن</option>{accountList.map((account) => <option key={account.id} value={account.id}>{label(account)}</option>)}</select>
        <select aria-label="خزينة الجانب الدائن" name="credit_treasury_account_id" defaultValue=""><option value="">بدون خزينة</option>{(treasury.data?.data ?? []).filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <FormField id="adjustment-reason" name="reason" label="سبب التسوية" required /><FormField id="adjustment-notes" name="notes" label="ملاحظات" />
      </div><button className="button button-primary" type="submit" disabled={create.isPending || treasury.isLoading || accountList.length < 2}>{create.isPending ? 'جارٍ التسجيل…' : 'تسجيل التسوية'}</button>
    </form>}
    <section className="dashboard-panel"><header><h2>سجل التسويات</h2></header><div className="filter-bar"><FormField id="adjustments-search" label="بحث بالرقم أو المرجع أو السبب" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} /><FormField id="adjustments-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => { setPeriod({ ...period, from_date: event.currentTarget.value }); setPage(1); }} /><FormField id="adjustments-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => { setPeriod({ ...period, to_date: event.currentTarget.value }); setPage(1); }} /></div><DataTable columns={columns} rows={listRows} getRowKey={(row) => row.id} emptyMessage="لا توجد تسويات في الفترة." />{list.data && list.data.meta.last_page > 1 && <div className="pagination"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">السابق</button><span>{page} / {list.data.meta.last_page}</span><button className="button button-secondary" disabled={page >= list.data.meta.last_page} onClick={() => setPage((current) => current + 1)} type="button">التالي</button></div>}</section>
    {selectedId !== null && <AdjustmentDetails id={selectedId} onClose={() => setSelectedId(null)} />}
  </section>;
}

function formatUnits(units: bigint) {
  const negative = units < 0n; const positive = negative ? -units : units;
  const whole = positive / 10000n; const fraction = String(positive % 10000n).padStart(4, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
