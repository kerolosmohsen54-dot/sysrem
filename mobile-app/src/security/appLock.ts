import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.erp.companion.app-lock';
const ACCOUNT = 'erp-app-lock';
export type LockSecret = { salt: string; hash: string; biometric: boolean };
const native = () => NativeModules.ErpCompanionSecurity;

export function shouldLockAfterBackground(backgroundAt: number, now: number): boolean {
  return backgroundAt > 0 && now - backgroundAt >= 120_000;
}

export async function readLockSecret(): Promise<LockSecret | null> {
  const value = await Keychain.getGenericPassword({ service: SERVICE });
  if (!value) return null;
  try { return JSON.parse(value.password) as LockSecret; } catch { return null; }
}

export async function setPin(pin: string, biometric: boolean): Promise<void> {
  if (!native()?.createPinHash) throw new Error('إعداد الرقم السري الآمن غير متاح على هذا الجهاز.');
  const hashed = await native().createPinHash(pin);
  await Keychain.setGenericPassword(ACCOUNT, JSON.stringify({ ...hashed, biometric }), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyPin(pin: string, secret: LockSecret): Promise<boolean> {
  if (!native()?.verifyPin) return false;
  return native().verifyPin(pin, secret.salt, secret.hash);
}
