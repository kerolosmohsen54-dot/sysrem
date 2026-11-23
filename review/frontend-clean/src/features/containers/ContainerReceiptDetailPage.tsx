import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { formatDate, formatQuantity } from '../../shared/utils/format';
import { getContainer, getContainerReceipt, type ContainerReceiptLine } from './api';

export function ContainerReceiptDetailPage() {
  const { containerId = '', receiptId = '' } = useParams();
  const validIds = /^[1-9]\d*$/.test(containerId) && /^[1-9]\d*$/.test(receiptId);
  const container = useQuery({
    queryKey: ['/containers', containerId],
    queryFn: () => getContainer(containerId),
    enabled: validIds,
  });
  const receipt = useQuery({
    queryKey: ['/containers', containerId, 'receipts', receiptId],
    queryFn: () => getContainerReceipt(containerId, receiptId),
    enabled: validIds,
  });

  if (!validIds) return <PageState kind="error" title={ar.common.invalidIdentifier} />;
  if (container.isLoading || receipt.isLoading) return <PageState kind="loading" />;
  if (container.isError || receipt.isError || !container.data || !receipt.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          void container.refetch();
          void receipt.refetch();
        }}
      />
    );
  }

  const columns: DataColumn<ContainerReceiptLine>[] = [
    {
      key: 'product',
      header: ar.common.product,
      render: (row) =>
        container.data.lines.find((line) => line.id === row.container_line_id)?.product_name ??
        String(row.container_line_id),
    },
    {
      key: 'expected',
      header: ar.inventory.containerExpectedQuantity,
      render: (row) => formatQuantity(row.expected_quantity),
    },
    {
      key: 'received',
      header: ar.inventory.containerReceivedQuantity,
      render: (row) => formatQuantity(row.received_quantity),
    },
    {
      key: 'discrepancy',
      header: ar.inventory.containerDiscrepancyReason,
      render: (row) => row.discrepancy_reason ?? '—',
    },
  ];

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.inventory.containerReceipts}</h1>
          <p>{container.data.container_number}</p>
        </div>
        <Link className="button button-secondary" to={`/containers/${containerId}`}>
          {ar.common.back}
        </Link>
      </header>
      <dl className="invoice-detail-summary">
        <div>
          <dt>{ar.common.date}</dt>
          <dd>{formatDate(receipt.data.received_at)}</dd>
        </div>
        <div>
          <dt>{ar.common.warehouse}</dt>
          <dd>{receipt.data.warehouse_id}</dd>
        </div>
        <div>
          <dt>{ar.common.status}</dt>
          <dd>{receipt.data.status === 'posted' ? ar.common.posted : ar.common.reversed}</dd>
        </div>
      </dl>
      <DataTable
        columns={columns}
        rows={receipt.data.lines}
        getRowKey={(row) => row.container_line_id}
        emptyMessage={ar.common.noResults}
      />
    </section>
  );
}
