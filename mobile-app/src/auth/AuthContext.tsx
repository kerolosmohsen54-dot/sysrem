import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ApiError, createApiClient } from '../api/http';
import { createQueueAwareApi, logFailedOutboxDiagnostics, outboxStore, pullMobileSync, replayOutbox } from '../offline';
import { clearToken, readToken, storeToken } from './session';
import { API_BASE_URL } from '../config';

export type MobileUser = { id: number; username: string; display_name: string; permissions: string[] };
type AuthValue = {
  loading: boolean;
  user: MobileUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof createApiClient>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const rawApi = useMemo(() => createApiClient(API_BASE_URL, readToken, clearToken), []);
  const api = useMemo(() => createQueueAwareApi(rawApi, outboxStore, () => isOnline), [rawApi, isOnline]);

  useEffect(() => NetInfo.addEventListener(state => {
    setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }), []);

  useEffect(() => {
    let active = true;
    readToken().then(async token => {
      if (!token) return;
      try {
        const response: any = await rawApi.get('/mobile/auth/me');
        if (active) {
          const counts = await outboxStore.counts(); const owner = await outboxStore.getOwner();
          if (owner && owner !== response.data.user.username && counts.pending + counts.failed > 0) { await clearToken(); return; }
          await outboxStore.setOwner(response.data.user.username);
          setUser(response.data.user); NativeModules.ErpCompanionCapture?.setSessionActive(true);
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
    }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [rawApi]);

  useEffect(() => {
    if (!user || !isOnline) return;
    let active = true;
    const synchronize = async () => {
      try {
        await replayOutbox(rawApi, outboxStore);
        await pullMobileSync(rawApi, outboxStore);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) setUser(null);
      }
    };
    void synchronize();
    const timer = setInterval(() => { if (active) void synchronize(); }, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [rawApi, user, isOnline]);

  const value = useMemo<AuthValue>(() => ({
    loading,
    user,
    api,
    login: async (username, password) => {
      const response: any = await rawApi.post('/mobile/auth/login', {
        username,
        password,
        device_name: `رفيق MASTER ${Platform.OS === 'android' ? 'أندرويد' : 'آي أو إس'}`,
        device_model: String(Platform.Version),
      });
      await storeToken(response.data.access_token);
      const current: any = await rawApi.get('/mobile/auth/me');
      const counts = await outboxStore.counts(); const owner = await outboxStore.getOwner();
      if (owner && owner !== current.data.user.username && counts.pending + counts.failed > 0) {
        await clearToken(); throw new Error('العمليات المعلقة محفوظة لمستخدم آخر. سجّل الدخول بحساب ذلك المستخدم لمزامنتها.');
      }
      await outboxStore.setOwner(current.data.user.username);
      NativeModules.ErpCompanionCapture?.setSessionActive(true);
      setUser(current.data.user);
      if (__DEV__ || NativeModules.DevSettings != null) void logFailedOutboxDiagnostics(outboxStore).catch(() => undefined);
      DeviceEventEmitter.emit('app-lock.lock');
    },
    logout: async () => {
      const counts = await outboxStore.counts();
      const proceed = () => rawApi.post('/mobile/auth/logout', {}).catch(() => undefined).finally(async () => { NativeModules.ErpCompanionCapture?.setSessionActive(false); await clearToken(); setUser(null); });
      if (counts.pending + counts.failed === 0) { await proceed(); return; }
      await new Promise<void>(resolve => Alert.alert('عمليات غير متزامنة', `لديك ${counts.pending} معلقة و${counts.failed} فاشلة. سيبقى الصندوق محفوظاً.`, [
        { text: 'إلغاء', style: 'cancel', onPress: () => resolve() },
        { text: 'تسجيل الخروج', style: 'destructive', onPress: () => { void proceed().finally(resolve); } },
      ]));
    },
  }), [api, rawApi, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
