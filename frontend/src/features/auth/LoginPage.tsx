import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { appRoutes } from '../../shared/constants/routes';
import { apiRequest } from '../../shared/api/http';
import { ApiError } from '../../shared/api/errors';
import type { LoginInput, SessionUser } from '../../shared/api/types';
import { useAuth } from '../../shared/auth/AuthProvider';
import { normalizeSessionUser } from '../../shared/auth/normalizeSessionUser';
import { FormField } from '../../shared/components/FormField';
import { PageState } from '../../shared/components/PageState';
import { ar } from '../../shared/i18n/ar';
import { AuthLayout } from '../../app/layouts/AuthLayout';

const loginSchema = z.object({
  username: z.string().trim().min(1, ar.common.usernameRequired),
  password: z.string().min(1, ar.common.passwordRequired),
});

type LocationState = {
  from?: {
    pathname: string;
    search: string;
    hash: string;
  };
};

type LoginOption = { username: string; display_name: string };

function landingRoute(user: SessionUser, state: LocationState | null): string {
  const from = state?.from;
  if (from) return `${from.pathname}${from.search}${from.hash}`;
  return (
    appRoutes.find(
      (route) =>
        user.permissions.includes('*') ||
        (Array.isArray(route.permission)
          ? route.permission.some((permission) => user.permissions.includes(permission))
          : user.permissions.includes(route.permission)),
    )?.path ?? '/dashboard'
  );
}

export function LoginPage() {
  const { status, user, setAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const loginOptions = useQuery({
    queryKey: ['/auth/login-options'],
    queryFn: () => apiRequest<{ data: LoginOption[] }>('/auth/login-options').then((result) => result.data),
    staleTime: 5 * 60_000,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  if (status === 'loading') return <PageState kind="loading" />;
  if (status === 'authenticated' && user) {
    return <Navigate to={landingRoute(user, location.state as LocationState | null)} replace />;
  }

  const submit = handleSubmit(async (values) => {
    setServerError('');
    try {
      await apiRequest<unknown>('/auth/login', {
        method: 'POST',
        body: values,
      });
      const response = await apiRequest<unknown>('/auth/me');
      const user = normalizeSessionUser(response);
      setAuthenticated(user);
      navigate(landingRoute(user, location.state as LocationState | null), {
        replace: true,
      });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : ar.common.networkError);
    }
  });

  return (
    <AuthLayout>
      <section className="login-card">
        <h1 className="visually-hidden">{ar.auth.loginTitle}</h1>
        <p className="visually-hidden">{ar.auth.loginDescription}</p>
        <form className="stack-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="login-username">
              {ar.auth.username}<span aria-hidden="true" className="required-mark"> *</span>
            </label>
            {loginOptions.isLoading || loginOptions.data?.length ? (
              <select
                autoComplete="username"
                className="input login-user-select"
                id="login-username"
                required
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'login-username-error' : undefined}
                {...register('username')}
              >
                <option value="">{loginOptions.isLoading ? 'جارٍ تحميل المستخدمين…' : 'اختر المستخدم'}</option>
                {loginOptions.data?.map((option) => (
                  <option key={option.username} value={option.username}>
                    {option.display_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                autoComplete="username"
                className="input"
                id="login-username"
                required
                {...register('username')}
              />
            )}
            {loginOptions.isError && !errors.username && (
              <div className="field-hint">تعذر تحميل القائمة؛ أدخل اسم المستخدم يدوياً.</div>
            )}
            {errors.username && (
              <div className="field-error" id="login-username-error" role="alert">
                {errors.username.message}
              </div>
            )}
          </div>
          <FormField
            autoComplete="current-password"
            id="login-password"
            label={ar.auth.password}
            required
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          {serverError && (
            <p role="alert" className="field-error">
              {serverError}
            </p>
          )}
          <button
            className="button button-primary login-submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? ar.auth.submitting : ar.auth.submit}
          </button>
        </form>
        <small className="auth-version">{ar.app.version}</small>
      </section>
    </AuthLayout>
  );
}
