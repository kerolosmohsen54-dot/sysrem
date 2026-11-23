import { LOCAL_NETWORK_PERMISSION, requestLocalNetworkAccess } from '../src/platform/localNetworkPermission';

describe('local network permission', () => {
  const permissions = {
    check: jest.fn<Promise<boolean>, [typeof LOCAL_NETWORK_PERMISSION]>(),
    request: jest.fn<Promise<string>, [typeof LOCAL_NETWORK_PERMISSION]>(),
    RESULTS: { GRANTED: 'granted' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks Android 17 for local network access before login', async () => {
    permissions.check.mockResolvedValue(false);
    permissions.request.mockResolvedValue('granted');

    await expect(requestLocalNetworkAccess('android', 37, permissions)).resolves.toBe(true);
    expect(permissions.check).toHaveBeenCalledWith(LOCAL_NETWORK_PERMISSION);
    expect(permissions.request).toHaveBeenCalledWith(LOCAL_NETWORK_PERMISSION);
  });

  it('does not show the prompt when access is already granted', async () => {
    permissions.check.mockResolvedValue(true);

    await expect(requestLocalNetworkAccess('android', 37, permissions)).resolves.toBe(true);
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it('does not ask platforms and Android versions that do not use this permission', async () => {
    await expect(requestLocalNetworkAccess('android', 36, permissions)).resolves.toBe(true);
    await expect(requestLocalNetworkAccess('ios', 37, permissions)).resolves.toBe(true);
    expect(permissions.check).not.toHaveBeenCalled();
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it('returns false when the user denies access', async () => {
    permissions.check.mockResolvedValue(false);
    permissions.request.mockResolvedValue('denied');

    await expect(requestLocalNetworkAccess('android', 37, permissions)).resolves.toBe(false);
  });
});
