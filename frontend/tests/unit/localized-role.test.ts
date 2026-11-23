import { describe, expect, it } from 'vitest';
import { normalizeSessionUser } from '../../src/shared/auth/normalizeSessionUser';
import { displayRoles } from '../../src/shared/utils/labels';

describe('localized session roles', () => {
  it('reads role codes from the auth response and renders Arabic labels', () => {
    const user = normalizeSessionUser({
      data: {
        user: {
          id: 5,
          username: 'karas',
          display_name: 'karas',
          roles: ['owner', 'accountant'],
          permissions: ['treasury.view'],
        },
      },
    });

    expect(user.role).toBe('owner');
    expect(displayRoles(user.roles)).toBe('المالك، محاسب');
  });

  it('does not expose an English fallback when the role is unavailable', () => {
    expect(displayRoles(undefined)).toBe('مستخدم');
  });
});
