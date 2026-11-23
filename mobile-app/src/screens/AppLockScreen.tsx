import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { LockSecret, verifyPin } from '../security/appLock';

export function AppLockScreen({ secret, onUnlock }: { secret: LockSecret; onUnlock: () => void }) {
  const [pin, setPin] = useState(''); const [error, setError] = useState('');
  async function unlock() {
    if (await verifyPin(pin, secret)) { setPin(''); setError(''); onUnlock(); }
    else setError('الرقم السري غير صحيح.');
  }
  async function biometricUnlock() {
    try { const result = await new ReactNativeBiometrics().simplePrompt({ promptMessage: 'فتح قفل التطبيق' }); if (result.success) onUnlock(); else setError('تعذر التحقق من الهوية.'); }
    catch { setError('التحقق الحيوي غير متاح.'); }
  }
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#f5f7fb' }}>
    <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>التطبيق مقفل</Text>
    <TextInput accessibilityLabel="أدخل الرقم السري للتطبيق" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} style={{ backgroundColor: 'white', padding: 14, textAlign: 'center', fontSize: 24 }} />
    {error ? <Text accessibilityRole="alert" style={{ color: '#b42318', textAlign: 'center' }}>{error}</Text> : null}
    <Button title="فتح باستخدام الرقم السري" onPress={() => { void unlock(); }} />
    {secret.biometric ? <Button title="فتح باستخدام التحقق الحيوي" onPress={() => { void biometricUnlock(); }} /> : null}
  </View>;
}
