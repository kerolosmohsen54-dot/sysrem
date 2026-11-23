import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ChannelCardList } from '../src/screens/ChannelHomeScreen';
import { createChannel, listChannels, setChannelPaused, Channel } from '../src/api/channels';

const baseChannel: Channel = {
  id: 1, name: 'محفظة تجريبية', type: 'wallet', number: '0100', sender_filter: 'Wallet',
  deposit_keywords: ['وصل'], withdrawal_keywords: ['سحب'], deposit_enabled: true,
  withdrawal_enabled: false, paused: false, balance: '125.50', unread_new_count: 2,
};

describe('channel API flows', () => {
  it('requests a paginated channel page', async () => {
    const api = { get: jest.fn().mockResolvedValue({ data: [baseChannel], meta: { current_page: 2, last_page: 3, total: 101 } }) } as any;
    const page = await listChannels(api, 2);
    expect(api.get).toHaveBeenCalledWith('/mobile/channels?page=2&per_page=50&paused=0');
    expect(page.meta.total).toBe(101);
  });

  it('creates a channel with the entered fields and stable idempotency key', async () => {
    const api = { post: jest.fn().mockResolvedValue({ data: baseChannel }) } as any;
    const input = { name: 'محفظة', type: 'wallet', number: '0100', sender_filter: 'Wallet', deposit_keywords: ['وصل'], withdrawal_keywords: [], deposit_enabled: true, withdrawal_enabled: false };
    await createChannel(api, input as any, 'create-channel-1');
    expect(api.post).toHaveBeenCalledTimes(1);
    const [path, payload, key] = api.post.mock.calls[0];
    expect(path).toBe('/mobile/channels');
    expect(payload).toMatchObject({
      name: input.name, type: input.type, number: input.number, sender_filter: input.sender_filter,
      deposit_keywords: input.deposit_keywords, deposit_enabled: input.deposit_enabled, withdrawal_enabled: input.withdrawal_enabled,
    });
    expect(payload).not.toHaveProperty('withdrawal_keywords');
    expect(key).toBe('create-channel-1');
  });

  it('pauses by PATCH paused flag without issuing a delete', async () => {
    const api = { patch: jest.fn().mockResolvedValue({ data: { ...baseChannel, paused: true } }), delete: jest.fn() } as any;
    await setChannelPaused(api, 1, true, 'pause-1');
    expect(api.patch).toHaveBeenCalledWith('/mobile/channels/1', { paused: true }, 'pause-1');
    expect(api.delete).not.toHaveBeenCalled();
  });
});

test('virtualized channel list renders 60 cards with exact balances and management actions', async () => {
  const channels = Array.from({ length: 60 }, (_, index) => ({ ...baseChannel, id: index + 1, name: `قناة ${index + 1}` }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ChannelCardList data={channels} canManage onToggle={() => undefined} onEdit={() => undefined} onArchive={() => undefined} />); });
  const cardIds = renderer!.root.findAll(node => String(node.props.accessibilityLabel ?? '').startsWith('channel-card-')).map(node => node.props.accessibilityLabel);
  expect(new Set(cardIds).size).toBe(60);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'balance-1' }).props.children).toEqual(expect.arrayContaining(['125.50']));
  expect(renderer!.root.findAllByProps({ title: 'إيقاف مؤقت' })).toHaveLength(60);
  expect(renderer!.root.findAllByProps({ title: 'تعديل الحساب' })).toHaveLength(60);
  expect(renderer!.root.findAllByProps({ title: 'حذف من الحسابات النشطة' })).toHaveLength(60);
});
