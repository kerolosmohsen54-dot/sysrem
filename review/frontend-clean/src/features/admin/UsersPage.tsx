import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/errors';
import { DataTable, type DataColumn } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { Modal } from '../../shared/components/Modal';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import type { ListQuery } from '../inventory/api';
import { assignUserRoles, createUser, listUsers, updateUser, type AdminUser } from './api';

export function UsersPage() {
  const client = useQueryClient();
  const [query, setQuery] = useState<ListQuery>({ page: 1, perPage: 10, search: '' });
  const users = useQuery({
    queryKey: ['/users', query],
    queryFn: () => listUsers(query),
  });
  const [dialogUser, setDialogUser] = useState<AdminUser | null | undefined>(undefined);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: async ({
      user,
      values,
      selectedRoles,
    }: {
      user: AdminUser | null;
      values: FormData;
      selectedRoles: string[];
    }) => {
      if (!user) {
        return createUser({
          username: String(values.get('username') ?? '').trim(),
          display_name: String(values.get('display_name') ?? '').trim(),
          phone: String(values.get('phone') ?? '').trim() || null,
          email: String(values.get('email') ?? '').trim() || null,
          password: String(values.get('password') ?? ''),
          password_confirmation: String(values.get('password_confirmation') ?? ''),
          role_codes: selectedRoles,
        });
      }
      const updated = await updateUser(user.id, {
        username: String(values.get('username') ?? '').trim(),
        display_name: String(values.get('display_name') ?? '').trim(),
        phone: String(values.get('phone') ?? '').trim() || null,
        email: String(values.get('email') ?? '').trim() || null,
        is_active: values.get('is_active') === 'on',
      });
      if (selectedRoles.join('\0') !== user.roles.join('\0')) {
        return assignUserRoles(user.id, selectedRoles);
      }
      return updated;
    },
    onSuccess: async () => {
      setDialogUser(undefined);
      await client.invalidateQueries({ queryKey: ['/users'] });
    },
  });

  if (users.isLoading) return <PageState kind="loading" />;
  if (users.isError || !users.data) {
    return (
      <PageState
        kind="error"
        message={ar.common.requestFailed}
        onRetry={() => void users.refetch()}
      />
    );
  }

  const columns: DataColumn<AdminUser>[] = [
    { key: 'username', header: ar.auth.username, render: (row) => row.username },
    { key: 'name', header: ar.admin.displayName, render: (row) => row.display_name },
    {
      key: 'roles',
      header: ar.admin.roleCodes,
      render: (row) => row.roles.join('، ') || ar.common.notProvided,
    },
    {
      key: 'status',
      header: ar.common.status,
      render: (row) => (row.is_active ? ar.common.active : ar.common.inactive),
    },
    {
      key: 'actions',
      header: ar.common.actions,
      render: (row) => (
        <button
          className="button button-secondary"
          onClick={() => {
            setError('');
            setDialogUser(row);
          }}
          type="button"
        >
          {ar.common.edit}
        </button>
      ),
    },
  ];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;
    const values = new FormData(form);
    const selectedRoles = String(values.get('role_codes') ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
    if (!selectedRoles.length) {
      setError(ar.admin.roleRequired);
      return;
    }
    if (!dialogUser) {
      const password = String(values.get('password') ?? '');
      if (password !== String(values.get('password_confirmation') ?? '')) {
        setError(ar.admin.passwordMismatch);
        return;
      }
    }
    try {
      await save.mutateAsync({
        user: dialogUser ?? null,
        values,
        selectedRoles,
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : ar.common.networkError);
    }
  };

  return (
    <section className="page inventory-page">
      <header className="page-heading">
        <div>
          <h1>{ar.nav.users}</h1>
          <p>{ar.admin.usersDescription}</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setError('');
            setDialogUser(null);
          }}
          type="button"
        >
          {ar.admin.addUser}
        </button>
      </header>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span>{ar.common.search}</span>
          <input
            aria-label={ar.common.search}
            className="input"
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                page: 1,
                search: event.currentTarget.value,
              }))
            }
            type="search"
            value={query.search}
          />
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={users.data.data}
        getRowKey={(row) => row.id}
        emptyMessage={ar.common.noResults}
      />
      <nav aria-label={ar.inventory.paginationLabel} className="inventory-pagination">
        <button
          className="button button-secondary"
          disabled={query.page <= 1}
          onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
          type="button"
        >
          {ar.common.previous}
        </button>
        <span>
          {ar.common.page} {query.page} {ar.common.of} {users.data.meta.last_page}
        </span>
        <button
          className="button button-secondary"
          disabled={query.page >= users.data.meta.last_page}
          onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          type="button"
        >
          {ar.common.next}
        </button>
      </nav>
      {dialogUser !== undefined && (
        <Modal
          open
          title={dialogUser ? ar.admin.editUser : ar.admin.addUser}
          onClose={() => setDialogUser(undefined)}
        >
          <form className="stack-form" onSubmit={(event) => void submit(event)}>
            <FormField
              id="user-username"
              label={ar.auth.username}
              name="username"
              defaultValue={dialogUser?.username ?? ''}
              required
              maxLength={100}
            />
            <FormField
              id="user-display-name"
              label={ar.admin.displayName}
              name="display_name"
              defaultValue={dialogUser?.display_name ?? ''}
              required
              maxLength={160}
            />
            <FormField
              id="user-phone"
              label={ar.common.phone}
              name="phone"
              defaultValue={dialogUser?.phone ?? ''}
              type="tel"
            />
            <FormField
              id="user-email"
              label={ar.common.email}
              name="email"
              defaultValue={dialogUser?.email ?? ''}
              type="email"
            />
            {!dialogUser && (
              <>
                <FormField
                  id="user-password"
                  label={ar.admin.userPassword}
                  name="password"
                  type="password"
                  minLength={12}
                  required
                />
                <FormField
                  id="user-password-confirmation"
                  label={ar.admin.confirmPassword}
                  name="password_confirmation"
                  type="password"
                  minLength={12}
                  required
                />
              </>
            )}
            {dialogUser && (
              <label className="inventory-checkbox">
                <input defaultChecked={dialogUser.is_active} name="is_active" type="checkbox" />
                {ar.common.active}
              </label>
            )}
            <FormField
              id="user-role-codes"
              label={ar.admin.roleCodes}
              name="role_codes"
              defaultValue={dialogUser?.roles.join(', ') ?? ''}
              required
              hint={ar.admin.roleCodesHelp}
            />
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setDialogUser(undefined)}
                type="button"
              >
                {ar.common.cancel}
              </button>
              <button className="button button-primary" disabled={save.isPending} type="submit">
                {ar.common.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
