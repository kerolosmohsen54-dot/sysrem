import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthProvider';
import { ApiError } from '../../shared/api/errors';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import {
  getGeneralSettings,
  getSalesTaxSettings,
  updateGeneralSettings,
  updateSalesTaxSettings,
} from './api';

const ratePattern = /^\d+(\.\d{1,6})?$/;

export function SettingsPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const canManageGeneral = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('users.manage'),
  );
  const canManageTax = Boolean(
    user?.permissions.includes('*') || user?.permissions.includes('sales_tax.manage'),
  );
  const settings = useQuery({
    queryKey: ['/settings/sales-tax'],
    queryFn: getSalesTaxSettings,
    enabled: canManageTax,
  });
  const general = useQuery({
    queryKey: ['/settings/general'],
    queryFn: getGeneralSettings,
    enabled: canManageGeneral,
  });
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyTaxNumber, setCompanyTaxNumber] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [orderPrefix, setOrderPrefix] = useState('');
  const [containerPrefix, setContainerPrefix] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [reminderPhone, setReminderPhone] = useState('');
  const [maxActiveUsers, setMaxActiveUsers] = useState('10');
  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState('');
  const [method, setMethod] = useState<'inclusive' | 'exclusive' | ''>('');
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');
  const [taxError, setTaxError] = useState('');
  const [taxSuccess, setTaxSuccess] = useState('');

  useEffect(() => {
    if (!settings.data) return;
    setEnabled(settings.data.enabled);
    setRate(settings.data.rate ?? '');
    setMethod(settings.data.calculation_method ?? '');
  }, [settings.data]);

  useEffect(() => {
    if (!general.data) return;
    setCompanyName(general.data.company_name ?? '');
    setCompanyAddress(general.data.company_address ?? '');
    setCompanyPhone(general.data.company_phone ?? '');
    setCompanyEmail(general.data.company_email ?? '');
    setCompanyTaxNumber(general.data.company_tax_number ?? '');
    setInvoicePrefix(general.data.invoice_number_prefix ?? '');
    setOrderPrefix(general.data.order_number_prefix ?? '');
    setContainerPrefix(general.data.container_number_prefix ?? '');
    setReminderEnabled(general.data.daily_summary_reminder_enabled ?? false);
    setReminderTime(general.data.daily_summary_reminder_time ?? '21:00');
    setReminderPhone(general.data.daily_summary_whatsapp_phone ?? '');
    setMaxActiveUsers(String(general.data.max_active_users));
  }, [general.data]);

  const submitGeneral = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError('');
    setGeneralSuccess('');
    try {
      await updateGeneralSettings({
        company_name: companyName.trim() || null,
        company_address: companyAddress.trim() || null,
        company_phone: companyPhone.trim() || null,
        company_email: companyEmail.trim() || null,
        company_tax_number: companyTaxNumber.trim() || null,
        invoice_number_prefix: invoicePrefix.trim() || null,
        order_number_prefix: orderPrefix.trim() || null,
        container_number_prefix: containerPrefix.trim() || null,
        daily_summary_reminder_enabled: reminderEnabled,
        daily_summary_reminder_time: reminderTime || null,
        daily_summary_whatsapp_phone: reminderPhone.trim() || null,
        max_active_users: Number(maxActiveUsers),
      });
      setGeneralSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/settings/general'] });
    } catch (cause) {
      setGeneralError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedRate = rate.trim();
    if (normalizedRate && !ratePattern.test(normalizedRate)) {
      setTaxError(ar.admin.invalidTaxRate);
      return;
    }
    if (enabled && (!normalizedRate || !method)) {
      setTaxError(ar.admin.taxFieldsRequired);
      return;
    }

    setTaxError('');
    setTaxSuccess('');
    try {
      await updateSalesTaxSettings({
        enabled,
        rate: normalizedRate || null,
        calculation_method: method || null,
      });
      setTaxSuccess(ar.common.actionSaved);
      await client.invalidateQueries({ queryKey: ['/settings/sales-tax'] });
    } catch (cause) {
      setTaxError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  if ((canManageTax && settings.isLoading) || (canManageGeneral && general.isLoading)) {
    return <PageState kind="loading" />;
  }
  if (
    (canManageTax && (settings.isError || !settings.data)) ||
    (canManageGeneral && (general.isError || !general.data))
  ) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => {
          if (canManageTax) void settings.refetch();
          if (canManageGeneral) void general.refetch();
        }}
      />
    );
  }

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.settings}</h1>
          <p>{ar.admin.generalSettingsWaiting}</p>
        </div>
      </header>
      {canManageGeneral && (
        <section aria-labelledby="general-settings-heading">
          <h2 id="general-settings-heading">{ar.admin.generalSettingsWaiting}</h2>
          {generalError && (
            <p className="field-error" role="alert">
              {generalError}
            </p>
          )}
          {generalSuccess && (
            <p className="inline-success" role="status">
              {generalSuccess}
            </p>
          )}
          <form className="stack-form" onSubmit={(event) => void submitGeneral(event)}>
            <FormField
              id="company-name"
              label={ar.admin.companyName}
              value={companyName}
              onChange={(event) => setCompanyName(event.currentTarget.value)}
            />
            <FormField
              id="company-address"
              label={ar.admin.companyAddress}
              value={companyAddress}
              onChange={(event) => setCompanyAddress(event.currentTarget.value)}
            />
            <FormField
              id="company-phone"
              label={ar.admin.companyPhone}
              value={companyPhone}
              onChange={(event) => setCompanyPhone(event.currentTarget.value)}
            />
            <FormField
              id="company-email"
              label={ar.admin.companyEmail}
              type="email"
              value={companyEmail}
              onChange={(event) => setCompanyEmail(event.currentTarget.value)}
            />
            <FormField
              id="company-tax-number"
              label={ar.admin.companyTaxNumber}
              value={companyTaxNumber}
              onChange={(event) => setCompanyTaxNumber(event.currentTarget.value)}
            />
            <FormField
              id="invoice-prefix"
              label={ar.admin.invoicePrefix}
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.currentTarget.value)}
            />
            <FormField
              id="order-prefix"
              label={ar.admin.orderPrefix}
              value={orderPrefix}
              onChange={(event) => setOrderPrefix(event.currentTarget.value)}
            />
            <FormField
              id="container-prefix"
              label={ar.admin.containerPrefix}
              value={containerPrefix}
              onChange={(event) => setContainerPrefix(event.currentTarget.value)}
            />
            <FormField
              id="max-active-users"
              label="الحد الأقصى للحسابات النشطة"
              type="number"
              min={general.data?.active_user_count ?? 1}
              max={500}
              required
              value={maxActiveUsers}
              onChange={(event) => setMaxActiveUsers(event.currentTarget.value)}
            />
            <p className="field-hint">الحسابات النشطة حالياً: {general.data?.active_user_count} من {maxActiveUsers || general.data?.max_active_users}. لا يمكن إضافة حساب أو إعادة تفعيله بعد بلوغ الحد.</p>
            <Link className="button button-secondary" to="/admin/users">إدارة الحسابات: إنشاء أو حذف حساب</Link>
            <h3>تذكير الملخص اليومي</h3>
            <label className="form-field checkbox-field">
              <input checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.currentTarget.checked)} type="checkbox" />
              <span>تفعيل التذكير أثناء فتح النظام</span>
            </label>
            <FormField id="daily-summary-reminder-time" label="وقت التذكير" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.currentTarget.value)} />
            <FormField id="daily-summary-whatsapp-phone" label="رقم واتساب" placeholder="2010..." type="tel" value={reminderPhone} onChange={(event) => setReminderPhone(event.currentTarget.value)} />
            <button className="button button-primary" type="submit">
              {ar.admin.saveGeneralSettings}
            </button>
          </form>
        </section>
      )}
      {canManageTax && (
        <section aria-labelledby="sales-tax-heading">
          <h2 id="sales-tax-heading">{ar.admin.salesTax}</h2>
          {taxError && (
            <p className="field-error" role="alert">
              {taxError}
            </p>
          )}
          {taxSuccess && (
            <p className="inline-success" role="status">
              {taxSuccess}
            </p>
          )}
          <form className="stack-form" onSubmit={submit}>
            <label className="form-field checkbox-field">
              <input
                checked={enabled}
                onChange={(event) => setEnabled(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>{ar.admin.taxEnabled}</span>
            </label>
            <FormField
              id="sales-tax-rate"
              inputMode="decimal"
              label={ar.admin.taxRate}
              onChange={(event) => setRate(event.currentTarget.value)}
              pattern="^\d+(\.\d{1,6})?$"
              required={enabled}
              value={rate}
            />
            <label className="form-field">
              <span>{ar.admin.taxCalculationMethod}</span>
              <select
                className="input"
                onChange={(event) => {
                  const selected = event.currentTarget.value;
                  setMethod(selected === 'inclusive' || selected === 'exclusive' ? selected : '');
                }}
                required={enabled}
                value={method}
              >
                <option value="">{ar.common.select}</option>
                <option value="inclusive">{ar.admin.taxInclusive}</option>
                <option value="exclusive">{ar.admin.taxExclusive}</option>
              </select>
            </label>
            <button className="button button-primary" type="submit">
              {ar.common.save}
            </button>
          </form>
        </section>
      )}
    </section>
  );
}
