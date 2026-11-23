import { AppRegistry, DeviceEventEmitter, NativeModules } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { createApiClient } from '../api/http';
import { createQueueAwareApi, outboxStore } from '../offline';
import { clearToken, readToken } from '../auth/session';
import { API_BASE_URL } from '../config';
import { classifyMessage, postCapturedMessage } from './filterEngine';
import { CaptureSource } from './sourceMatcher';
import { channelCaptureSources } from './channelSources';

const captureNative = NativeModules.ErpCompanionCapture;
const rawApi = createApiClient(API_BASE_URL, readToken, clearToken);
let captureOnline = false;
const api = createQueueAwareApi(rawApi, outboxStore, () => captureOnline);

export async function refreshCaptureSources(authApi: { get: <T>(path: string) => Promise<T> }): Promise<void> {
  if (!captureNative?.configureSources) return;
  const response: any = await authApi.get('/mobile/sync?cursor=0&limit=500');
  const sources: CaptureSource[] = response.data?.sources ?? [];
  let page = 1;
  let lastPage = 1;
  do {
    const legacy: any = await authApi.get(`/mobile/channels?paused=0&page=${page}&per_page=100`);
    sources.push(...channelCaptureSources(legacy.data ?? []));
    lastPage = Number(legacy.meta?.last_page ?? page);
    page++;
  } while (page <= lastPage);
  await captureNative.configureSources(JSON.stringify(sources));
}

export async function handleNativeCapture(data: Record<string, unknown>): Promise<void> {
  const sender = String(data.sender ?? '');
  const rawText = String(data.rawText ?? '');
  const receivedAt = String(data.receivedAt ?? new Date().toISOString());
  const sourceKind = data.sourceKind === 'notification' ? 'notification' : 'sms';
  const sources = JSON.parse(String(data.sourcesJson ?? '[]')) as CaptureSource[];
  const result = classifyMessage(sources, sender, rawText, receivedAt, sourceKind);
  console.log('ERP_CAPTURE_CLASSIFIED', sourceKind, result.outcome, result.channelId, sources.length);
  if (result.outcome === 'IGNORED') return;
  const network = await NetInfo.fetch().catch(() => ({ isConnected: false, isInternetReachable: false }));
  captureOnline = Boolean(network.isConnected && network.isInternetReachable !== false);
  console.log('ERP_CAPTURE_NETWORK', captureOnline);
  try {
    const response = await postCapturedMessage(api, result, sender, rawText, receivedAt);
    console.log('ERP_CAPTURE_POSTED', Boolean(response));
    const duplicate = Boolean((response as any)?.data?.duplicate);
    if (duplicate) captureNative?.showDuplicateNotice?.();
    DeviceEventEmitter.emit('erp.capture.saved', { response, outcome: result.outcome, dedupeKey: result.dedupeKey, duplicate });
  } catch (error) {
    console.warn('ERP_CAPTURE_POST_ERROR', error instanceof Error ? error.name : 'unknown', error instanceof Error ? error.message : 'unknown');
    if (!(error instanceof Error && 'details' in error && (error as any).details?.outbox_status === 'PENDING')) throw error;
    DeviceEventEmitter.emit('erp.capture.saved', { queued: true, outcome: result.outcome, dedupeKey: result.dedupeKey });
  }
}

AppRegistry.registerHeadlessTask('ERP_CAPTURE', () => handleNativeCapture);
