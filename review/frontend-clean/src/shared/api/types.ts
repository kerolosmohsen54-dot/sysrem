import type { components, paths } from './generated/schema';

export type ApiSchema = paths;
export type MobileSource = components['schemas']['MobileSource'];
export type MobileMessageItem = components['schemas']['MobileMessageItem'];
export type MobileMessageBatchResult =
  components['schemas']['MobileMessageBatchResponse']['data']['results'][number];
export type MobileSyncMessage =
  components['schemas']['MobileSyncResponse']['data']['messages'][number];

export type SessionUser = {
  id: number | string;
  name: string;
  username: string;
  role: string;
  permissions: string[];
};

export type LoginInput = {
  username: string;
  password: string;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};
