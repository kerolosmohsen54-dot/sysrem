import * as Keychain from 'react-native-keychain';
import { clearToken, readToken, storeToken } from '../src/auth/session';

const mocked = Keychain as jest.Mocked<typeof Keychain>;

describe('secure mobile token store', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the bearer token in device-only protected Keychain storage', async () => {
    await storeToken('opaque-mobile-token');
    expect(mocked.setGenericPassword).toHaveBeenCalledWith(
      'erp-mobile-session',
      'opaque-mobile-token',
      expect.objectContaining({
        service: 'com.erp.companion.mobile-token',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    );
  });

  it('reads and clears the secure token', async () => {
    (mocked.getGenericPassword as jest.Mock).mockResolvedValueOnce({ username: 'session', password: 'secret-token' });
    await expect(readToken()).resolves.toBe('secret-token');
    await clearToken();
    expect(mocked.resetGenericPassword).toHaveBeenCalledWith({ service: 'com.erp.companion.mobile-token' });
  });
});