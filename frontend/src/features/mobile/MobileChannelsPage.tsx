import { newIdempotencyKey } from '../../shared/api/http';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/errors';
import { PageState } from '../../shared/components/PageState';
import { Modal } from '../../shared/components/Modal';
import { MobileApiAccess } from './MobileApiAccess';
import { mobileApiRequest, mobileErrorDetails, type MobileChannel } from './api';

type ChannelPage = { data: MobileChannel[]; meta: { current_page: number; last_page: number; per_page: number; total: number } };
type ChannelResult = { data: MobileChannel };
type PendingToggle = { channel: MobileChannel; paused: boolean } | null;
const words = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const channelTypeLabels: Record<MobileChannel['type'], string> = {
  wallet: 'محفظة إلكترونية', bank: 'حساب بنكي', instapay: 'إنستاباي', postal: 'بريد', other: 'أخرى',
};

function ChannelManager({ token, canManage }: { token: string; canManage: boolean }) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [pendingToggle, setPendingToggle] = useState<PendingToggle>(null);
  const [editing, setEditing] = useState<MobileChannel | null>(null);
  const [saving, setSaving] = useState(false);
  const channels = useQuery({ queryKey: ['mobile-linkage', 'channels'], queryFn: () => mobileApiRequest<ChannelPage>(token, '/mobile/channels?page=1&per_page=100'), retry: false });
  const showError = (cause: unknown) => { setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ طلب قنوات الهاتف.'); setDetails(mobileErrorDetails(cause)); setSuccess(''); };
  const confirmPassword = (password: string) => mobileApiRequest(token, '/mobile/auth/confirm-password', { method: 'POST', body: { password } });
  const resetMessages = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['mobile-linkage', 'channels'] }),
      client.invalidateQueries({ queryKey: ['/treasury/accounts'] }),
    ]);
  };

  const toggle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingToggle) return;
    const values = new FormData(event.currentTarget);
    setSaving(true); setError(''); setDetails([]); setSuccess('');
    try {
      await confirmPassword(String(values.get('confirm_password') ?? ''));
      await mobileApiRequest<ChannelResult>(token, `/mobile/channels/${pendingToggle.channel.id}`, {
        method: 'PATCH', body: { paused: pendingToggle.paused }, idempotencyKey: newIdempotencyKey(),
      });
      setSuccess(pendingToggle.paused ? 'تم إيقاف القناة مؤقتاً.' : 'تم استئناف القناة.');
      setPendingToggle(null);
      await resetMessages();
    } catch (cause) { showError(cause); }
    finally { setSaving(false); }
  };

  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true); setError(''); setDetails([]); setSuccess('');
    try {
      await confirmPassword(String(values.get('confirm_password') ?? ''));
      const result = await mobileApiRequest<ChannelResult>(token, `/mobile/channels/${editing.id}`, {
        method: 'PATCH',
        idempotencyKey: newIdempotencyKey(),
        body: {
          name: String(values.get('name') ?? '').trim(),
          type: String(values.get('type')),
          number: String(values.get('number') ?? '').trim(),
          sender_filter: String(values.get('sender_filter') ?? '').trim(),
          deposit_keywords: words(String(values.get('deposit_keywords') ?? '')),
          withdrawal_keywords: words(String(values.get('withdrawal_keywords') ?? '')),
          deposit_enabled: values.get('deposit_enabled') === 'on',
          withdrawal_enabled: values.get('withdrawal_enabled') === 'on',
        },
      });
      setSuccess(`تم تحديث القناة ${result.data.name}.`);
      setEditing(null);
      await resetMessages();
    } catch (cause) { showError(cause); }
    finally { setSaving(false); }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError(''); setDetails([]); setSuccess(''); setSaving(true);
    try {
      await confirmPassword(String(values.get('confirm_password') ?? ''));
      const result = await mobileApiRequest<ChannelResult>(token, '/mobile/channels', { method: 'POST', idempotencyKey: newIdempotencyKey(), body: {
        name: String(values.get('name') ?? '').trim(), type: String(values.get('type')),
        number: String(values.get('number') ?? '').trim(), sender_filter: String(values.get('sender_filter') ?? '').trim(),
        deposit_keywords: words(String(values.get('deposit_keywords') ?? '')),
        withdrawal_keywords: words(String(values.get('withdrawal_keywords') ?? '')),
        deposit_enabled: values.get('deposit_enabled') === 'on', withdrawal_enabled: values.get('withdrawal_enabled') === 'on',
      } });
      setSuccess(`تم حفظ القناة ${result.data.name}.`); form.reset();
      await resetMessages();
    } catch (cause) { showError(cause); }
    finally { setSaving(false); }
  };

  if (channels.isLoading) return <PageState kind="loading" />;
  if (channels.isError || !channels.data) {
    const denied = channels.error instanceof ApiError && channels.error.status === 403;
    return <section><PageState kind={denied ? 'denied' : 'error'} message={denied ? 'ليست لديك صلاحية عرض قنوات الهاتف.' : 'تعذر تحميل قنوات الهاتف.'} onRetry={() => void channels.refetch()} />{mobileErrorDetails(channels.error).map((detail) => <p key={detail} role="alert">{detail}</p>)}</section>;
  }

  return <section className="page inventory-page">
    <header className="page-heading"><div><h1>قنوات الدفع عبر الهاتف</h1><p>إدارة قنوات الدفع المستخدمة لاستقبال بيانات الهاتف.</p></div></header>
    {success ? <p role="status">{success}</p> : null}{error ? <p role="alert">{error}</p> : null}{details.map((detail) => <p key={detail} role="alert">{detail}</p>)}
    <div className="table-scroll"><table><thead><tr><th>الاسم</th><th>النوع</th><th>الرقم</th><th>مرشح المرسل</th><th>الرصيد</th><th>الحالة</th>{canManage ? <th>الإجراءات</th> : null}</tr></thead><tbody>
      {channels.data.data.map((channel) => <tr key={channel.id}><td>{channel.name}</td><td>{channelTypeLabels[channel.type]}</td><td>{channel.number}</td><td>{channel.sender_filter}</td><td>{channel.balance}</td><td>{channel.paused ? 'متوقفة مؤقتاً' : 'نشطة'}</td>{canManage ? <td><div className="button-row">
        <button className="button button-secondary button-sm" onClick={() => { setEditing(channel); setPendingToggle(null); setError(''); }} type="button">تعديل</button>
        <button className="button button-secondary button-sm" onClick={() => { setPendingToggle({ channel, paused: !channel.paused }); setEditing(null); setError(''); }} type="button">{channel.paused ? 'استئناف' : 'إيقاف مؤقت'}</button>
      </div></td> : null}</tr>)}
      {channels.data.data.length === 0 ? <tr><td colSpan={canManage ? 7 : 6}>لا توجد قنوات دفع.</td></tr> : null}
    </tbody></table></div>
    {canManage ? <form className="form-grid" onSubmit={(event) => void create(event)}><h2>إضافة قناة</h2>
      <label className="form-field"><span>الاسم</span><input className="input" name="name" required /></label>
      <label className="form-field"><span>النوع</span><select className="input" name="type"><option value="wallet">محفظة إلكترونية</option><option value="bank">حساب بنكي</option><option value="instapay">إنستاباي</option><option value="postal">بريد</option><option value="other">أخرى</option></select></label>
      <label className="form-field"><span>الرقم</span><input className="input" name="number" required /></label>
      <label className="form-field"><span>مرشح المرسل</span><input className="input" name="sender_filter" required /></label>
      <label className="form-field"><span>كلمات مفتاحية للإيداع (افصل بينها بفواصل)</span><input className="input" name="deposit_keywords" /></label>
      <label className="form-field"><span>كلمات مفتاحية للسحب (افصل بينها بفواصل)</span><input className="input" name="withdrawal_keywords" /></label>
      <label><input defaultChecked name="deposit_enabled" type="checkbox" /> تفعيل الإيداعات</label>
      <label><input defaultChecked name="withdrawal_enabled" type="checkbox" /> تفعيل السحوبات</label>
      <label className="form-field"><span>أكد كلمة المرور لإضافة القناة</span><input autoComplete="current-password" className="input" name="confirm_password" required type="password" /></label>
      <button className="button button-primary" disabled={saving} type="submit">{saving ? 'جارٍ الحفظ…' : 'إضافة القناة'}</button>
    </form> : null}

    <Modal open={pendingToggle !== null} title={pendingToggle?.paused ? 'إيقاف القناة مؤقتاً' : 'استئناف القناة'} onClose={() => { if (!saving) setPendingToggle(null); }}>
      {pendingToggle ? <form className="stack-form" onSubmit={(event) => void toggle(event)}>
        <p>{pendingToggle.channel.name}</p>
        <label className="form-field"><span>كلمة المرور للتأكيد</span><input autoComplete="current-password" className="input" name="confirm_password" required type="password" /></label>
        <div className="button-row"><button className="button button-primary" disabled={saving} type="submit">{saving ? 'جارٍ التنفيذ…' : 'تأكيد الإجراء'}</button><button className="button button-secondary" disabled={saving} onClick={() => setPendingToggle(null)} type="button">إلغاء</button></div>
      </form> : null}
    </Modal>

    <Modal open={editing !== null} title="تعديل قناة الدفع" onClose={() => { if (!saving) setEditing(null); }}>
      {editing ? <form className="stack-form" onSubmit={(event) => void update(event)}>
        <label className="form-field"><span>الاسم</span><input className="input" defaultValue={editing.name} name="name" required /></label>
        <label className="form-field"><span>النوع</span><select className="input" defaultValue={editing.type} name="type"><option value="wallet">محفظة إلكترونية</option><option value="bank">حساب بنكي</option><option value="instapay">إنستاباي</option><option value="postal">بريد</option><option value="other">أخرى</option></select></label>
        <label className="form-field"><span>الرقم</span><input className="input" defaultValue={editing.number} name="number" required /></label>
        <label className="form-field"><span>مرشح المرسل</span><input className="input" defaultValue={editing.sender_filter} name="sender_filter" required /></label>
        <label className="form-field"><span>كلمات مفتاحية للإيداع (افصل بينها بفواصل)</span><input className="input" defaultValue={editing.deposit_keywords?.join(', ') ?? ''} name="deposit_keywords" /></label>
        <label className="form-field"><span>كلمات مفتاحية للسحب (افصل بينها بفواصل)</span><input className="input" defaultValue={editing.withdrawal_keywords?.join(', ') ?? ''} name="withdrawal_keywords" /></label>
        <label><input defaultChecked={editing.deposit_enabled} name="deposit_enabled" type="checkbox" /> تفعيل الإيداعات</label>
        <label><input defaultChecked={editing.withdrawal_enabled} name="withdrawal_enabled" type="checkbox" /> تفعيل السحوبات</label>
        <label className="form-field"><span>كلمة المرور للتأكيد</span><input autoComplete="current-password" className="input" name="confirm_password" required type="password" /></label>
        <div className="button-row"><button className="button button-primary" disabled={saving} type="submit">{saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button><button className="button button-secondary" disabled={saving} onClick={() => setEditing(null)} type="button">إلغاء</button></div>
      </form> : null}
    </Modal>
  </section>;
}

export function MobileChannelsPage() {
  return <MobileApiAccess permission="mobile.channels.view">{({ token, user }) => <ChannelManager token={token} canManage={user.permissions.includes('*') || user.permissions.includes('mobile.channels.manage')} />}</MobileApiAccess>;
}
