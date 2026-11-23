export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unsupported';

export async function shareText(text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  if (typeof navigator.clipboard?.writeText !== 'function') return 'unsupported';
  await navigator.clipboard.writeText(text);
  return 'copied';
}
