import { archiveChannel, createChannel, ChannelsApi, updateChannel } from '../src/api/channels';

test('channel creation omits empty transaction keyword arrays', async () => {
  const post = jest.fn().mockResolvedValue({ data: { id: 4 } });
  const api = { post } as unknown as ChannelsApi;

  await createChannel(api, {
    name: 'Wallet',
    type: 'wallet',
    number: '01000000000',
    sender_filter: 'WalletSender',
    deposit_keywords: [],
    withdrawal_keywords: [],
    deposit_enabled: true,
    withdrawal_enabled: true,
  }, 'channel-create-test');

  expect(post).toHaveBeenCalledTimes(1);
  const body = post.mock.calls[0][1] as Record<string, unknown>;
  expect(body).toMatchObject({ name: 'Wallet', type: 'wallet', sender_filter: 'WalletSender' });
  expect(body).not.toHaveProperty('deposit_keywords');
  expect(body).not.toHaveProperty('withdrawal_keywords');
});

test('channel updates send editable fields without empty keyword arrays', async () => {
  const patch = jest.fn().mockResolvedValue({ data: { id: 4 } });
  const api = { patch } as unknown as ChannelsApi;

  await updateChannel(api, 4, {
    name: 'Wallet updated',
    type: 'wallet',
    number: '01000000001',
    sender_filter: 'NewWalletSender',
    deposit_keywords: [],
    withdrawal_keywords: [],
  }, 'channel-update-test');

  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch).toHaveBeenCalledWith('/mobile/channels/4', {
    name: 'Wallet updated',
    type: 'wallet',
    number: '01000000001',
    sender_filter: 'NewWalletSender',
  }, 'channel-update-test');
});

test('account removal archives by pausing, preserving its financial history', async () => {
  const patch = jest.fn().mockResolvedValue({ data: { id: 4, paused: true } });
  const api = { patch } as unknown as ChannelsApi;

  await archiveChannel(api, 4, 'channel-archive-test');

  expect(patch).toHaveBeenCalledWith('/mobile/channels/4', { paused: true }, 'channel-archive-test');
});
