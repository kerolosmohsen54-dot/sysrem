import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../shared/api/errors';
import { useAuth } from '../../shared/auth/AuthProvider';
import { mobileApiRequest, mobileErrorDetails, type MobileApiUser } from './api';

type MobileGrant = { token: string; user: MobileApiUser };
let inMemoryGrant: MobileGrant | null = null;

export function resetMobileApiAccess() { inMemoryGrant = null; }
type MobileLoginResponse = { data: { access_token: string } };
type MobileMeResponse = { data: { user: MobileApiUser } };
type MobileApiAccessProps = { permission: string; optional?: boolean; children: (grant: MobileGrant) => ReactNode };

export function MobileApiAccess({ permission, optional = false, children }: MobileApiAccessProps) {
  const { user: webUser } = useAuth();
  const [grant, setGrant] = useState<MobileGrant | null>(inMemoryGrant?.user.username === webUser?.username ? inMemoryGrant : null);
  const [username, setUsername] = useState(webUser?.username ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(!optional);
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(''); setDetails([]);
    try {
      const login = await mobileApiRequest<MobileLoginResponse>(null, '/mobile/auth/login', { method: 'POST', body: { username: username.trim(), password, device_name: 'ربط النظام عبر الويب', device_model: 'متصفح' } });
      const profile = await mobileApiRequest<MobileMeResponse>(login.data.access_token, '/mobile/auth/me');
      if (profile.data.user.username !== webUser?.username) throw new Error('استخدم الحساب نفسه المسجل به في النظام.');
      const next = { token: login.data.access_token, user: profile.data.user };
      if (!next.user.permissions.includes('*') && !next.user.permissions.includes(permission)) throw new ApiError(403, 'FORBIDDEN', {});
      inMemoryGrant = next; setGrant(next); setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر التحقق من الوصول إلى خدمات الهاتف.'); setDetails(mobileErrorDetails(cause));
    } finally { setSaving(false); }
  };
  if (grant && (grant.user.permissions.includes('*') || grant.user.permissions.includes(permission))) return <>{children(grant)}</>;
  if (optional && !connecting) return <>{children({ token: '', user: { id: 0, username: webUser?.username ?? '', display_name: '', permissions: [] } })}<button className="button" onClick={() => setConnecting(true)} type="button">ربط بيانات الهاتف</button></>;
  return <section className="page inventory-page"><header className="page-heading"><div><h1>الوصول إلى خدمات الهاتف</h1><p>سجّل الدخول بحساب النظام نفسه. يبقى رمز الوصول في الذاكرة ولا يُحفظ في المتصفح.</p></div></header><form className="form-grid" onSubmit={(event) => void signIn(event)}><label className="form-field"><span>اسم المستخدم</span><input autoComplete="username" className="input" onChange={(event) => setUsername(event.currentTarget.value)} required value={username} /></label><label className="form-field"><span>كلمة المرور</span><input autoComplete="current-password" className="input" onChange={(event) => setPassword(event.currentTarget.value)} required type="password" value={password} /></label>{error ? <p role="alert">{error}</p> : null}{details.map((detail) => <p key={detail} role="alert">{detail}</p>)}<button className="button button-primary" disabled={saving} type="submit">{saving ? 'جارٍ تسجيل الدخول…' : 'ربط بيانات الهاتف'}</button></form></section>;
}
