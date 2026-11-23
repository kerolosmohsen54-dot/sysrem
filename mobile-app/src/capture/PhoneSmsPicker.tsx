import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  Text,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type PhoneSmsMessage = {
  sender: string;
  body: string;
  receivedAt: string;
};

type NativeSmsMessage = { sender: string; body: string; receivedAt: number };
export type PhoneSmsPickerMode = 'transaction' | 'sender';

type PhoneSmsPickerProps = {
  visible: boolean;
  senderFilter?: string;
  mode?: PhoneSmsPickerMode;
  title?: string;
  onClose: () => void;
  onSelect: (message: PhoneSmsMessage) => void;
};

export function PhoneSmsPicker({
  visible,
  senderFilter = '',
  mode = 'transaction',
  title = 'اختر رسالة من الهاتف',
  onClose,
  onSelect,
}: PhoneSmsPickerProps) {
  const [messages, setMessages] = useState<PhoneSmsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (Platform.OS !== 'android') throw new Error('اختيار رسائل الهاتف متاح على أندرويد فقط.');
      const permission = PermissionsAndroid.PERMISSIONS.READ_SMS;
      const alreadyGranted = await PermissionsAndroid.check(permission);
      const granted = alreadyGranted || (await PermissionsAndroid.request(permission, {
        title: 'السماح بقراءة الرسائل',
        message: mode === 'sender'
          ? 'يعرض التطبيق رسائل الهاتف لاختيار مرسل الحساب. سيُستخدم اسم المرسل فقط، ولن يُرسل نص الرسالة أو يُضاف للصندوق.'
          : 'يعرض التطبيق الرسائل المطابقة لمصدر الحساب على هذا الجهاز. لن تُرسل الرسالة إلى الصندوق إلا بعد اختيارك لها.',
        buttonPositive: 'السماح',
        buttonNegative: 'إلغاء',
      })) === PermissionsAndroid.RESULTS.GRANTED;
      if (!granted) throw new Error('يلزم السماح بقراءة الرسائل لاختيار رسالة منها.');

      const nativeModule = NativeModules.ErpCompanionCapture as {
        listSmsMessages?: (filter: string, pickerMode: PhoneSmsPickerMode) => Promise<NativeSmsMessage[]>;
      } | undefined;
      if (!nativeModule?.listSmsMessages) throw new Error('ميزة قراءة الرسائل غير موجودة في نسخة التطبيق الحالية.');
      const rows = await nativeModule.listSmsMessages(senderFilter.trim(), mode);
      setMessages(rows.map(row => ({
        sender: row.sender,
        body: row.body,
        receivedAt: new Date(row.receivedAt).toISOString(),
      })));
    } catch (cause) {
      setMessages([]);
      setError(cause instanceof Error ? cause.message : 'تعذرت قراءة الرسائل من الهاتف.');
    } finally {
      setLoading(false);
    }
  }, [mode, senderFilter]);

  useEffect(() => {
    if (visible) void loadMessages();
    else {
      setMessages([]);
      setError('');
    }
  }, [visible, loadMessages]);

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fb', padding: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', textAlign: 'right', marginBottom: 8 }}>{title}</Text>
      <Text style={{ textAlign: 'right', color: '#475467', marginBottom: 12 }}>
        {mode === 'sender'
          ? 'تُستخدم الرسالة لتحديد مرسل الحساب فقط. نصها لا يُضاف إلى صندوق الرسائل.'
          : 'الرسائل تظهر على الهاتف فقط. اختر رسالة واحدة لإضافتها إلى صندوق الرسائل.'}
      </Text>
      {loading ? <ActivityIndicator accessibilityLabel="تحميل رسائل الهاتف" /> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: '#b42318', textAlign: 'right', marginVertical: 12 }}>{error}</Text> : null}
      {!loading && !error && messages.length === 0 ? <Text style={{ textAlign: 'center', padding: 24 }}>لا توجد رسائل مطابقة</Text> : null}
      <FlatList
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(message, index) => `${message.sender}-${message.receivedAt}-${index}`}
        renderItem={({ item: message }) => <Pressable
          accessibilityRole="button"
          accessibilityLabel={`رسالة من ${message.sender}`}
          onPress={() => onSelect(message)}
          style={{ marginVertical: 5, padding: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '700', textAlign: 'right' }}>{message.sender}</Text>
          <Text numberOfLines={4} style={{ textAlign: 'right', marginTop: 6 }}>{message.body}</Text>
          <Text style={{ textAlign: 'right', color: '#667085', marginTop: 6 }}>{new Date(message.receivedAt).toLocaleString('ar-EG')}</Text>
        </Pressable>}
      />
      {!loading ? <Button title="تحديث الرسائل" onPress={() => { void loadMessages(); }} /> : null}
      <Button title="إلغاء" onPress={onClose} />
    </SafeAreaView>
  </Modal>;
}
