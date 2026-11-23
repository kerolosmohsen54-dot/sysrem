import React from 'react';
import { Alert, Button, PermissionsAndroid, Platform, View } from 'react-native';
import { NativeModules } from 'react-native';

export function CapturePermissionControls() {
  if (Platform.OS !== 'android') return null;
  const requestSms = () => Alert.alert(
    'السماح بالتقاط الرسائل النصية',
    'للالتقاط التلقائي، يستقبل التطبيق الرسائل الجديدة على الجهاز ويفحصها محليًا. لا يرسل رموز التحقق، ولا الرسائل التي لا تطابق كلمات الإيداع أو السحب المحددة. عند اختيار رسالة قديمة، يعرض رسائل المعاملات المطابقة فقط.',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'متابعة', onPress: () => { void PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ]); } },
    ],
  );
  const openNotifications = () => Alert.alert(
    'وصول الإشعارات (اختياري)',
    'هذا مطلوب فقط لالتقاط إشعارات تطبيقات الدفع المحددة. التقاط SMS يعمل بإذن SMS ولا يحتاج وصول الإشعارات.',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'فتح الإعدادات', onPress: () => NativeModules.ErpCompanionCapture?.openNotificationSettings() },
    ],
  );
  return <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
    <Button title="تفعيل استقبال الرسائل" onPress={requestSms} />
    <Button title="وصول إشعارات التطبيقات (اختياري)" onPress={openNotifications} />
  </View>;
}
