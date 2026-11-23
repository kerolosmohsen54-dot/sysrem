import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Button, DeviceEventEmitter, Modal, NativeModules, PermissionsAndroid, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { outboxStore } from '../offline';
import { readLockSecret, setPin } from '../security/appLock';

export function SettingsScreen() {
  const { user } = useAuth();
  const [sms, setSms] = useState(false);
  const [smsRead, setSmsRead] = useState(false);
  const [notification, setNotification] = useState(false);
  const [batteryExempt, setBatteryExempt] = useState(true);
  const [notificationCaptureEnabled, setNotificationCaptureEnabled] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, failed: 0 });
  const [cursor, setCursor] = useState('0');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const refresh = useCallback(async () => {
    if (Platform.OS === 'android') {
      const module = NativeModules.ErpCompanionCapture;
      const values = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
        module?.hasNotificationAccess?.() ?? false,
        module?.isBatteryOptimizationExempt?.() ?? true,
        module?.isCaptureEnabled?.() ?? false,
      ]);
      setSms(Boolean(values[0])); setSmsRead(Boolean(values[1])); setNotification(Boolean(values[2])); setBatteryExempt(Boolean(values[3])); setNotificationCaptureEnabled(Boolean(values[4]));
    }
    setCounts(await outboxStore.counts()); setCursor(await outboxStore.getCursor()); setLastSyncAt(await outboxStore.getLastSyncAt());
    const secret = await readLockSecret(); setPinEnabled(Boolean(secret)); setBiometric(Boolean(secret?.biometric));
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); return undefined; }, [refresh]));
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => sub.remove(); }, [refresh]);

  async function configurePin() {
    if (Platform.OS !== 'android') { Alert.alert('قفل التطبيق', 'إعداد الرقم السري غير متاح على هذا الإصدار من نظام آي أو إس.'); return; }
    if (!/^\d{6}$/.test(pin)) { Alert.alert('الرقم السري', 'أدخل ستة أرقام بالضبط.'); return; }
    if (pin !== pinConfirm) { Alert.alert('الرقم السري', 'الرقمان السريان غير متطابقين.'); return; }
    let useBiometric = false;
    try {
      const biometrics = new ReactNativeBiometrics();
      const status = await biometrics.isSensorAvailable();
      if (status.available) useBiometric = (await biometrics.simplePrompt({ promptMessage: 'تفعيل الفتح بالتحقق الحيوي' })).success;
    } catch { /* PIN remains available without biometrics. */ }
    try {
      await setPin(pin, useBiometric); DeviceEventEmitter.emit('app-lock.configured');
      setPinValue(''); setPinConfirm(''); setPinModal(false); await refresh();
    } catch (error) { Alert.alert('تعذر إعداد الرقم السري', error instanceof Error ? error.message : 'حاول مرة أخرى.'); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', textAlign: 'right' }}>الإعدادات</Text>
      <Text>الحساب: {user?.display_name ?? user?.username}</Text>
      <Text>إذن استقبال الرسائل النصية: {sms ? 'مسموح' : 'غير مسموح'}</Text>
      <Text>التقاط رسائل SMS الجديدة يعمل تلقائيًا بعد السماح باستقبال SMS وتسجيل الدخول؛ لا يحتاج إذن الإشعارات أو تشغيل خدمة منفصلة.</Text>
      <Text>إذن قراءة الرسائل القديمة: {smsRead ? 'مسموح' : 'غير مسموح'} (لاختيار رسالة سابقة فقط)</Text>
      <Text>الوصول إلى الإشعارات (اختياري): {notification ? 'مفعّل' : 'غير مفعّل'}</Text>
      {Platform.OS === 'android' ? <Button title="إعداد وصول إشعارات التطبيقات (اختياري)" onPress={() => NativeModules.ErpCompanionCapture?.openNotificationSettings()} /> : null}
      <Text>إعداد البطارية اختياري لتحسين العمل بالخلفية، ولا يمنع التقاط SMS إذا لم تغيّره.</Text>
      {Platform.OS === 'android' ? <Button title={batteryExempt ? 'مستثنى من تحسين استهلاك البطارية (اختياري)' : 'إعدادات تحسين استهلاك البطارية (اختياري)'} onPress={() => NativeModules.ErpCompanionCapture?.openBatteryOptimizationSettings()} /> : null}
      {Platform.OS === 'android' ? <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}><Text>التقاط إشعارات التطبيقات المحددة (اختياري، لا يتحكم في SMS)</Text><Switch value={notificationCaptureEnabled} onValueChange={async value => {
        if (value && Number(Platform.Version) >= 33) {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('الإشعارات', 'هذا الإذن مطلوب لخدمة إشعارات التطبيقات فقط، ولا يؤثر على التقاط SMS.'); return; }
        }
        await NativeModules.ErpCompanionCapture?.setCaptureEnabled(value); setNotificationCaptureEnabled(value);
      }} /></View> : null}
      <Text>قفل التطبيق: {pinEnabled ? `مفعّل برقم سري من ٦ أرقام${biometric ? ' مع التحقق الحيوي' : ''}` : 'غير مفعّل'}</Text>
      <Button title={pinEnabled ? 'تغيير الرقم السري' : 'إعداد الرقم السري'} onPress={() => setPinModal(true)} />
      <Text>المزامنة: {counts.pending} معلقة، {counts.failed} فاشلة، مؤشر المزامنة {cursor}، آخر مزامنة {lastSyncAt ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(lastSyncAt) : 'لم تتم بعد'}</Text>
      <Button title="تحديث حالة المزامنة" onPress={() => { void refresh(); }} />
    </ScrollView>
    <Modal visible={pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0008' }}><View style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, gap: 12 }}>
        <Text style={{ fontSize: 20 }}>إعداد قفل التطبيق</Text>
        <TextInput accessibilityLabel="الرقم السري لقفل التطبيق" value={pin} onChangeText={setPinValue} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="رقم سري من ٦ أرقام" />
        <TextInput accessibilityLabel="تأكيد الرقم السري لقفل التطبيق" value={pinConfirm} onChangeText={setPinConfirm} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="تأكيد الرقم السري" />
        <Button title="حفظ الرقم السري" onPress={() => { void configurePin(); }} /><Button title="إلغاء" onPress={() => setPinModal(false)} />
      </View></View>
    </Modal>
  </SafeAreaView>;
}
