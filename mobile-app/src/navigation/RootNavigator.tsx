import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ChannelHomeScreen } from '../screens/ChannelHomeScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { ManualDepositScreen } from '../screens/ManualDepositScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppLockScreen } from '../screens/AppLockScreen';
import { LockSecret, readLockSecret, shouldLockAfterBackground } from '../security/appLock';

const Stack = createNativeStackNavigator();
export function RootNavigator() {
  const { loading, user } = useAuth();
  const [lockSecret, setLockSecret] = useState<LockSecret | null>(null);
  const [lockReady, setLockReady] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => { void readLockSecret().then(secret => { setLockSecret(secret); setLocked(Boolean(secret)); }).finally(() => setLockReady(true)); }, []);
  useEffect(() => {
    const configured = DeviceEventEmitter.addListener('app-lock.configured', () => { void readLockSecret().then(secret => { setLockSecret(secret); setLocked(Boolean(secret)); }); });
    const relock = DeviceEventEmitter.addListener('app-lock.lock', () => { if (lockSecret) setLocked(true); });
    let backgroundAt = 0;
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') backgroundAt = Date.now();
      else if (shouldLockAfterBackground(backgroundAt, Date.now()) && lockSecret) setLocked(true);
    });
    return () => { configured.remove(); relock.remove(); appState.remove(); };
  }, [lockSecret]);
  if (loading) return <ActivityIndicator accessibilityLabel="جارٍ استعادة الجلسة" style={{ flex: 1 }} />;
  if (!lockReady) return <ActivityIndicator style={{ flex: 1 }} />;
  if (user && locked && lockSecret) return <AppLockScreen secret={lockSecret} onUnlock={() => setLocked(false)} />;
  return <Stack.Navigator screenOptions={{ headerShown: false }}>
    {user ? <><Stack.Screen name="Home" component={ChannelHomeScreen} /><Stack.Screen name="Inbox" component={InboxScreen} /><Stack.Screen name="ManualDeposit" component={ManualDepositScreen} /><Stack.Screen name="Settings" component={SettingsScreen} /></> : <Stack.Screen name="Login" component={LoginScreen} /> }
  </Stack.Navigator>;
}
