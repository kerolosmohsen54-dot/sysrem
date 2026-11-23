export const LOCAL_NETWORK_PERMISSION = 'android.permission.ACCESS_LOCAL_NETWORK';

type LocalNetworkPermissionApi = {
  check: (permission: typeof LOCAL_NETWORK_PERMISSION) => Promise<boolean>;
  request: (permission: typeof LOCAL_NETWORK_PERMISSION) => Promise<string>;
  RESULTS: { GRANTED: string };
};

export async function requestLocalNetworkAccess(
  platform: string,
  apiLevel: number,
  permissions: LocalNetworkPermissionApi,
): Promise<boolean> {
  if (platform !== 'android' || apiLevel < 37) return true;
  if (await permissions.check(LOCAL_NETWORK_PERMISSION)) return true;
  return (await permissions.request(LOCAL_NETWORK_PERMISSION)) === permissions.RESULTS.GRANTED;
}
