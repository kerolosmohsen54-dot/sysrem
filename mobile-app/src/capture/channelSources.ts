import { CaptureSource } from './sourceMatcher';

export type PaymentChannelSource = {
  id: number;
  sender_filter: string;
  notification_package_names?: string[] | null;
  paused: boolean;
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  deposit_keywords?: string[] | null;
  withdrawal_keywords?: string[] | null;
};

export type ConfiguredCaptureSource = CaptureSource & {
  deposit_keywords: string[];
  withdrawal_keywords: string[];
};

export function channelCaptureSources(channels: PaymentChannelSource[]): ConfiguredCaptureSource[] {
  return channels.flatMap(channel => {
    const shared = {
      channel_id: channel.id,
      is_enabled: !channel.paused,
      read_deposits: channel.deposit_enabled,
      read_withdrawals: channel.withdrawal_enabled,
      deposit_keywords: channel.deposit_keywords ?? [],
      withdrawal_keywords: channel.withdrawal_keywords ?? [],
    };
    const sms: ConfiguredCaptureSource = {
      ...shared,
      source_kind: 'sms',
      sender_identifier: channel.sender_filter,
    };
    const packages = (channel.notification_package_names ?? []).map(value => value.trim()).filter(Boolean);
    if (packages.length === 0) return [sms];
    return [sms, {
      ...shared,
      source_kind: 'notification',
      sender_identifier: null,
      notification_package_names: packages,
    }];
  });
}
