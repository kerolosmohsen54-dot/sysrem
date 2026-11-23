export type CaptureSource = {
  channel_id: number;
  source_kind: 'sms' | 'notification';
  sender_identifier?: string | null;
  notification_package_names?: string[] | null;
  is_enabled: boolean;
  read_deposits: boolean;
  read_withdrawals: boolean;
};

export function matchingSmsSources(sources: CaptureSource[], sender: string): CaptureSource[] {
  const normalized = sender.trim().toLocaleLowerCase();
  if (!normalized) return [];
  return sources.filter(source => {
    if (!source.is_enabled || source.source_kind !== 'sms') return false;
    const filter = (source.sender_identifier ?? '').trim().toLocaleLowerCase();
    return Boolean(filter) && (normalized === filter || normalized.includes(filter));
  });
}

export function matchingNotificationSource(sources: CaptureSource[], packageName: string): CaptureSource | undefined {
  return sources.find(source => source.is_enabled && source.source_kind === 'notification'
    && (source.read_deposits || source.read_withdrawals)
    && (source.notification_package_names ?? []).includes(packageName));
}
