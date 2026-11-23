import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { newIdempotencyKey } from '../../shared/api/http';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { formatDate, formatMoney } from '../../shared/utils/format';
import { isPositiveMoney } from '../../shared/utils/money';
import { MobileApiAccess } from './MobileApiAccess';
import { mobileApiRequest, mobileErrorDetails, type MobileApiUser, type MobileCapturedMessage, type MobileChannel } from './api';

type MobilePage<T> = { data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } };
type MessageBundle = { messages: MobilePage<MobileCapturedMessage>; channels: MobilePage<MobileChannel> };
type ArchiveResponse = { data: { archived_count?: number; id?: number; archived?: boolean; restored?: boolean; financial_history_preserved?: boolean } };
type MobileCustomer = { id: number; name: string; phone: string | null; is_active: boolean };
type WithdrawalCategory = { id: number; name: string; requires_notes: boolean; category_kind: string };
type Direction = Exclude<MobileCapturedMessage['direction'], 'NEEDS_REVIEW'>;

const directionLabels: Record<MobileCapturedMessage['direction'], string> = {
  DEPOSIT: 'إيداع',
  WITHDRAWAL: 'سحب',
  NEEDS_REVIEW: 'يحتاج إلى مراجعة',
};
const messageStatusLabels: Record<MobileCapturedMessage['status'], string> = {
  NEW: 'جديد',
  RECORDED: 'مسجل في المالية',
  NEEDS_REVIEW: 'يحتاج إلى مراجعة',
  IGNORED: 'مستبعد',
};
const amountPattern = /^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/;

function MessageList({ token, user }: { token: string; user: MobileApiUser }) {
  const [showArchived, setShowArchived] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<MobileCapturedMessage | null>(null);
  const [direction, setDirection] = useState<Direction | ''>('');
  const [amount, setAmount] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const idempotencyKeys = useRef(new Map<string, string>());
  const queryClient = useQueryClient();
  const canManage = user.permissions.includes('*') || user.permissions.includes('mobile.channels.manage');
  const canRecord = user.permissions.includes('*') || user.permissions.includes('mobile.messages.record');

  const result = useQuery({
    queryKey: ['mobile-linkage', 'messages', showArchived, page],
    queryFn: async (): Promise<MessageBundle> => {
      const archivedQuery = showArchived ? '&archived_only=true' : '';
      const [messages, channels] = await Promise.all([
        mobileApiRequest<MobilePage<MobileCapturedMessage>>(token, `/mobile/messages?page=${page}&per_page=50${archivedQuery}`),
        mobileApiRequest<MobilePage<MobileChannel>>(token, '/mobile/channels?page=1&per_page=100'),
      ]);
      return { messages, channels };
    },
    retry: false,
  });
  const customers = useQuery({
    queryKey: ['mobile-linkage', 'customer-picker', customerSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: '1', per_page: '100', status: 'active', sort_by: 'name' });
      if (customerSearch.trim()) params.set('search', customerSearch.trim());
      return mobileApiRequest<MobilePage<MobileCustomer>>(token, `/customers?${params.toString()}`);
    },
    enabled: Boolean(canRecord && selectedMessage && direction === 'DEPOSIT'),
    retry: false,
  });
  const categories = useQuery({
    queryKey: ['mobile-linkage', 'withdrawal-categories'],
    queryFn: () => mobileApiRequest<{ data: WithdrawalCategory[] }>(token, '/mobile/withdrawal-categories'),
    enabled: Boolean(canRecord && selectedMessage && direction === 'WITHDRAWAL'),
    retry: false,
  });

  const refreshMessages = () => queryClient.invalidateQueries({ queryKey: ['mobile-linkage', 'messages'] });
  const archiveAll = useMutation({
    mutationFn: () => mobileApiRequest<ArchiveResponse>(token, '/mobile/messages', { method: 'DELETE' }),
    onSuccess: refreshMessages,
  });
  const archiveOne = useMutation({
    mutationFn: (messageId: number) => mobileApiRequest<ArchiveResponse>(token, `/mobile/messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: refreshMessages,
  });
  const restoreOne = useMutation({
    mutationFn: (messageId: number) => mobileApiRequest<ArchiveResponse>(token, `/mobile/messages/${messageId}/restore`, { method: 'POST' }),
    onSuccess: refreshMessages,
  });

  const keyFor = (messageId: number, action: string, body: unknown) => {
    const key = `${messageId}:${action}:${JSON.stringify(body)}`;
    const existing = idempotencyKeys.current.get(key);
    if (existing) return existing;
    const created = newIdempotencyKey();
    idempotencyKeys.current.set(key, created);
    return created;
  };
  const openMessage = (message: MobileCapturedMessage) => {
    setSelectedMessage(message);
    setDirection(message.direction === 'NEEDS_REVIEW' ? '' : message.direction);
    setAmount(message.amount ?? '');
    setSelectedCustomer('');
    setSelectedCategory('');
    setCustomerSearch('');
    setNotes('');
    setActionError('');
    setActionSuccess('');
  };
  const closeMessage = () => {
    if (saving) return;
    setSelectedMessage(null);
    setActionError('');
  };
  const saveFinancialRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMessage || !direction) return;
    if (!amountPattern.test(amount) || !isPositiveMoney(amount)) {
      setActionError('أدخل مبلغًا موجبًا وصحيحًا قبل التسجيل.');
      return;
    }
    const directionBody = { direction, amount };
    setSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      let message = selectedMessage;
      if (message.status === 'NEEDS_REVIEW' || message.direction === 'NEEDS_REVIEW') {
        const resolved = await mobileApiRequest<{ data: MobileCapturedMessage }>(
          token,
          `/mobile/messages/${message.id}/resolve-direction`,
          { method: 'POST', body: directionBody, idempotencyKey: keyFor(message.id, 'resolve', directionBody) },
        );
        message = { ...message, ...resolved.data, direction, amount, status: 'NEW' };
        setSelectedMessage(message);
      }

      if (direction === 'DEPOSIT') {
        const customerId = Number(selectedCustomer);
        if (!Number.isSafeInteger(customerId) || customerId < 1) {
          setActionError('اختر العميل الذي أرسل الإيداع.');
          return;
        }
        const body = { customer_id: customerId };
        await mobileApiRequest(token, `/mobile/messages/${message.id}/record-deposit`, {
          method: 'POST', body, idempotencyKey: keyFor(message.id, 'deposit', body),
        });
      } else {
        const categoryId = Number(selectedCategory);
        if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
          setActionError('اختر بند السحب.');
          return;
        }
        const category = categories.data?.data.find((item) => item.id === categoryId);
        if ((category?.requires_notes || category?.name.toLocaleLowerCase() === 'other') && !notes.trim()) {
          setActionError('اكتب وصفًا للسحب في هذا البند.');
          return;
        }
        const body = { category_id: categoryId, notes: notes.trim() || null };
        await mobileApiRequest(token, `/mobile/messages/${message.id}/record-withdrawal`, {
          method: 'POST', body, idempotencyKey: keyFor(message.id, 'withdrawal', body),
        });
      }

      setActionSuccess('تم تسجيل الرسالة وربطها بالحركة المالية.');
      setSelectedMessage(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-linkage', 'messages'] }),
        queryClient.invalidateQueries({ queryKey: ['/treasury/entries'] }),
        queryClient.invalidateQueries({ queryKey: ['/treasury/transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['/treasury/accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['/expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['/sales-receipts'] }),
        queryClient.invalidateQueries({ queryKey: ['/customers'] }),
      ]);
    } catch (cause) {
      const details = mobileErrorDetails(cause).join(' ');
      setActionError([cause instanceof Error ? cause.message : 'تعذر تسجيل الحركة المالية.', details].filter(Boolean).join(' '));
      await refreshMessages();
    } finally {
      setSaving(false);
    }
  };

  if (result.isLoading) return <PageState kind="loading" />;
  if (result.isError || !result.data) {
    const denied = result.error instanceof ApiError && result.error.status === 403;
    return <section><PageState kind={denied ? 'denied' : 'error'} message={denied ? 'ليست لديك صلاحية عرض رسائل الهاتف.' : 'تعذر تحميل رسائل الهاتف.'} onRetry={() => void result.refetch()} />{mobileErrorDetails(result.error).map((detail) => <p key={detail} role="alert">{detail}</p>)}</section>;
  }

  const names = new Map(result.data.channels.data.map((channel) => [channel.id, channel.name]));
  const archiveError = archiveAll.error ?? archiveOne.error ?? restoreOne.error;
  const archiveEverything = () => {
    if (window.confirm('ستتم أرشفة الرسائل من الوارد مع الاحتفاظ بسجلها وروابطها المالية. هل تريد المتابعة؟')) archiveAll.mutate();
  };
  const archiveMessage = (messageId: number) => {
    if (window.confirm('ستتم أرشفة الرسالة مع الاحتفاظ بها في السجل. هل تريد المتابعة؟')) archiveOne.mutate(messageId);
  };
  const selectedCategoryData = categories.data?.data.find((item) => String(item.id) === selectedCategory);

  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>الوارد من تطبيق الهاتف</h1><p>راجع الرسالة، اختر نوع العملية والعميل أو بند السحب، ثم سجّلها في المالية.</p></div></header>
    {actionSuccess ? <p className="inline-success" role="status">{actionSuccess}</p> : null}
    <div className="inventory-toolbar">
      <p role="status">عدد الرسائل في {showArchived ? 'الأرشيف' : 'الوارد'}: {result.data.messages.meta.total}</p>
      <div>
        <button className="button" onClick={() => { setShowArchived((current) => !current); setPage(1); }} type="button">{showArchived ? 'العودة إلى الوارد' : 'عرض الأرشيف'}</button>
        {canManage ? <label className="inventory-checkbox"><input checked={deleteMode} onChange={(event) => setDeleteMode(event.currentTarget.checked)} type="checkbox" /> تفعيل وضع أرشفة الرسائل</label> : null}
        {canManage && deleteMode && !showArchived && result.data.messages.meta.total > 0 ? <button className="button button-primary" disabled={archiveAll.isPending} onClick={archiveEverything} type="button">{archiveAll.isPending ? 'جارٍ الأرشفة…' : 'أرشفة كل الرسائل'}</button> : null}
      </div>
    </div>
    {canManage && !showArchived ? <p>الأرشفة تخفي الرسالة من الوارد فقط، وتحتفظ بالرسالة وسجلها المالي.</p> : null}
    {archiveError ? <section role="alert">تعذر تنفيذ الأرشفة. {mobileErrorDetails(archiveError).join(' ')}</section> : null}
    <div className="table-scroll"><table><thead><tr><th>تاريخ الاستلام</th><th>القناة</th><th>المرسل</th><th>الاتجاه</th><th>المبلغ</th><th>الحالة</th>{canRecord || canManage ? <th>الإجراء</th> : null}</tr></thead><tbody>
      {result.data.messages.data.length === 0 ? <tr><td colSpan={canRecord || canManage ? 7 : 6}>لا توجد رسائل في هذا العرض.</td></tr> : result.data.messages.data.map((message) => <tr key={message.id}>
        <td>{formatDate(message.received_at)}</td><td>{names.get(message.channel_id) ?? `قناة ${message.channel_id}`}</td><td>{message.sender}</td><td>{directionLabels[message.direction]}</td><td>{message.amount === null ? '—' : formatMoney(message.amount)}</td><td>{messageStatusLabels[message.status]}</td>
        {canRecord || canManage ? <td><div className="button-row">
          {canRecord && !showArchived && (message.status === 'NEW' || message.status === 'NEEDS_REVIEW') ? <button className="button button-primary button-sm" onClick={() => openMessage(message)} type="button">مراجعة وتسجيل</button> : null}
          {canManage ? message.archived_at ? <button className="button button-secondary button-sm" disabled={restoreOne.isPending} onClick={() => restoreOne.mutate(message.id)} type="button">استعادة</button> : deleteMode ? <button className="button button-secondary button-sm" disabled={archiveOne.isPending} onClick={() => archiveMessage(message.id)} type="button">أرشفة</button> : null : null}
        </div></td> : null}
      </tr>)}
    </tbody></table></div>
    <nav aria-label="صفحات الرسائل" className="inventory-pagination">
      <button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">السابق</button>
      <span>صفحة {page} من {result.data.messages.meta.last_page}</span>
      <button className="button button-secondary" disabled={page >= result.data.messages.meta.last_page} onClick={() => setPage((current) => current + 1)} type="button">التالي</button>
    </nav>

    <Modal open={selectedMessage !== null} title="مراجعة رسالة وتسجيلها" onClose={closeMessage}>
      {selectedMessage ? <form className="stack-form" onSubmit={(event) => void saveFinancialRecord(event)}>
        <p>المرسل: {selectedMessage.sender} · {formatDate(selectedMessage.received_at)}</p>
        {selectedMessage.raw_text ? <blockquote>{selectedMessage.raw_text}</blockquote> : null}
        {selectedMessage.status === 'NEEDS_REVIEW' || selectedMessage.direction === 'NEEDS_REVIEW' ? <label className="form-field"><span>نوع العملية</span><select className="input" onChange={(event) => setDirection(event.currentTarget.value as Direction | '')} required value={direction}><option value="">اختر إيداع أو سحب</option><option value="DEPOSIT">إيداع</option><option value="WITHDRAWAL">سحب</option></select></label> : <p>نوع العملية: <strong>{directionLabels[selectedMessage.direction]}</strong></p>}
        {selectedMessage.amount === null || selectedMessage.status === 'NEEDS_REVIEW' ? <FormField id="mobile-message-amount" label="مبلغ الحركة" name="amount" inputMode="decimal" pattern="^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$" required value={amount} onChange={(event) => setAmount(event.currentTarget.value)} /> : <p>المبلغ: <strong>{formatMoney(selectedMessage.amount)}</strong></p>}
        {direction === 'DEPOSIT' ? <>
          <label className="form-field"><span>ابحث عن العميل</span><input className="input" onChange={(event) => { setCustomerSearch(event.currentTarget.value); setSelectedCustomer(''); }} value={customerSearch} /></label>
          <label className="form-field"><span>العميل</span><select className="input" onChange={(event) => setSelectedCustomer(event.currentTarget.value)} required value={selectedCustomer}><option value="">اختر العميل</option>{(customers.data?.data ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ''}</option>)}</select></label>
          {customers.isLoading ? <p>جارٍ تحميل العملاء…</p> : null}
          {customers.isError ? <p className="field-error" role="alert">تعذر تحميل العملاء. {mobileErrorDetails(customers.error).join(' ')}</p> : null}
          {!customers.isLoading && customers.data?.data.length === 0 ? <p>لا يوجد عميل نشط يطابق البحث.</p> : null}
        </> : null}
        {direction === 'WITHDRAWAL' ? <>
          <label className="form-field"><span>بند السحب</span><select className="input" onChange={(event) => setSelectedCategory(event.currentTarget.value)} required value={selectedCategory}><option value="">اختر بند السحب</option>{(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          {categories.isLoading ? <p>جارٍ تحميل بنود السحب…</p> : null}
          {categories.isError ? <p className="field-error" role="alert">تعذر تحميل بنود السحب. {mobileErrorDetails(categories.error).join(' ')}</p> : null}
          <label className="form-field"><span>ملاحظات السحب{selectedCategoryData?.requires_notes || selectedCategoryData?.name.toLocaleLowerCase() === 'other' ? '' : ' (اختياري)'}</span><textarea className="input" maxLength={1000} onChange={(event) => setNotes(event.currentTarget.value)} required={Boolean(selectedCategoryData?.requires_notes || selectedCategoryData?.name.toLocaleLowerCase() === 'other')} value={notes} /></label>
          {categories.data?.data.length === 0 ? <p>لا توجد بنود سحب نشطة.</p> : null}
        </> : null}
        {actionError ? <p className="field-error" role="alert">{actionError}</p> : null}
        <div className="button-row"><button className="button button-primary" disabled={saving || !direction || (direction === 'DEPOSIT' && (customers.isLoading || customers.isError || !customers.data?.data.length)) || (direction === 'WITHDRAWAL' && (categories.isLoading || categories.isError || !categories.data?.data.length))} type="submit">{saving ? 'جارٍ التسجيل…' : 'تسجيل الحركة المالية'}</button><button className="button button-secondary" disabled={saving} onClick={closeMessage} type="button">إلغاء</button></div>
      </form> : null}
    </Modal>
  </section>;
}

export function MobileInboxPage() {
  return <MobileApiAccess permission="mobile.messages.view">{({ token, user }) => <MessageList token={token} user={user} />}</MobileApiAccess>;
}
