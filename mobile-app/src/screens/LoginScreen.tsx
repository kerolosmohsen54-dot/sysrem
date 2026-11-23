import React, { useState } from 'react';
import { ActivityIndicator, Button, Image, PermissionsAndroid, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { requestLocalNetworkAccess } from '../platform/localNetworkPermission';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(''); setBusy(true);
    try {
      const networkAllowed = await requestLocalNetworkAccess(
        Platform.OS,
        Number(Platform.Version),
        PermissionsAndroid,
      );
      if (!networkAllowed) {
        setError('اسمح للتطبيق بالوصول إلى الشبكة المحلية للاتصال بالخادم.');
        return;
      }
      await login(username.trim(), password);
    }
    catch (cause) {
      if (cause instanceof ApiError) {
        const fields = Object.entries(cause.details).map(([field, value]) => `${field}: ${String(value)}`).join('\n');
        setError(fields || cause.message);
      } else setError('تعذر تسجيل الدخول. حاول مرة أخرى.');
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f7fb' }}>
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 340, height: 150, padding: 10, marginBottom: 22, borderRadius: 14, backgroundColor: '#111415' }}>
      <Image accessibilityLabel="MASTER" resizeMode="contain" source={require('../assets/master-logo.png')} style={{ width: '100%', height: '100%' }} />
    </View>
    <Text accessibilityRole="header" accessibilityLabel="تسجيل الدخول إلى النظام" style={{ fontSize: 28, fontWeight: '700', textAlign: 'right', marginBottom: 24 }}>تسجيل الدخول إلى النظام</Text>
    <TextInput accessibilityLabel="اسم المستخدم" placeholder="اسم المستخدم" autoCapitalize="none" value={username} onChangeText={setUsername} style={field} />
    <TextInput accessibilityLabel="كلمة المرور" placeholder="كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} style={field} />
    {error ? <Text accessibilityRole="alert" style={{ color: '#b42318', marginBottom: 12 }}>{error}</Text> : null}
    {busy ? <ActivityIndicator accessibilityLabel="جارٍ تسجيل الدخول" /> : <Button title="دخول" onPress={submit} disabled={!username || !password} />}
  </SafeAreaView>;
}

const field = { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 14, textAlign: 'right' as const, backgroundColor: 'white' };
