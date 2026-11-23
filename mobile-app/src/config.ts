import { NativeModules } from 'react-native';

// Android reads this from ignored android/local.properties through BuildConfig.
// iOS builds must provide their own native ERPCompanionConfig value.
export const API_BASE_URL: string = NativeModules.ErpCompanionConfig?.apiBaseUrl ?? '';