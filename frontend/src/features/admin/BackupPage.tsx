import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../shared/api/http';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';

type BackupJob = { id: string; status: string; file_name: string | null; file_bytes: number | null; result_message: string | null; started_at: string | null; finished_at: string | null; created_at: string };
type BackupResult = { jobs: BackupJob[]; latest_job: BackupJob | null; latest_backup: Pick<BackupJob, 'file_name' | 'file_bytes' | 'status' | 'result_message' | 'created_at'> | null };
const loadBackups = () => apiRequest<{ data: BackupResult }>('/system/backups').then(result => result.data);

export function BackupPage() {
  const client = useQueryClient();
  const result = useQuery({ queryKey: ['/system/backups'], queryFn: loadBackups, refetchInterval: 5000 });
  const create = useMutation({ mutationFn: () => apiRequest('/system/backups', { method: 'POST', body: {} }), onSuccess: () => client.invalidateQueries({ queryKey: ['/system/backups'] }) });
  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) return <PageState kind="error" message={ar.common.requestFailed} onRetry={() => void result.refetch()} />;
  const columns: DataColumn<BackupJob>[] = [
    { key: 'date', header: 'وقت الطلب', render: row => row.created_at },
    { key: 'status', header: 'النتيجة', render: row => row.status },
    { key: 'file', header: 'النسخة', render: row => row.file_name ?? '—' },
    { key: 'size', header: 'الحجم', render: row => row.file_bytes === null ? '—' : `${(row.file_bytes / 1024 / 1024).toFixed(2)} MB` },
    { key: 'message', header: 'التفاصيل', render: row => row.result_message ?? '—' },
    { key: 'finished', header: 'وقت الانتهاء', render: row => row.finished_at ?? '—' },
  ];
  const latest = result.data.latest_backup;
  return <section className="page inventory-page"><header className="page-heading"><div><h1>النسخ الاحتياطي</h1><p>أنشئ نسخة قاعدة بيانات كوظيفة خلفية وتابع النتيجة هنا. الاستعادة غير متاحة من الواجهة.</p></div><button className="button button-primary" disabled={create.isPending} onClick={() => create.mutate()} type="button">إنشاء نسخة احتياطية</button></header>
    {latest ? <article className="summary-card"><h2>آخر نسخة مكتملة</h2><p>{latest.file_name} · {latest.status} · {latest.created_at}</p><p>{latest.result_message}</p></article> : <article className="summary-card"><p>لا توجد نسخ احتياطية مسجلة بعد.</p></article>}
    {result.data.latest_job && <article className="summary-card"><h2>آخر مهمة</h2><p>{result.data.latest_job.status} · {result.data.latest_job.finished_at ?? result.data.latest_job.created_at}</p><p>{result.data.latest_job.result_message}</p></article>}
    {create.isError && <p className="field-error" role="alert">تعذر إنشاء مهمة النسخ الاحتياطي.</p>}
    <DataTable columns={columns} rows={result.data.jobs} getRowKey={row => row.id} emptyMessage="لا توجد مهام نسخ احتياطي." />
  </section>;
}
