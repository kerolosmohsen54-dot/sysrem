import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { setPin, shouldLockAfterBackground, verifyPin } from '../src/security/appLock';

describe('app lock', () => {
  test('requires a PIN on app start when a secret exists and verifies through salted native hash', async () => {
    const modules = NativeModules as any;
    modules.ErpCompanionSecurity = { verifyPin: jest.fn().mockResolvedValue(true) };
    const secret = { salt: 'random-salt', hash: 'derived-hash', biometric: false };
    await expect(verifyPin('123456', secret)).resolves.toBe(true);
    expect(modules.ErpCompanionSecurity.verifyPin).toHaveBeenCalledWith('123456', 'random-salt', 'derived-hash');
  });

  test('stores the salted PIN hash in device protected Keychain storage', async () => {
    const modules = NativeModules as any;
    modules.ErpCompanionSecurity = { createPinHash: jest.fn().mockResolvedValue({ salt: 'salt', hash: 'derived' }) };
    await setPin('123456', true);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith('erp-app-lock', JSON.stringify({ salt: 'salt', hash: 'derived', biometric: true }), expect.objectContaining({ service: 'com.erp.companion.app-lock' }));
  });

  test('locks only after two minutes in background', () => {
    expect(shouldLockAfterBackground(10_000, 129_999)).toBe(false);
    expect(shouldLockAfterBackground(10_000, 130_000)).toBe(true);
    expect(shouldLockAfterBackground(0, 500_000)).toBe(false);
  });
});
