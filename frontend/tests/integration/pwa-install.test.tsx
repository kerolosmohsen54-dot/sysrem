import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallPage } from '../../src/features/admin/PwaInstallPage';

describe('PWA installation', () => {
  const secureContextDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
  afterEach(() => {
    if (secureContextDescriptor) Object.defineProperty(window, 'isSecureContext', secureContextDescriptor);
    else Reflect.deleteProperty(window, 'isSecureContext');
  });
  it('shows browser instructions when the install prompt is unavailable', () => {
    render(<PwaInstallPage />);
    expect(screen.getByText(/Android/)).toBeVisible();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('uses the browser install prompt and reports the outcome', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    render(<PwaInstallPage />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    });
    act(() => window.dispatchEvent(event));
    await userEvent.setup().click(await screen.findByRole('button'));
    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByRole('status')).toHaveTextContent(/./);
  });
});
