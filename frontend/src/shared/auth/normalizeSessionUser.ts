import type { SessionUser } from '../api/types';

type ApiUser = {
  id?: unknown;
  username?: unknown;
  name?: unknown;
  display_name?: unknown;
  role?: unknown;
  roles?: unknown;
  permissions?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeSessionUser(response: unknown): SessionUser {
  const envelope = isRecord(response) ? response : {};
  const data = isRecord(envelope.data) ? envelope.data : envelope;
  const user = isRecord(data.user) ? (data.user as ApiUser) : (data as ApiUser);
  const roles = Array.isArray(user.roles)
    ? user.roles.filter((role): role is string => typeof role === 'string')
    : [];

  if (
    (typeof user.id !== 'number' && typeof user.id !== 'string') ||
    typeof user.username !== 'string' ||
    !Array.isArray(user.permissions) ||
    !user.permissions.every((permission): permission is string => typeof permission === 'string')
  ) {
    throw new Error('بيانات المستخدم المسجل دخوله غير مكتملة.');
  }

  return {
    id: user.id,
    username: user.username,
    name:
      (typeof user.name === 'string' && user.name) ||
      (typeof user.display_name === 'string' && user.display_name) ||
      user.username,
    role: typeof user.role === 'string' ? user.role : roles[0] ?? 'unknown',
    roles,
    permissions: user.permissions,
  };
}
