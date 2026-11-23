import { matchingNotificationSource, matchingSmsSources, CaptureSource } from '../src/capture/sourceMatcher';
import { channelCaptureSources } from '../src/capture/channelSources';

const source = (overrides: Partial<CaptureSource> = {}): CaptureSource => ({
  channel_id: 1, source_kind: 'sms', sender_identifier: 'WalletSender', is_enabled: true,
  read_deposits: true, read_withdrawals: true, ...overrides,
});

test('matches an exact SMS sender', () => expect(matchingSmsSources([source()], 'WalletSender')).toHaveLength(1));
test('matches an SMS sender case-insensitively', () => expect(matchingSmsSources([source()], ' walletsENDER ')).toHaveLength(1));
test('matches a partial sender filter', () => expect(matchingSmsSources([source()], 'WALLETSENDER-EGYPT')).toHaveLength(1));
test('does not match a short numeric sender against a longer configured sender', () => expect(matchingSmsSources([source({ sender_identifier: 'E2E-TEST-SENDER' })], '2')).toHaveLength(0));
test('matches an exact numeric emulator sender filter', () => expect(matchingSmsSources([source({ sender_identifier: '2' })], '2')).toHaveLength(1));
test('drops an unmatched SMS sender', () => expect(matchingSmsSources([source()], 'UnknownBank')).toHaveLength(0));
test('returns both channels when an SMS sender matches two configured channels', () => expect(matchingSmsSources([source(), source({ channel_id: 2 })], 'WalletSender')).toHaveLength(2));
test('does not match paused/disabled SMS sources', () => expect(matchingSmsSources([source({ is_enabled: false })], 'WalletSender')).toHaveLength(0));
test('matches configured SMS senders even when automatic directions are disabled', () => expect(matchingSmsSources([source({ read_deposits: false, read_withdrawals: false })], 'WalletSender')).toHaveLength(1));
test('allows only a notification package selected on an enabled notification source', () => {
  const configured = source({ source_kind: 'notification', sender_identifier: null, notification_package_names: ['com.wallet.app'] });
  expect(matchingNotificationSource([configured], 'com.wallet.app')?.channel_id).toBe(1);
  expect(matchingNotificationSource([configured], 'com.other.app')).toBeUndefined();
});
test('ignores a synthetic notification from an unlisted package without producing a candidate', () => {
  const candidate = matchingNotificationSource([source({ source_kind: 'notification', notification_package_names: ['com.wallet.app'] })], 'com.attacker.app');
  expect(candidate).toBeUndefined();
});

test('maps enabled channel package names into notification sources', () => {
  const configured = channelCaptureSources([{
    id: 7,
    sender_filter: 'com.android.shell',
    notification_package_names: [' com.android.shell ', ''],
    paused: false,
    deposit_enabled: true,
    withdrawal_enabled: false,
    deposit_keywords: ['Deposit'],
    withdrawal_keywords: ['Withdraw'],
  }]);
  expect(configured).toHaveLength(2);
  expect(configured[1]).toMatchObject({
    channel_id: 7,
    source_kind: 'notification',
    is_enabled: true,
    read_deposits: true,
    read_withdrawals: false,
    notification_package_names: ['com.android.shell'],
  });
  expect(matchingNotificationSource(configured, 'com.android.shell')?.channel_id).toBe(7);
  expect(matchingNotificationSource(configured, 'com.android.settings')).toBeUndefined();
});
