import * as Keychain from 'react-native-keychain';
import { NativeModules } from 'react-native';

const SERVICE = 'com.erp.companion.mobile-token';
const ACCOUNT = 'erp-mobile-session';

export async function storeToken(token: string): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT, token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({ service: SERVICE });
  return credentials ? credentials.password : null;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
  NativeModules.ErpCompanionCapture?.setSessionActive(false);
}
