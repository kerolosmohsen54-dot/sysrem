import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatMoney } from '../../shared/utils/format';
import { getCustomer } from './api';

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const validId = /^[1-9]\d*$/.test(customerId);
  const customer = useQuery({
    queryKey: ['/customers', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: validId,
  });

  if (!validId) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (customer.isLoading) return <PageState kind="loading" />;
  if (customer.isError || !customer.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void customer.refetch()}
      />
    );
  }

  const current = customer.data;
  const fields = [
    [ar.common.phone, current.phone],
    [ar.common.email, current.email],
    [ar.common.address, current.address],
    [ar.customers.salesperson, current.salesperson],
    [ar.customers.taxNumber, current.tax_number],
    [ar.customers.paymentTerms, current.payment_terms],
    [ar.customers.governorate, current.governorate],
    [
      ar.customers.creditLimit,
      current.credit_limit ? formatMoney(current.credit_limit) : ar.common.notProvided,
    ],
    [
      ar.customers.balance,
      current.balance_egp ? formatMoney(current.balance_egp) : ar.common.notProvided,
    ],
  ] as const;

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{current.name}</h1>
          <p>{ar.customers.detailDescription}</p>
        </div>
        <div className="row-actions">
          <Link className="button button-secondary" to={`/customers/${current.id}/statement`}>
            {ar.customers.openStatement}
          </Link>
          <Link className="button button-secondary" to="/customers">
            {ar.common.back}
          </Link>
        </div>
      </header>
      <dl className="invoice-detail-summary">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || ar.common.notProvided}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
