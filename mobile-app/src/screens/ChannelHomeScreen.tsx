import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { ApiError } from '../api/http';
import { archiveChannel, Channel, ChannelInput, ChannelPage, ChannelType, createChannel, listChannels, setChannelPaused, updateChannel } from '../api/channels';
import { useAuth } from '../auth/AuthContext';
import { CapturePermissionControls } from '../capture/CapturePermissionControls';
import { refreshCaptureSources } from '../capture/nativeCapture';
import { channelCaptureSources } from '../capture/channelSources';
import { classifyMessage, postCapturedMessage } from '../capture/filterEngine';
import { PhoneSmsMessage, PhoneSmsPicker } from '../capture/PhoneSmsPicker';

const types: ChannelType[] = ['wallet', 'bank', 'instapay', 'postal', 'other'];
const typeLabels: Record<ChannelType, string> = { wallet: 'محفظة', bank: 'بنك', instapay: 'إنستاباي', postal: 'بريد', other: 'أخرى' };

export function ChannelCardList({ data, canManage, onToggle, onEdit, onArchive, onPickMessage }: { data: Channel[]; canManage: boolean; onToggle: (channel: Channel) => void; onEdit?: (channel: Channel) => void; onArchive?: (channel: Channel) => void; onPickMessage?: (channel: Channel) => void }) {
  return <FlatList
    accessibilityLabel="قائمة القنوات"
    data={data}
    keyExtractor={item => String(item.id)}
    initialNumToRender={Math.max(10, Math.min(data.length, 100))}
    renderItem={({ item }) => <View accessibilityLabel={`channel-card-${item.id}`} style={card}>
      <Text style={title}>{item.name}</Text>
      <Text>{typeLabels[item.type]} · {item.number}</Text>
      <Text accessibilityLabel={`balance-${item.id}`}>الرصيد: {item.balance} ج.م</Text>
      <Text>رسائل جديدة: {item.unread_new_count ?? 0}</Text>
      <Text>الإيداع: {item.deposit_enabled ? 'مفعل' : 'متوقف'} · السحب: {item.withdrawal_enabled ? 'مفعل' : 'متوقف'}</Text>
      <Text>{item.paused ? 'متوقفة مؤقتاً' : 'نشطة'}</Text>
      {onPickMessage ? <Button title="اختيار رسالة من الهاتف" disabled={item.paused} onPress={() => onPickMessage(item)} /> : null}
      {canManage ? <Button title={item.paused ? 'استئناف' : 'إيقاف مؤقت'} onPress={() => onToggle(item)} /> : null}
      {canManage && onEdit ? <Button title="تعديل الحساب" onPress={() => onEdit(item)} /> : null}
      {canManage && onArchive && !item.paused ? <Button title="حذف من الحسابات النشطة" onPress={() => onArchive(item)} /> : null}
    </View>}
    ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 24 }}>لا توجد قنوات بعد</Text>}
  />;
}

export function ChannelHomeScreen() {
  const { api, user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [addVisible, setAddVisible] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [smsChannel, setSmsChannel] = useState<Channel | null>(null);
  const [showPausedChannels, setShowPausedChannels] = useState(false);
  const canManage = user?.permissions.includes('mobile.channels.manage') ?? false;
  const query = useInfiniteQuery<ChannelPage>({
    queryKey: ['channels', showPausedChannels],
    queryFn: ({ pageParam }) => listChannels(api, Number(pageParam), showPausedChannels),
    initialPageParam: 1,
    getNextPageParam: last => last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  });
  const createMutation = useMutation({ mutationFn: (input: ChannelInput) => createChannel(api, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }) });
  const pauseMutation = useMutation({ mutationFn: (channel: Channel) => setChannelPaused(api, channel.id, !channel.paused), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }) });
  const updateMutation = useMutation({ mutationFn: ({ channel, input }: { channel: Channel; input: ChannelInput }) => updateChannel(api, channel.id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }) });
  const archiveMutation = useMutation({ mutationFn: (channel: Channel) => archiveChannel(api, channel.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }) });
  const channels = useMemo(() => query.data?.pages.flatMap(page => page.data) ?? [], [query.data]);
  React.useEffect(() => { void refreshCaptureSources(api).catch(() => undefined); }, [api]);
  const [pageError, setPageError] = useState('');

  async function toggle(channel: Channel) {
    setPageError('');
    try { await pauseMutation.mutateAsync(channel); await refreshCaptureSources(api); }
    catch (error) { setPageError(errorText(error)); }
  }

  function openAddForm() {
    setEditingChannel(null);
    setFormSession(value => value + 1);
    createMutation.reset();
    updateMutation.reset();
    setAddVisible(true);
  }

  function openEditForm(channel: Channel) {
    setPageError('');
    setFormSession(value => value + 1);
    createMutation.reset();
    updateMutation.reset();
    setEditingChannel(channel);
    setAddVisible(true);
  }

  async function archive(channel: Channel) {
    setPageError('');
    try {
      await archiveMutation.mutateAsync(channel);
      await refreshCaptureSources(api);
    } catch (error) {
      setPageError(errorText(error));
    }
  }

  function confirmArchive(channel: Channel) {
    Alert.alert(
      'حذف الحساب من القائمة النشطة؟',
      'سيتم إيقاف الحساب وإخفاؤه من القائمة النشطة، مع الاحتفاظ برسائله وحركاته المالية. يمكنك عرضه مرة أخرى من الحسابات المتوقفة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف من القائمة', style: 'destructive', onPress: () => { void archive(channel); } },
      ],
    );
  }

  async function importPhoneMessage(channel: Channel, message: PhoneSmsMessage) {
    setSmsChannel(null);
    setPageError('');
    try {
      const source = channelCaptureSources([channel]).find(item => item.source_kind === 'sms');
      if (!source) throw new Error('تعذر تجهيز مصدر الرسائل لهذا الحساب.');
      const result = classifyMessage([source], message.sender, message.body, message.receivedAt, 'sms');
      if (result.outcome === 'IGNORED') throw new Error('الرسالة لا تطابق مرسل الحساب أو أن اتجاهها غير مفعّل.');

      const response: any = await postCapturedMessage(api, result, message.sender, message.body, message.receivedAt);
      const captured = response?.data;
      if (!captured?.id) throw new Error('تعذر تأكيد حفظ الرسالة. تحقق من الاتصال ثم افتح صندوق الرسائل.');
      await queryClient.invalidateQueries({ queryKey: ['messages'] });
      if (captured.duplicate) {
        setPageError('الرسالة مسجلة من قبل؛ لم تُضف مرة أخرى.');
        return;
      }
      if (captured.status !== 'NEW' && captured.status !== 'NEEDS_REVIEW') {
        setPageError('هذه الرسالة مسجلة أو تمت مراجعتها من قبل.');
        return;
      }
      navigation.navigate('Inbox', { openMessage: {
        id: Number(captured.id),
        channel_id: Number(captured.channel_id),
        channel_name: channel.name,
        direction: captured.direction,
        amount_egp: captured.amount == null ? null : String(captured.amount),
        received_at: captured.received_at,
        status: captured.status,
        raw_text: captured.raw_text,
      } });
    } catch (error) {
      setPageError(errorText(error));
    }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
    <View style={{ padding: 16, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', textAlign: 'right' }}>القنوات المالية</Text>
    </View>
    <View accessibilityLabel="قائمة الإجراءات" style={actionMenu}>
      <Text style={actionMenuTitle}>القائمة</Text>
      {canManage ? <MenuAction label="إضافة حساب" onPress={openAddForm} /> : null}
      <MenuAction label="صندوق الرسائل" onPress={() => navigation.navigate('Inbox')} />
      <MenuAction label="إيداع بريدي يدوي" onPress={() => navigation.navigate('ManualDeposit')} />
      <MenuAction label="الإعدادات" onPress={() => navigation.navigate('Settings')} />
    </View>
    <View style={channelFilter}>
      <Text style={{ textAlign: 'right', color: '#344054' }}>إظهار الحسابات المتوقفة مؤقتاً</Text>
      <Switch accessibilityLabel="إظهار الحسابات المتوقفة مؤقتاً" value={showPausedChannels} onValueChange={setShowPausedChannels} />
    </View>
    <CapturePermissionControls />
    {pageError ? <Text accessibilityRole="alert" style={{ color: '#b42318', paddingHorizontal: 16 }}>{pageError}</Text> : null}
    {query.isLoading ? <ActivityIndicator accessibilityLabel="تحميل القنوات" /> : null}
    {query.isError ? <Text accessibilityRole="alert" style={{ color: '#b42318', padding: 16 }}>{errorText(query.error)}</Text> : null}
    <ChannelCardList data={channels} canManage={canManage} onToggle={toggle} onEdit={openEditForm} onArchive={confirmArchive} onPickMessage={channel => setSmsChannel(channel)} />
    {query.hasNextPage ? <View style={{ padding: 12 }}><Button title="تحميل المزيد" onPress={() => { void query.fetchNextPage(); }} disabled={query.isFetchingNextPage} /></View> : null}
    <PhoneSmsPicker visible={smsChannel !== null} senderFilter={smsChannel?.sender_filter ?? ''} title={`رسائل ${smsChannel?.name ?? ''}`} onClose={() => setSmsChannel(null)} onSelect={message => { if (smsChannel) void importPhoneMessage(smsChannel, message); }} />
    <ChannelForm key={`channel-form-${editingChannel?.id ?? 'new'}-${formSession}`} visible={addVisible} initialChannel={editingChannel} onClose={() => { setAddVisible(false); setEditingChannel(null); }} onSave={async (input, confirmationPassword) => {
      await api.post('/mobile/auth/confirm-password', { password: confirmationPassword });
      if (editingChannel) await updateMutation.mutateAsync({ channel: editingChannel, input });
      else await createMutation.mutateAsync(input);
      await refreshCaptureSources(api);
      setAddVisible(false);
      setEditingChannel(null);
    }} saving={createMutation.isPending || updateMutation.isPending} saveError={editingChannel ? (updateMutation.error ? errorText(updateMutation.error) : '') : (createMutation.error ? errorText(createMutation.error) : '')} />
  </SafeAreaView>;
}

function ChannelForm({ visible, initialChannel, onClose, onSave, saving, saveError }: { visible: boolean; initialChannel?: Channel | null; onClose: () => void; onSave: (input: ChannelInput, confirmationPassword: string) => Promise<void>; saving: boolean; saveError: string }) {
  const [name, setName] = useState(initialChannel?.name ?? '');
  const [type, setType] = useState<ChannelType>(initialChannel?.type ?? 'wallet');
  const [number, setNumber] = useState(initialChannel?.number ?? '');
  const [sender, setSender] = useState(initialChannel?.sender_filter ?? '');
  const [senderPickerVisible, setSenderPickerVisible] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!name.trim()) return setError('الاسم مطلوب');
    if (!number.trim()) return setError('رقم الحساب مطلوب');
    if (!sender.trim()) return setError('اختر رسالة من الهاتف لتحديد مرسل الحساب');
    if (!confirmationPassword) return setError('أدخل كلمة المرور للتأكيد');
    try {
      await onSave({ name: name.trim(), type, number: number.trim(), sender_filter: sender.trim() }, confirmationPassword);
      setName(''); setNumber(''); setSender(''); setConfirmationPassword('');
    } catch (cause) { setError(errorText(cause)); }
  }

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fb' }}><ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text accessibilityRole="header" style={{ fontSize: 23, fontWeight: '700', textAlign: 'right', marginBottom: 12 }}>{initialChannel ? 'تعديل حساب' : 'إضافة حساب'}</Text>
      <Field label="الاسم" value={name} onChangeText={setName} />
      <Text style={label}>النوع</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>{types.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: type === option }} onPress={() => setType(option)} style={[chip, type === option && selected]}><Text>{typeLabels[option]}</Text></Pressable>)}</View>
      <Field label="رقم الحساب" value={number} onChangeText={setNumber} />
      <Text style={label}>مرسل الرسائل</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="اختيار رسالة من الهاتف لتحديد مرسل الحساب" onPress={() => setSenderPickerVisible(true)} style={[input, { marginBottom: 12 }]}>
        <Text style={{ textAlign: 'right', color: sender ? '#101828' : '#667085' }}>{sender || 'اختيار رسالة من الهاتف لتحديد المرسل'}</Text>
      </Pressable>
      <Text style={{ textAlign: 'right', color: '#475467', marginBottom: 12 }}>{'\u0643\u0644 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u0631\u0633\u0644 \u062f\u0647 \u0647\u062a\u0638\u0647\u0631 \u0641\u064a \u0627\u0644\u0648\u0627\u0631\u062f\u060c \u0648\u062a\u062d\u062f\u062f \u0625\u064a\u062f\u0627\u0639 \u0623\u0648 \u0633\u062d\u0628 \u0639\u0646\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0643\u0644 \u0631\u0633\u0627\u0644\u0629.'}</Text>
      <Field label="كلمة المرور للتأكيد" value={confirmationPassword} onChangeText={setConfirmationPassword} secureTextEntry />
      {error || saveError ? <Text accessibilityRole="alert" style={{ color: '#b42318', marginVertical: 8 }}>{error || saveError}</Text> : null}
      {saving ? <ActivityIndicator accessibilityLabel="حفظ الحساب" /> : <Button title={initialChannel ? 'حفظ التعديلات' : 'حفظ الحساب'} onPress={() => { void submit(); }} />}
      <Button title="إلغاء" onPress={onClose} />
      <PhoneSmsPicker visible={senderPickerVisible} mode="sender" title="اختر رسالة لتحديد مرسل الحساب" onClose={() => setSenderPickerVisible(false)} onSelect={message => { setSender(message.sender); setSenderPickerVisible(false); }} />
    </ScrollView></SafeAreaView>
  </Modal>;
}

function MenuAction({ label: text, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={menuAction}>
    <Text style={menuActionMark}>‹</Text><Text style={menuActionText}>{text}</Text>
  </Pressable>;
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean }) {
  return <View style={{ marginBottom: 12 }}><Text style={label}>{props.label}</Text><TextInput accessibilityLabel={props.label} value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} secureTextEntry={props.secureTextEntry} style={input} textAlign="right" /></View>;
}
function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details.outbox_status === 'PENDING') return 'تم الحفظ على الجهاز، وستتم المزامنة عند عودة الاتصال.';
    return Object.entries(error.details).filter(([field]) => !field.startsWith('outbox_')).map(([field, details]) => `${field}: ${Array.isArray(details) ? details.join(', ') : String(details)}`).join('\n') || error.message;
  }
  return 'تعذر تنفيذ الطلب. حاول مرة أخرى.';
}

const card = { marginHorizontal: 16, marginVertical: 6, padding: 16, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' };
const title = { fontSize: 18, fontWeight: '700' as const, textAlign: 'right' as const, marginBottom: 6 };
const label = { textAlign: 'right' as const, fontWeight: '600' as const, marginBottom: 6 };
const input = { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 9, padding: 12, backgroundColor: 'white' };
const chip = { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: 'white' };
const selected = { backgroundColor: '#dbeafe', borderColor: '#2563eb' };
const actionMenu = { alignSelf: 'flex-end' as const, width: 250, marginHorizontal: 16, marginBottom: 8, padding: 8, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' };
const actionMenuTitle = { textAlign: 'right' as const, fontSize: 16, fontWeight: '700' as const, padding: 8 };
const menuAction = { minHeight: 42, paddingHorizontal: 10, flexDirection: 'row-reverse' as const, alignItems: 'center' as const, borderTopWidth: 1, borderColor: '#f0f2f5' };
const menuActionMark = { fontSize: 22, color: '#667085', marginLeft: 8 };
const menuActionText = { flex: 1, textAlign: 'right' as const, fontSize: 15, color: '#101828' };
const channelFilter = { marginHorizontal: 16, marginBottom: 8, padding: 10, flexDirection: 'row-reverse' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' };
