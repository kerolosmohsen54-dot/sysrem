import { newIdempotencyKey } from './http';

export type ChannelType = 'wallet' | 'bank' | 'instapay' | 'postal' | 'other';
export type Channel = {
  id: number;
  name: string;
  type: ChannelType;
  number: string;
  sender_filter: string;
  notification_package_names?: string[];
  deposit_keywords: string[];
  withdrawal_keywords: string[];
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  paused: boolean;
  balance: string;
  unread_new_count?: number;
};
export type ChannelPage = { data: Channel[]; meta: { current_page: number; last_page: number; total: number } };
export type ChannelInput = Omit<Channel, 'id' | 'paused' | 'balance' | 'unread_new_count' | 'deposit_keywords' | 'withdrawal_keywords' | 'deposit_enabled' | 'withdrawal_enabled'>
  & Partial<Pick<Channel, 'deposit_keywords' | 'withdrawal_keywords' | 'deposit_enabled' | 'withdrawal_enabled'>>;

export type ChannelsApi = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body: unknown, key?: string) => Promise<T>;
  patch: <T>(path: string, body: unknown, key?: string) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
};

export function listChannels(api: ChannelsApi, page: number, includePaused = false): Promise<ChannelPage> {
  const pausedFilter = includePaused ? '' : '&paused=0';
  return api.get<ChannelPage>(`/mobile/channels?page=${page}&per_page=50${pausedFilter}`);
}

export function createChannel(api: ChannelsApi, input: ChannelInput, key = newIdempotencyKey()) {
  const { deposit_keywords, withdrawal_keywords, ...channel } = input;
  const payload = {
    ...channel,
    ...(deposit_keywords?.length ? { deposit_keywords } : {}),
    ...(withdrawal_keywords?.length ? { withdrawal_keywords } : {}),
  };
  return api.post<{ data: Channel }>('/mobile/channels', payload, key);
}

export function updateChannel(api: ChannelsApi, channelId: number, input: ChannelInput, key = newIdempotencyKey()) {
  const { deposit_keywords, withdrawal_keywords, ...channel } = input;
  const payload = {
    ...channel,
    ...(deposit_keywords?.length ? { deposit_keywords } : {}),
    ...(withdrawal_keywords?.length ? { withdrawal_keywords } : {}),
  };
  return api.patch<{ data: Channel }>(`/mobile/channels/${channelId}`, payload, key);
}

export function setChannelPaused(api: ChannelsApi, channelId: number, paused: boolean, key = newIdempotencyKey()) {
  return api.patch<{ data: Channel }>(`/mobile/channels/${channelId}`, { paused }, key);
}

export function archiveChannel(api: ChannelsApi, channelId: number, key = newIdempotencyKey()) {
  return setChannelPaused(api, channelId, true, key);
}
