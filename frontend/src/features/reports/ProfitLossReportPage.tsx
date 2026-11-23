import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingApi, type Period, type StatementGroup } from '../finance/accountingApi';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { formatMoney } from '../../shared/utils/format';
import { exportExcel, type ExportColumn, printReport } from './export';

type Comparison = 'month' | 'year';
type ProfitLine = { id: number; code: string; name: string; amount: string };
type ComparisonLine = ProfitLine & { prior_amount: string; difference: string };

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDate(value: string, months: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(first.getUTCDate()).padStart(2, '0')}`;
}

function toCents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return 0n;
  const [, sign, integer, fraction = ''] = match;
  const cents = BigInt(integer) * 100n + BigInt((fraction + '00').slice(0, 2));
  return sign ? -cents : cents;
}

function fromCents(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function statementLines(statement: StatementGroup): ProfitLine[] {
  return [...(statement.revenues ?? []), ...(statement.expenses ?? [])];
}

function percent(numerator: string | undefined, denominator: string | undefined): string {
  const base = Number(denominator ?? '0');
  if (!base) return '0%';
  return `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(numerator ?? '0') / base * 100)}%`;
}

export function ProfitLossReportPage() {
  const [period, setPeriod] = useState<Period>(() => ({ from_date: `${today().slice(0, 7)}-01`, to_date: today() }));
  const [comparison, setComparison] = useState<Comparison>('month');
  const priorPeriod = useMemo<Period>(() => ({
    from_date: shiftDate(period.from_date, comparison === 'month' ? -1 : -12),
    to_date: shiftDate(period.to_date, comparison === 'month' ? -1 : -12),
  }), [comparison, period]);
  const current = useQuery({ queryKey: ['accounting', 'profit-loss', period], queryFn: () => accountingApi.statements(period) });
  const previous = useQuery({ queryKey: ['accounting', 'profit-loss-comparison', priorPeriod], queryFn: () => accountingApi.statements(priorPeriod) });
  const statement = current.data?.data.income_statement;
  const prior = previous.data?.data.income_statement;
  const lines = useMemo<ComparisonLine[]>(() => {
    if (!statement) return [];
    const currentRows = statementLines(statement);
    const priorRows = prior ? statementLines(prior) : [];
    const byId = new Map(priorRows.map((row) => [row.id, row]));
    const seen = new Set(currentRows.map((row) => row.id));
    const allRows = [...currentRows, ...priorRows.filter((row) => !seen.has(row.id)).map((row) => ({ ...row, amount: '0.00' }))];
    return allRows.map((row) => {
      const priorAmount = byId.get(row.id)?.amount ?? '0.00';
      return { ...row, prior_amount: priorAmount, difference: fromCents(toCents(row.amount) - toCents(priorAmount)) };
    });
  }, [prior, statement]);
  const columns: DataColumn<ComparisonLine>[] = [
    { key: 'code', header: 'الكود', render: (row) => <span dir="ltr">{row.code}</span> },
    { key: 'account', header: 'الحساب', render: (row) => row.name },
    { key: 'current', header: 'الفترة الحالية', render: (row) => <span dir="ltr">{formatMoney(row.amount)}</span> },
    { key: 'prior', header: comparison === 'month' ? 'الشهر السابق' : 'نفس الفترة من العام السابق', render: (row) => <span dir="ltr">{formatMoney(row.prior_amount)}</span> },
    { key: 'difference', header: 'الفرق', render: (row) => <span dir="ltr">{formatMoney(row.difference)}</span> },
  ];
  const exportColumns: ExportColumn<ComparisonLine>[] = [
    { label: 'الكود', value: (row) => row.code },
    { label: 'الحساب', value: (row) => row.name },
    { label: 'الفترة الحالية', value: (row) => row.amount },
    { label: comparison === 'month' ? 'الشهر السابق' : 'نفس الفترة من العام السابق', value: (row) => row.prior_amount },
    { label: 'الفرق', value: (row) => row.difference },
  ];
  const income = statement;
  const expenseRatio = percent(income?.total_expenses, income?.total_revenue);
  const netMargin = percent(income?.net_income, income?.total_revenue);
  const comparisonName = comparison === 'month' ? 'الشهر السابق' : 'نفس الفترة من العام السابق';
  const revenueDifference = fromCents(toCents(income?.total_revenue ?? '0') - toCents(prior?.total_revenue ?? '0'));
  const expensesDifference = fromCents(toCents(income?.total_expenses ?? '0') - toCents(prior?.total_expenses ?? '0'));
  const netIncomeDifference = fromCents(toCents(income?.net_income ?? '0') - toCents(prior?.net_income ?? '0'));

  return (
    <section className="page inventory-page profit-loss-page">
      <header className="page-heading"><div><h1>تقرير الأرباح والخسائر P&amp;L</h1><p>مشتق من القيود المرحلة، ومقارن بالفترة السابقة.</p></div></header>
      <div className="filter-bar">
        <FormField id="profit-loss-from" label="من تاريخ" type="date" value={period.from_date} onChange={(event) => { const fromDate = event.currentTarget.value; setPeriod((value) => ({ ...value, from_date: fromDate })); }} />
        <FormField id="profit-loss-to" label="إلى تاريخ" type="date" value={period.to_date} onChange={(event) => { const toDate = event.currentTarget.value; setPeriod((value) => ({ ...value, to_date: toDate })); }} />
        <label className="form-field" htmlFor="profit-loss-comparison"><span>مقارنة مع</span><select className="input" id="profit-loss-comparison" value={comparison} onChange={(event) => setComparison(event.currentTarget.value as Comparison)}><option value="month">الشهر السابق</option><option value="year">نفس الفترة من العام السابق</option></select></label>
      </div>
      {current.isLoading || previous.isLoading ? <PageState kind="loading" /> : current.isError ? <PageState kind="error" message="تعذر تحميل قائمة الدخل من القيود المرحلة." onRetry={() => void current.refetch()} /> : previous.isError ? <PageState kind="error" message="تعذر تحميل فترة المقارنة من القيود المرحلة." onRetry={() => void previous.refetch()} /> : !income ? <PageState kind="empty" title="لا توجد بيانات قائمة دخل للفترة المحددة." /> : <>
        <div className="report-actions"><button className="button button-secondary" onClick={() => exportExcel(`profit-loss-${period.from_date}-${period.to_date}`, exportColumns, lines)} type="button">Excel</button><button className="button button-secondary" onClick={printReport} type="button">طباعة</button></div>
        <section className="report-summary-grid" aria-label="مؤشرات الأرباح والخسائر">
          <article className="summary-card"><span>إجمالي الإيرادات</span><strong dir="ltr">{formatMoney(income.total_revenue ?? '0.00')}</strong><small>{comparisonName}: {formatMoney(prior?.total_revenue ?? '0.00')} · الفرق {formatMoney(revenueDifference)}</small></article>
          <article className="summary-card"><span>إجمالي المصروفات</span><strong dir="ltr">{formatMoney(income.total_expenses ?? '0.00')}</strong><small>{comparisonName}: {formatMoney(prior?.total_expenses ?? '0.00')} · الفرق {formatMoney(expensesDifference)}</small></article>
          <article className="summary-card"><span>صافي الدخل</span><strong dir="ltr">{formatMoney(income.net_income ?? '0.00')}</strong><small>{comparisonName}: {formatMoney(prior?.net_income ?? '0.00')} · الفرق {formatMoney(netIncomeDifference)}</small></article>
          <article className="summary-card"><span>هامش صافي الدخل / نسبة المصروفات</span><strong>{netMargin} / {expenseRatio}</strong></article>
        </section>
        <p className="report-period-note">الفترة الحالية: {period.from_date} — {period.to_date} · المقارنة: {priorPeriod.from_date} — {priorPeriod.to_date}</p>
        <DataTable columns={columns} rows={lines} getRowKey={(row) => row.id} emptyMessage="لا توجد حسابات إيرادات أو مصروفات مرحلة في الفترة." />
      </>}
    </section>
  );
}
